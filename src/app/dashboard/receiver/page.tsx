'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ReceiverQueries } from '../../../lib/firebase/role-based-queries';
import { OfflineReceiverQueries, OfflineAnalyticsQueries, OfflineUtils } from '../../../lib/firebase/offline-queries';
import { 
  Truck, 
  Package, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Plus,
  Activity,
  Target,
  Zap,
  Download,
  Filter,
  Search,
  Bell,
  Star,
  Award,
  MapPin,
  Timer,
  Calculator,
  Layers,
  RefreshCw,
  Settings,
  ExternalLink,
  ChevronRight,
  MoreHorizontal,
  Info,
  Bookmark,
  Share2,
  ChevronDown,
  Code,
  FileImage,
  Printer,
  User,
  Phone
} from 'lucide-react';
import OfflineStatus from '../../../components/OfflineStatus';

// Time period selector
type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
type DateSelectionMode = 'preset' | 'custom';

interface AnalyticsData {
  invoices: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    totalAmount: number;
    averageAmount: number;
    monthlyTrend: number[];
    topSuppliers: { name: string; amount: number; count: number }[];
    paymentTrends: { month: string; paid: number; pending: number }[];
  };
  suppliers: {
    total: number;
    active: number;
    newThisMonth: number;
    topPerforming: { id: string; name: string; score: number; orders: number }[];
    geographic: { region: string; count: number }[];
  };
  returnNotes: {
    total: number;
    pending: number;
    completed: number;
    totalValue: number;
    reasonBreakdown: { reason: string; count: number; value: number }[];
    monthlyTrend: number[];
  };
  damages: {
    total: number;
    resolved: number;
    pending: number;
    totalCost: number;
    categoryBreakdown: { category: string; count: number; cost: number }[];
    trends: { month: string; count: number; cost: number }[];
  };
  deliveries: {
    total: number;
    onTime: number;
    late: number;
    upcoming: number;
    performanceScore: number;
    timeDistribution: { hour: number; count: number }[];
  };
  predictions: {
    nextMonthInvoices: number;
    expectedReturns: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
  notifications: {
    urgent: number;
    warnings: number;
    info: number;
    alerts: { type: string; message: string; time: string; priority: 'high' | 'medium' | 'low' }[];
  };
}

export default function ReceiverDashboard() {
  const router = useRouter();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');
  const [dateSelectionMode, setDateSelectionMode] = useState<DateSelectionMode>('preset');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [dayRangeSelector, setDayRangeSelector] = useState({
    enabled: false,
    days: 7,
    endDate: new Date().toISOString().split('T')[0]
  });
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'predictive'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    invoices: { 
      total: 0, pending: 0, approved: 0, paid: 0, totalAmount: 0, averageAmount: 0,
      monthlyTrend: [], topSuppliers: [], paymentTrends: []
    },
    suppliers: { 
      total: 0, active: 0, newThisMonth: 0, topPerforming: [], geographic: []
    },
    returnNotes: { 
      total: 0, pending: 0, completed: 0, totalValue: 0, reasonBreakdown: [], monthlyTrend: []
    },
    damages: { 
      total: 0, resolved: 0, pending: 0, totalCost: 0, categoryBreakdown: [], trends: []
    },
    deliveries: { 
      total: 0, onTime: 0, late: 0, upcoming: 0, performanceScore: 0, timeDistribution: []
    },
    predictions: {
      nextMonthInvoices: 0, expectedReturns: 0, riskLevel: 'low', recommendations: []
    },
    notifications: {
      urgent: 0, warnings: 0, info: 0, alerts: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daily suppliers and restock items state
  const [dailySuppliers, setDailySuppliers] = useState<any[]>([]);
  const [restockItems, setRestockItems] = useState<any[]>([]);
  const [loadingDailyData, setLoadingDailyData] = useState(true);
  const [currentDay, setCurrentDay] = useState<string>(new Date().toDateString());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadAnalyticsData();
  }, [timePeriod, dateSelectionMode, selectedDate, selectedMonth, selectedYear, customDateRange, dayRangeSelector]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Load daily data and set up midnight refresh
  useEffect(() => {
    loadDailyData();
    
    // Set up midnight refresh
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Set timeout for midnight refresh
    const midnightTimeout = setTimeout(() => {
      loadDailyData();
      setCurrentDay(new Date().toDateString());
      
      // Set up daily interval after first midnight
      const dailyInterval = setInterval(() => {
        loadDailyData();
        setCurrentDay(new Date().toDateString());
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimeout);
  }, []);

  // Check for day change every minute
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      const newDay = new Date().toDateString();
      if (newDay !== currentDay) {
        setCurrentDay(newDay);
        loadDailyData();
      }
    }, 60000); // Check every minute

    return () => clearInterval(dayCheckInterval);
  }, [currentDay]);

  const loadDailyData = async () => {
    setLoadingDailyData(true);
    setConnectionError(null);
    
    try {
      // Use offline-aware queries
      const [suppliersResult, restockResult] = await Promise.allSettled([
        OfflineReceiverQueries.getTodaysExpectedSuppliers().catch(error => {
          console.warn('Suppliers query failed:', error);
          if (error.message?.includes('index') || error.code === 'failed-precondition') {
            throw new Error('Database indexes are being created. This may take a few minutes.');
          }
          throw error;
        }),
        OfflineReceiverQueries.getTodaysRestockItems().catch(error => {
          console.warn('Restock query failed:', error);
          if (error.message?.includes('index') || error.code === 'failed-precondition') {
            throw new Error('Database indexes are being created. This may take a few minutes.');
          }
          throw error;
        })
      ]);

      // Handle suppliers result
      if (suppliersResult.status === 'fulfilled') {
        setDailySuppliers(suppliersResult.value || []);
      } else {
        console.error('Failed to load suppliers:', suppliersResult.reason);
        setDailySuppliers([]);
        if (suppliersResult.reason?.message?.includes('index')) {
          setConnectionError('Database is being optimized. Please wait a few minutes and refresh.');
        }
      }

      // Handle restock result
      if (restockResult.status === 'fulfilled') {
        setRestockItems(restockResult.value || []);
      } else {
        console.error('Failed to load restock items:', restockResult.reason);
        setRestockItems([]);
        if (restockResult.reason?.message?.includes('index')) {
          setConnectionError('Database is being optimized. Please wait a few minutes and refresh.');
        }
      }

      // If both failed with index errors, show specific message
      if (suppliersResult.status === 'rejected' && restockResult.status === 'rejected') {
        const bothIndexErrors = [suppliersResult.reason, restockResult.reason]
          .every(error => error?.message?.includes('index') || error?.code === 'failed-precondition');
        
        if (bothIndexErrors) {
          setConnectionError('Database indexes are being created. This process takes 5-10 minutes. Please check back shortly.');
        } else {
          setConnectionError('Unable to load data. Please try again.');
        }
      }

    } catch (error) {
      console.error('Error loading daily data:', error);
      setConnectionError('Failed to load dashboard data. Please try again.');
      setDailySuppliers([]);
      setRestockItems([]);
    } finally {
      setLoadingDailyData(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Use offline-aware analytics queries
      const data = await OfflineAnalyticsQueries.getAnalyticsData(timePeriod);
      setAnalyticsData(data);

        setLoading(false);
      } catch (err) {
      console.error('Error loading analytics data:', err);
      
      // Advanced mock data for comprehensive analytics
      setAnalyticsData({
        invoices: { 
          total: 156, 
          pending: 23, 
          approved: 89, 
          paid: 44, 
          totalAmount: 2847500, 
          averageAmount: 18254,
          monthlyTrend: [120, 134, 145, 156, 178, 165],
          topSuppliers: [
            { name: 'TechCorp Ltd', amount: 450000, count: 12 },
            { name: 'Supply Co', amount: 320000, count: 18 },
            { name: 'Global Parts', amount: 280000, count: 15 }
          ],
          paymentTrends: [
            { month: 'Jan', paid: 850000, pending: 120000 },
            { month: 'Feb', paid: 920000, pending: 180000 },
            { month: 'Mar', paid: 760000, pending: 95000 }
          ]
        },
        suppliers: { 
          total: 47, 
          active: 42, 
          newThisMonth: 3,
          topPerforming: [
            { id: '1', name: 'Reliable Supply', score: 96, orders: 24 },
            { id: '2', name: 'Quick Delivery', score: 94, orders: 31 },
            { id: '3', name: 'Premium Parts', score: 91, orders: 18 }
          ],
          geographic: [
            { region: 'Kampala', count: 18 },
            { region: 'Entebbe', count: 12 },
            { region: 'Jinja', count: 8 },
            { region: 'Mbarara', count: 9 }
          ]
        },
        returnNotes: { 
          total: 28, 
          pending: 8, 
          completed: 20, 
          totalValue: 145000,
          reasonBreakdown: [
            { reason: 'Defective', count: 12, value: 67000 },
            { reason: 'Wrong Item', count: 8, value: 45000 },
            { reason: 'Damaged in Transit', count: 8, value: 33000 }
          ],
          monthlyTrend: [15, 22, 18, 28, 25, 31]
        },
        damages: { 
          total: 12, 
          resolved: 8, 
          pending: 4, 
          totalCost: 89000,
          categoryBreakdown: [
            { category: 'Electronics', count: 5, cost: 45000 },
            { category: 'Furniture', count: 4, cost: 32000 },
            { category: 'Equipment', count: 3, cost: 12000 }
          ],
          trends: [
            { month: 'Jan', count: 8, cost: 34000 },
            { month: 'Feb', count: 12, cost: 56000 },
            { month: 'Mar', count: 6, cost: 23000 }
          ]
        },
        deliveries: { 
          total: 89, 
          onTime: 76, 
          late: 8, 
          upcoming: 5, 
          performanceScore: 85,
          timeDistribution: [
            { hour: 8, count: 12 },
            { hour: 9, count: 18 },
            { hour: 10, count: 15 },
            { hour: 11, count: 14 },
            { hour: 14, count: 16 },
            { hour: 15, count: 14 }
          ]
        },
        predictions: { 
          nextMonthInvoices: 178, 
          expectedReturns: 15, 
          riskLevel: 'medium' as const,
          recommendations: [
            'Consider increasing inventory for high-demand items',
            'Review supplier performance for late deliveries',
            'Optimize delivery scheduling for peak hours'
          ]
        },
        notifications: { 
          urgent: 3, 
          warnings: 7, 
          info: 12,
          alerts: [
            { type: 'urgent', message: 'Critical inventory shortage detected', time: '2 hours ago', priority: 'high' as const },
            { type: 'warning', message: 'Supplier delivery delayed', time: '4 hours ago', priority: 'medium' as const },
            { type: 'info', message: 'Monthly report generated', time: '1 day ago', priority: 'low' as const }
          ]
        },
        _offline: !OfflineUtils.isOnline()
      });
        setLoading(false);
      }
    };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getTimePeriodLabel = () => {
    // Priority 1: Day Range Selector
    const dayRangeLabel = getDayRangeLabel();
    if (dayRangeLabel) {
      return dayRangeLabel;
    }

    if (dateSelectionMode === 'custom') {
      if (timePeriod === 'daily') {
        return new Date(selectedDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } else if (timePeriod === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      } else if (timePeriod === 'yearly') {
        return selectedYear;
      } else {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${daysDiff} days)`;
      }
    }
    
    switch (timePeriod) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
    }
  };

  const getDateRangeForAnalytics = () => {
    // Priority 1: Day Range Selector (if enabled)
    if (dayRangeSelector.enabled) {
      const endDate = new Date(dayRangeSelector.endDate);
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - dayRangeSelector.days + 1);
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        startDate: startDate,
        endDate: endDate
      };
    }

    if (dateSelectionMode === 'custom') {
      if (timePeriod === 'daily') {
        return {
          start: selectedDate,
          end: selectedDate,
          startDate: new Date(selectedDate),
          endDate: new Date(selectedDate + 'T23:59:59')
        };
      } else if (timePeriod === 'monthly') {
        const [year, month] = selectedMonth.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        return { 
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          startDate, 
          endDate 
        };
      } else if (timePeriod === 'yearly') {
        const startDate = new Date(parseInt(selectedYear), 0, 1);
        const endDate = new Date(parseInt(selectedYear), 11, 31);
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          startDate: startDate,
          endDate: endDate
        };
      } else {
        return {
          start: customDateRange.startDate,
          end: customDateRange.endDate,
          startDate: new Date(customDateRange.startDate),
          endDate: new Date(customDateRange.endDate)
        };
      }
    }
    
    // Default preset ranges
    const now = new Date();
    switch (timePeriod) {
      case 'daily':
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return {
          start: dayStart.toISOString().split('T')[0],
          end: dayEnd.toISOString().split('T')[0],
          startDate: dayStart,
          endDate: dayEnd
        };
      case 'weekly':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: weekStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          startDate: weekStart,
          endDate: now
        };
      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: monthStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          startDate: monthStart,
          endDate: now
        };
      case 'yearly':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return {
          start: yearStart.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          startDate: yearStart,
          endDate: now
        };
      default:
        return {
          start: now.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
          startDate: now,
          endDate: now
        };
    }
  };

  // Helper functions for day range calculations
  const calculateDayRange = (days: number, endDate: string) => {
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(end.getDate() - days + 1);
    return {
      start: start.toISOString().split('T')[0],
      end: endDate
    };
  };

  const getDayRangeLabel = () => {
    if (dayRangeSelector.enabled) {
      const range = calculateDayRange(dayRangeSelector.days, dayRangeSelector.endDate);
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      
      if (dayRangeSelector.days === 1) {
        return `Single Day: ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else {
        return `${dayRangeSelector.days} Days: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }
    return null;
  };

  const setQuickDayRange = (days: number, endDate?: string) => {
    const targetEndDate = endDate || new Date().toISOString().split('T')[0];
    setDayRangeSelector({
      enabled: true,
      days: days,
      endDate: targetEndDate
    });
    setDateSelectionMode('custom'); // Switch to custom mode when using day range
  };

  // Helper functions for daily data display
  const getSupplierStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-green-100 text-green-800 border-green-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      case 'early': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚫';
    }
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const getCurrentDayLabel = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const quickActions = [
    {
      title: 'Add Invoice',
      description: 'Create new invoice entry',
      icon: <Plus className="h-5 w-5" />,
      color: 'blue',
      path: '/dashboard/receiver/invoices/add'
    },
    {
      title: 'View Invoices',
      description: 'Manage all invoices',
      icon: <Eye className="h-5 w-5" />,
      color: 'green',
      path: '/dashboard/receiver/invoices'
    },
    {
      title: 'Process Returns',
      description: 'Handle return notes',
      icon: <Package className="h-5 w-5" />,
      color: 'orange',
      path: '/dashboard/receiver/returns'
    },
    {
      title: 'Add Supplier',
      description: 'Register new supplier',
      icon: <Users className="h-5 w-5" />,
      color: 'purple',
      path: '/dashboard/receiver/suppliers/add'
    },
    {
      title: 'Report Damage',
      description: 'Log damage incidents',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red',
      path: '/dashboard/receiver/damages'
    },
    {
      title: 'Scan Barcode',
      description: 'Quick inventory check',
      icon: <Activity className="h-5 w-5" />,
      color: 'indigo',
      path: '/dashboard/receiver/barcode'
    }
  ];

  const getActionButtonColor = (color: string) => {
    const colors = {
      blue: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50',
      green: 'border-green-200 hover:border-green-300 hover:bg-green-50',
      orange: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50',
      purple: 'border-purple-200 hover:border-purple-300 hover:bg-purple-50',
      red: 'border-red-200 hover:border-red-300 hover:bg-red-50',
      indigo: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getActionIconColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Export Functions
  const generateExportData = () => {
    const currentDate = new Date().toISOString().split('T')[0];
    const dateRange = getDateRangeForAnalytics();
    
    return {
      metadata: {
        title: 'Receiver Dashboard Analytics',
        generated: currentDate,
        period: getTimePeriodLabel(),
        dateRange: `${dateRange.start} to ${dateRange.end}`
      },
      summary: {
        totalInvoices: analyticsData.invoices?.total || 0,
        totalAmount: analyticsData.invoices?.totalAmount || 0,
        activeSuppliers: analyticsData.suppliers?.active || 0,
        returnNotes: analyticsData.returnNotes?.total || 0,
        deliveries: analyticsData.deliveries?.total || 0,
        performanceScore: analyticsData.deliveries?.performanceScore || 0
      },
      detailed: {
        invoices: analyticsData.invoices,
        suppliers: analyticsData.suppliers,
        returnNotes: analyticsData.returnNotes,
        damages: analyticsData.damages,
        deliveries: analyticsData.deliveries,
        predictions: analyticsData.predictions
      }
    };
  };

  const exportToCSV = () => {
    const data = generateExportData();
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Invoices', data.summary.totalInvoices],
      ['Total Amount', data.summary.totalAmount],
      ['Active Suppliers', data.summary.activeSuppliers],
      ['Return Notes', data.summary.returnNotes],
      ['Total Deliveries', data.summary.deliveries],
      ['Performance Score', `${data.summary.performanceScore}%`],
      [''],
      ['Generated', data.metadata.generated],
      ['Period', data.metadata.period],
      ['Date Range', data.metadata.dateRange]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiver-dashboard-${data.metadata.generated}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToJSON = () => {
    const data = generateExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiver-dashboard-${data.metadata.generated}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToExcel = () => {
    const data = generateExportData();
    // Create a simple Excel-like structure
    const excelData = [
      ['Receiver Dashboard Analytics Report'],
      ['Generated:', data.metadata.generated],
      ['Period:', data.metadata.period],
      ['Date Range:', data.metadata.dateRange],
      [''],
      ['SUMMARY METRICS'],
      ['Metric', 'Value'],
      ['Total Invoices', data.summary.totalInvoices],
      ['Total Amount ($)', data.summary.totalAmount],
      ['Active Suppliers', data.summary.activeSuppliers],
      ['Return Notes', data.summary.returnNotes],
      ['Total Deliveries', data.summary.deliveries],
      ['Performance Score (%)', data.summary.performanceScore],
      [''],
      ['DETAILED BREAKDOWN'],
      ['Top Suppliers:'],
      ...((data.detailed.suppliers?.topPerforming || []).map((supplier, idx) => 
        [`${idx + 1}. ${supplier.name}`, `Score: ${supplier.score}%`, `Orders: ${supplier.orders}`]
      )),
      [''],
      ['Return Reasons:'],
      ...((data.detailed.returnNotes?.reasonBreakdown || []).map((reason, idx) => 
        [`${idx + 1}. ${reason.reason}`, `Count: ${reason.count}`, `Value: $${reason.value}`]
      ))
    ];

    const csvContent = excelData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiver-dashboard-detailed-${data.metadata.generated}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    const data = generateExportData();
    // Create HTML content for PDF
    const htmlContent = `
      <html>
        <head>
          <title>Receiver Dashboard Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .title { font-size: 24px; font-weight: bold; color: #333; }
            .subtitle { font-size: 16px; color: #666; margin: 5px 0; }
            .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Receiver Dashboard Analytics Report</div>
            <div class="subtitle">Generated: ${data.metadata.generated}</div>
            <div class="subtitle">Period: ${data.metadata.period}</div>
            <div class="subtitle">Date Range: ${data.metadata.dateRange}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Summary Metrics</div>
            <div class="metric"><span>Total Invoices:</span><span>${data.summary.totalInvoices}</span></div>
            <div class="metric"><span>Total Amount:</span><span>$${data.summary.totalAmount.toLocaleString()}</span></div>
            <div class="metric"><span>Active Suppliers:</span><span>${data.summary.activeSuppliers}</span></div>
            <div class="metric"><span>Return Notes:</span><span>${data.summary.returnNotes}</span></div>
            <div class="metric"><span>Total Deliveries:</span><span>${data.summary.deliveries}</span></div>
            <div class="metric"><span>Performance Score:</span><span>${data.summary.performanceScore}%</span></div>
          </div>
          
          <div class="section">
            <div class="section-title">Top Performing Suppliers</div>
            ${(data.detailed.suppliers?.topPerforming || []).map((supplier, idx) => 
              `<div class="metric"><span>${idx + 1}. ${supplier.name}</span><span>Score: ${supplier.score}% | Orders: ${supplier.orders}</span></div>`
            ).join('')}
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receiver-dashboard-report-${data.metadata.generated}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const printReport = () => {
    const data = generateExportData();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receiver Dashboard Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 30px; }
              .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
              .title { font-size: 24px; font-weight: bold; color: #333; }
              .subtitle { font-size: 16px; color: #666; margin: 5px 0; }
              .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">📊 Receiver Dashboard Analytics Report</div>
              <div class="subtitle">Generated: ${data.metadata.generated}</div>
              <div class="subtitle">Period: ${data.metadata.period}</div>
              <div class="subtitle">Date Range: ${data.metadata.dateRange}</div>
            </div>
            
            <div class="section">
              <div class="section-title">📈 Summary Metrics</div>
              <div class="metric"><span>Total Invoices:</span><span>${data.summary.totalInvoices}</span></div>
              <div class="metric"><span>Total Amount:</span><span>$${data.summary.totalAmount.toLocaleString()}</span></div>
              <div class="metric"><span>Active Suppliers:</span><span>${data.summary.activeSuppliers}</span></div>
              <div class="metric"><span>Return Notes:</span><span>${data.summary.returnNotes}</span></div>
              <div class="metric"><span>Total Deliveries:</span><span>${data.summary.deliveries}</span></div>
              <div class="metric"><span>Performance Score:</span><span>${data.summary.performanceScore}%</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">🏆 Top Performing Suppliers</div>
              ${(data.detailed.suppliers?.topPerforming || []).map((supplier, idx) => 
                `<div class="metric"><span>${idx + 1}. ${supplier.name}</span><span>Score: ${supplier.score}% | Orders: ${supplier.orders}</span></div>`
              ).join('')}
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Enhanced Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
      <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
              </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Receiver Command Center</h1>
              <p className="text-gray-600 mt-1">Advanced analytics • Real-time insights • Predictive intelligence</p>
            </div>
          </div>
        </div>
        
        {/* Advanced Controls */}
        <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search analytics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {analyticsData.notifications?.urgent > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {analyticsData.notifications?.urgent}
              </span>
            )}
          </button>
          
          {/* View Mode Selector */}
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            {(['overview', 'detailed', 'predictive'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Date Selection Mode Toggle */}
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setDateSelectionMode('preset')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dateSelectionMode === 'preset'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Preset
            </button>
            <button
              onClick={() => setDateSelectionMode('custom')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dateSelectionMode === 'custom'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex bg-white rounded-lg border border-gray-200 overflow-hidden">
            {(['daily', 'weekly', 'monthly', 'yearly'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  timePeriod === period
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Day Range Quick Access */}
          {dayRangeSelector.enabled && (
            <div className="flex items-center bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-emerald-600 mr-2" />
              <span className="text-xs font-medium text-emerald-800">
                {dayRangeSelector.days} Day{dayRangeSelector.days > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setDayRangeSelector(prev => ({ ...prev, enabled: false }))}
                className="ml-2 text-emerald-600 hover:text-emerald-800 text-xs"
              >
                ×
              </button>
            </div>
          )}

          {/* Advanced Date Picker Button */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Date Picker</span>
          </button>
          
          {/* Enhanced Export Button with Dropdown */}
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center space-x-2 shadow-lg"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>

            {/* Export Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Export Options</h3>
                  <p className="text-xs text-gray-600 mt-1">Choose your preferred format</p>
                </div>
                
                <div className="py-2">
                  {/* CSV Export */}
                  <button
                    onClick={exportToCSV}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
                      <div className="text-sm font-medium text-gray-900">CSV File</div>
                      <div className="text-xs text-gray-500">Spreadsheet compatible format</div>
            </div>
                  </button>

                  {/* Excel Export */}
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Excel (.xlsx)</div>
                      <div className="text-xs text-gray-500">Detailed report with breakdowns</div>
                    </div>
                  </button>

                  {/* JSON Export */}
                  <button
                    onClick={exportToJSON}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Code className="h-5 w-5 text-purple-600" />
              </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">JSON Data</div>
                      <div className="text-xs text-gray-500">Machine-readable format</div>
                    </div>
                  </button>

                  {/* PDF Export */}
                  <button
                    onClick={exportToPDF}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <FileImage className="h-5 w-5 text-red-600" />
            </div>
            <div>
                      <div className="text-sm font-medium text-gray-900">PDF Report</div>
                      <div className="text-xs text-gray-500">Formatted document (HTML)</div>
            </div>
                  </button>

                  {/* Print Option */}
                  <button
                    onClick={printReport}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 border-t border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Printer className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Print Report</div>
                      <div className="text-xs text-gray-500">Open print preview</div>
                    </div>
                  </button>
          </div>

                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <div className="text-xs text-gray-600">
                    📊 Reports include data for: <span className="font-medium">{getTimePeriodLabel()}</span>
              </div>
            </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live Data</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">Performance Score: {analyticsData.deliveries?.performanceScore || 0}%</span>
            </div>
            {/* Offline Status Indicator */}
            <OfflineStatus />
          </div>
          <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-600">
                Risk Level: <span className={`font-medium ${
                  analyticsData.predictions?.riskLevel === 'low' ? 'text-green-600' :
                  analyticsData.predictions?.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>{analyticsData.predictions?.riskLevel?.toUpperCase() || 'LOW'}</span>
              </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Timer className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Offline Mode Banner */}
      {!OfflineUtils.isOnline() && (
        <OfflineStatus showDetails={true} />
      )}

      {/* Firebase Index Error Banner */}
      {connectionError && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800 mb-1">
                Database Optimization in Progress
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                {connectionError}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={loadDailyData}
                  className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Try Again</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/equitysys-41320/firestore/indexes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 hover:text-orange-700 underline"
                >
                  View Firebase Console
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Metrics Dashboard */}
            <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {viewMode === 'overview' ? 'Key Metrics Overview' : 
             viewMode === 'detailed' ? 'Detailed Analytics' : 'Predictive Insights'} - {getTimePeriodLabel()}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>Click any metric for detailed breakdown</span>
            </div>
          </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Advanced Invoice Metrics */}
          <div className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm text-green-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12.5%
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                </button>
            </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Total Invoices</p>
                <Star className="h-4 w-4 text-yellow-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.invoices?.total || 0}</p>
              <div className="space-y-1">
                <p className="text-sm text-gray-600 font-medium">
                  {formatCurrency(analyticsData.invoices?.totalAmount || 0)}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                                      <span>Avg: {formatCurrency(analyticsData.invoices?.averageAmount || 0)}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          {analyticsData.invoices?.pending || 0} pending
                  </span>
                </div>
              </div>
              {/* Mini chart representation */}
              <div className="flex items-end space-x-1 h-8">
                {analyticsData.invoices?.monthlyTrend?.map((value, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-200 rounded-t-sm flex-1"
                    style={{ height: `${(value / Math.max(...(analyticsData.invoices?.monthlyTrend || [1]))) * 100}%` }}
                  />
                )) || []}
              </div>
            </div>
          </div>

          {/* Advanced Suppliers Metrics */}
          <div className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-2xl hover:border-green-300 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm text-green-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +6.8%
                </span>
                <Award className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Active Suppliers</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.suppliers?.active || 0}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">New this month</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                    +{analyticsData.suppliers?.newThisMonth || 0}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Top Performer</div>
                  <div className="text-sm font-medium text-gray-900">
                    {analyticsData.suppliers?.topPerforming?.[0]?.name}
                  </div>
                  <div className="text-xs text-green-600 font-medium">
                    Score: {analyticsData.suppliers?.topPerforming?.[0]?.score}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Returns Metrics */}
          <div className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-2xl hover:border-orange-300 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm text-red-600 font-medium">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  -3.2%
                </span>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Return Notes</p>
              <p className="text-3xl font-bold text-gray-900">{analyticsData.returnNotes?.total || 0}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 font-medium">
                  {formatCurrency(analyticsData.returnNotes?.totalValue || 0)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-orange-50 p-2 rounded">
                    <div className="text-orange-600 font-medium">{analyticsData.returnNotes?.pending || 0}</div>
                    <div className="text-gray-500">Pending</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-600 font-medium">{analyticsData.returnNotes?.completed || 0}</div>
                    <div className="text-gray-500">Resolved</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Top reason: {analyticsData.returnNotes?.reasonBreakdown?.[0]?.reason}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Deliveries Metrics */}
          <div className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-2xl hover:border-purple-300 transition-all duration-300 cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center text-sm text-green-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +8.9%
                </span>
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Deliveries</p>
                <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                  {analyticsData.deliveries.performanceScore}% score
                </div>
              </div>
                              <p className="text-3xl font-bold text-gray-900">{analyticsData.deliveries?.total || 0}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">On Time</span>
                  <span className="font-medium">{analyticsData.deliveries.onTime}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(analyticsData.deliveries.onTime / analyticsData.deliveries.total) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-red-600">{analyticsData.deliveries.late}</div>
                    <div className="text-gray-500">Late</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-blue-600">{analyticsData.deliveries.upcoming}</div>
                    <div className="text-gray-500">Upcoming</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Date Picker Panel */}
        {showDatePicker && (
          <div className="fixed top-20 right-6 w-96 bg-white rounded-xl border border-gray-200 shadow-2xl z-50">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                  Advanced Date Selection
                </h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Date Selection Mode Info */}
                <div className={`p-3 rounded-lg border-l-4 ${
                  dateSelectionMode === 'custom' 
                    ? 'bg-purple-50 border-purple-500' 
                    : 'bg-gray-50 border-gray-400'
                }`}>
                  <p className="text-sm font-medium text-gray-900">
                    Mode: {dateSelectionMode === 'custom' ? 'Custom Date Selection' : 'Preset Periods'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {dateSelectionMode === 'custom' 
                      ? 'Select specific dates, months, or years' 
                      : 'Using current/recent time periods'}
                  </p>
                </div>

                {/* Custom Date Controls - Only show when custom mode is selected */}
                {dateSelectionMode === 'custom' && (
                  <div className="space-y-6">
                    {/* Universal Custom Date Range - Available for ALL time periods */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center mb-3">
                        <Calendar className="h-4 w-4 text-purple-600 mr-2" />
                        <label className="block text-sm font-semibold text-purple-900">
                          Custom Date Range (Any Period)
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
            <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={customDateRange.startDate}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          />
            </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                          <input
                            type="date"
                            value={customDateRange.endDate}
                            onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Selected Range:</span>
                          <span className="font-medium text-purple-900">
                            {new Date(customDateRange.startDate).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric' 
                            })} - {new Date(customDateRange.endDate).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>Duration:</span>
                          <span>{Math.ceil((new Date(customDateRange.endDate).getTime() - new Date(customDateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days</span>
          </div>
        </div>
      </div>

                    {/* Smart Day Range Selector - NEW FEATURE */}
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-emerald-600 mr-2" />
                          <label className="block text-sm font-semibold text-emerald-900">
                            Smart Day Range Selector
                          </label>
                        </div>
                        <button
                          onClick={() => setDayRangeSelector(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            dayRangeSelector.enabled 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {dayRangeSelector.enabled ? 'Enabled' : 'Enable'}
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Day Range Controls */}
                        <div className="grid grid-cols-2 gap-4">
      <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Number of Days</label>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={dayRangeSelector.days}
                              onChange={(e) => setDayRangeSelector(prev => ({ 
                                ...prev, 
                                days: Math.max(1, Math.min(365, parseInt(e.target.value) || 1))
                              }))}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                              disabled={!dayRangeSelector.enabled}
                            />
              </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">End Date</label>
                            <input
                              type="date"
                              value={dayRangeSelector.endDate}
                              onChange={(e) => setDayRangeSelector(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                              disabled={!dayRangeSelector.enabled}
                            />
              </div>
            </div>

                        {/* Quick Day Range Buttons */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">Quick Day Ranges</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 7, 14, 30, 60, 90, 180].map(days => (
                              <button
                                key={days}
                                onClick={() => setQuickDayRange(days)}
                                disabled={!dayRangeSelector.enabled}
                                className={`p-2 text-xs rounded-lg transition-colors border ${
                                  dayRangeSelector.enabled 
                                    ? dayRangeSelector.days === days
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200'
                                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                }`}
                              >
                                {days === 1 ? '1 Day' : `${days} Days`}
          </button>
                            ))}
                          </div>
                        </div>

                        {/* Show calculated range when enabled */}
                        {dayRangeSelector.enabled && (
                          <div className="p-3 bg-white rounded-lg border border-emerald-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Calculated Range:</span>
                              <span className="font-medium text-emerald-900">
                                {(() => {
                                  const range = calculateDayRange(dayRangeSelector.days, dayRangeSelector.endDate);
                                  return `${new Date(range.start).toLocaleDateString('en-US', { 
                                    month: 'short', day: 'numeric', year: 'numeric' 
                                  })} - ${new Date(range.end).toLocaleDateString('en-US', { 
                                    month: 'short', day: 'numeric', year: 'numeric' 
                                  })}`;
                                })()}
                              </span>
              </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                              <span>Viewing:</span>
                              <span>{dayRangeSelector.days} consecutive days ending on {new Date(dayRangeSelector.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
                        )}

                        {!dayRangeSelector.enabled && (
                          <div className="text-xs text-gray-500 text-center py-2">
                            💡 Enable to select any number of consecutive days from any end date
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Date Range Presets */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Quick Range Presets for 2024
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-05-01',
                            endDate: '2024-05-19'
                          })}
                          className="p-2 text-xs bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-lg hover:from-green-100 hover:to-green-200 transition-colors border border-green-200"
                        >
                          May 1-19, 2024
          </button>
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-01-01',
                            endDate: '2024-01-31'
                          })}
                          className="p-2 text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors border border-blue-200"
                        >
                          January 2024
                        </button>
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-12-01',
                            endDate: '2024-12-31'
                          })}
                          className="p-2 text-xs bg-gradient-to-r from-red-50 to-red-100 text-red-800 rounded-lg hover:from-red-100 hover:to-red-200 transition-colors border border-red-200"
                        >
                          December 2024
                        </button>
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-07-01',
                            endDate: '2024-09-30'
                          })}
                          className="p-2 text-xs bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-colors border border-purple-200"
                        >
                          Q3 2024
                        </button>
                      </div>
                      
                      {/* More Quick Presets */}
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-06-15',
                            endDate: '2024-06-30'
                          })}
                          className="p-2 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                        >
                          Mid-June 2024
                        </button>
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-03-01',
                            endDate: '2024-03-15'
                          })}
                          className="p-2 text-xs bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
                        >
                          Early March 2024
                        </button>
                        <button
                          onClick={() => setCustomDateRange({
                            startDate: '2024-08-20',
                            endDate: '2024-09-05'
                          })}
                          className="p-2 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                        >
                          Late Aug 2024
                        </button>
              </div>
              </div>

                    {/* Alternative Quick Selections based on Time Period */}
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Alternative {timePeriod} selections
                      </label>
                      
                      {/* Daily alternatives */}
                      {timePeriod === 'daily' && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              setCustomDateRange({
                                startDate: e.target.value,
                                endDate: e.target.value
                              });
                            }}
                            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <div className="text-xs text-gray-500 flex items-center">
                            Single day selection
            </div>
                        </div>
                      )}

                      {/* Monthly alternatives */}
                      {timePeriod === 'monthly' && (
                        <div className="space-y-2">
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => {
                              setSelectedMonth(e.target.value);
                              const [year, month] = e.target.value.split('-');
                              const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
                              const lastDay = new Date(parseInt(year), parseInt(month), 0);
                              setCustomDateRange({
                                startDate: firstDay.toISOString().split('T')[0],
                                endDate: lastDay.toISOString().split('T')[0]
                              });
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          />
                          <p className="text-xs text-gray-500">
                            Will set range to full month
                          </p>
                        </div>
                      )}

                      {/* Yearly alternatives */}
                      {timePeriod === 'yearly' && (
                        <div className="space-y-2">
                          <select
                            value={selectedYear}
                            onChange={(e) => {
                              setSelectedYear(e.target.value);
                              setCustomDateRange({
                                startDate: `${e.target.value}-01-01`,
                                endDate: `${e.target.value}-12-31`
                              });
                            }}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500">
                            Will set range to full year
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Quick Selections</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setDateSelectionMode('custom');
                        setTimePeriod('daily');
                        setSelectedDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="p-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setDateSelectionMode('custom');
                        setTimePeriod('daily');
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        setSelectedDate(yesterday.toISOString().split('T')[0]);
                      }}
                      className="p-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Yesterday
                    </button>
                    <button
                      onClick={() => {
                        setDateSelectionMode('custom');
                        setTimePeriod('monthly');
                        setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
                      }}
                      className="p-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => {
                        setDateSelectionMode('custom');
                        setTimePeriod('monthly');
                        const lastMonth = new Date();
                        lastMonth.setMonth(lastMonth.getMonth() - 1);
                        setSelectedMonth(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);
                      }}
                      className="p-2 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      Last Month
          </button>
        </div>
      </div>

                {/* Apply Button */}
                <button
                  onClick={() => {
                    setShowDatePicker(false);
                    setLastUpdated(new Date());
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-medium"
                >
                  Apply Date Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Panel */}
        {showNotifications && (
          <div className="fixed top-20 right-6 w-96 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-sm">
                <span className="text-red-600 font-medium">{analyticsData.notifications?.urgent || 0} Urgent</span>
                <span className="text-yellow-600 font-medium">{analyticsData.notifications?.warnings || 0} Warnings</span>
                <span className="text-blue-600 font-medium">{analyticsData.notifications?.info || 0} Info</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {analyticsData.notifications?.alerts?.map((alert, idx) => (
                <div key={idx} className={`p-4 hover:bg-gray-50 ${
                  alert?.priority === 'high' ? 'border-l-4 border-red-500' :
                  alert?.priority === 'medium' ? 'border-l-4 border-yellow-500' :
                  'border-l-4 border-blue-500'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      alert?.type === 'urgent' ? 'bg-red-100 text-red-600' :
                      alert?.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {alert?.type === 'urgent' ? <AlertCircle className="h-4 w-4" /> :
                       alert?.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                       <Info className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert?.message || ''}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert?.time || ''}</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )) || []}
            </div>
          </div>
        )}

        {/* Predictive Analytics Section */}
        {viewMode === 'predictive' && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
      <div>
                <h3 className="text-xl font-bold">AI-Powered Predictions</h3>
                <p className="text-indigo-100">Based on historical data and current trends</p>
                        </div>
                      </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium">Next Month</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.predictions?.nextMonthInvoices || 0}</div>
                <div className="text-sm text-indigo-100">Expected Invoices</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5" />
                  <span className="font-medium">Return Forecast</span>
                </div>
                <div className="text-2xl font-bold">{analyticsData.predictions?.expectedReturns || 0}</div>
                <div className="text-sm text-indigo-100">Projected Returns</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Risk Assessment</span>
                </div>
                <div className={`text-2xl font-bold ${
                  analyticsData.predictions?.riskLevel === 'low' ? 'text-green-300' :
                  analyticsData.predictions?.riskLevel === 'medium' ? 'text-yellow-300' : 'text-red-300'
                }`}>
                  {analyticsData.predictions?.riskLevel?.toUpperCase() || 'LOW'}
                </div>
                <div className="text-sm text-indigo-100">Current Risk Level</div>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="font-semibold mb-3">AI Recommendations</h4>
              <div className="space-y-2">
                {analyticsData.predictions?.recommendations?.map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2"></div>
                    <span className="text-indigo-100">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offline Status Banner */}
      {!OfflineUtils.isOnline() && (
        <div className="mb-6">
          <OfflineStatus showDetails={true} />
        </div>
      )}

      {/* Firebase Index Error Banner */}
      {connectionError && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800 mb-1">
                Database Optimization in Progress
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                {connectionError}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={loadDailyData}
                  className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Try Again</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/equitysys-41320/firestore/indexes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 hover:text-orange-700 underline"
                >
                  View Firebase Console
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Suppliers & Restock Items - Prominent in Main Content */}
      <div className="space-y-8 mb-8">
        {/* Today's Expected Suppliers - Full Width */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Truck className="h-6 w-6 text-blue-600 mr-3" />
                  Today's Expected Suppliers
                </h3>
                <p className="text-sm text-gray-500 mt-1">{getCurrentDayLabel()}</p>
              </div>
              <div className="flex items-center space-x-3">
                {loadingDailyData && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                {connectionError && (
                  <div className="flex items-center text-orange-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    <span>Database Optimizing</span>
                  </div>
                )}
                {!connectionError && !loadingDailyData && (
                  <div className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>Live Updates</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action buttons in content section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push('/dashboard/receiver/deliveries')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View All Deliveries</span>
                </button>
                <button
                  onClick={loadDailyData}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {dailySuppliers.length} supplier{dailySuppliers.length !== 1 ? 's' : ''} expected today
              </div>
            </div>
          </div>

          {dailySuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Suppliers Expected Today</h4>
              <p className="text-gray-500">Check back tomorrow for new deliveries</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dailySuppliers.map((supplier) => (
                <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{supplier.name}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSupplierStatusColor(supplier.status)}`}>
                          {supplier.status.replace('-', ' ').toUpperCase()}
                      </span>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(supplier.priority)}`}>
                          {getPriorityIcon(supplier.priority)} {supplier.priority.toUpperCase()}
                      </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatTime(supplier.expectedTime)}
                          </span>
                          <span className="flex items-center">
                            <Package className="h-4 w-4 mr-1" />
                            {supplier.items} items
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {supplier.contactPerson}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {supplier.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Items */}
                  {supplier.deliveryItems && supplier.deliveryItems.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Expected Items:</h5>
                      <div className="grid grid-cols-1 gap-2">
                        {supplier.deliveryItems.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-2">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-600">×{item.quantity}</span>
                          </div>
                        ))}
                        {supplier.deliveryItems.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{supplier.deliveryItems.length - 3} more items
          </div>
                        )}
        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>

        {/* Items Needing Restock - Full Width */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
      <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
                Items Needing Restock
              </h3>
              <p className="text-sm text-gray-500 mt-1">Low inventory alerts</p>
            </div>
            <div className="flex items-center space-x-3">
              {loadingDailyData && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              )}
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                {restockItems.filter(item => item.priority === 'urgent').length} Urgent
              </span>
              <span className="text-sm text-gray-500">
                {restockItems.length} total items
              </span>
            </div>
          </div>

          {restockItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">All Items Well Stocked</h4>
              <p className="text-gray-500">No restocking needed at this time</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {restockItems.slice(0, 8).map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{item.itemName}</h4>
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                          {getPriorityIcon(item.priority)} {item.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Current:</span>
                          <span className={`font-medium ${item.currentStock <= item.restockThreshold * 0.3 ? 'text-red-600' : 
                            item.currentStock <= item.restockThreshold * 0.6 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {item.currentStock}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium text-gray-900">{item.restockThreshold}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Suggested:</span>
                          <span className="font-medium text-blue-600">{item.suggestedQuantity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stock Level Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Stock Level</span>
                      <span>{Math.round((item.currentStock / item.restockThreshold) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.currentStock <= item.restockThreshold * 0.3 ? 'bg-red-500' :
                          item.currentStock <= item.restockThreshold * 0.6 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min((item.currentStock / item.restockThreshold) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Supplier Info */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-600">
                      <div className="font-medium text-gray-900">{item.supplier}</div>
                      <div className="text-gray-500">{item.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {restockItems.length > 8 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Showing 8 of {restockItems.length} items needing restock
              </p>
              <button
                onClick={() => router.push('/dashboard/receiver/deliveries')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                View All Restock Items
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Invoice Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Status</h3>
            <button 
              onClick={() => router.push('/dashboard/receiver/invoices')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View All <ArrowUpRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-gray-900 font-medium">Pending</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{analyticsData.invoices.pending}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatPercentage(analyticsData.invoices.pending, analyticsData.invoices.total)})
                      </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <span className="text-gray-900 font-medium">Approved</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{analyticsData.invoices.approved}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatPercentage(analyticsData.invoices.approved, analyticsData.invoices.total)})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-gray-900 font-medium">Paid</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900">{analyticsData.invoices.paid}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({formatPercentage(analyticsData.invoices.paid, analyticsData.invoices.total)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-6">
                      <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Delivery Success Rate</span>
                <span className="text-sm font-bold text-green-600">
                  {formatPercentage(analyticsData.deliveries.onTime, analyticsData.deliveries.total)}
                </span>
                        </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${(analyticsData.deliveries.onTime / analyticsData.deliveries.total) * 100}%` 
                  }}
                ></div>
                      </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Invoice Approval Rate</span>
                <span className="text-sm font-bold text-blue-600">
                  {formatPercentage(analyticsData.invoices.approved + analyticsData.invoices.paid, analyticsData.invoices.total)}
                      </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: `${((analyticsData.invoices.approved + analyticsData.invoices.paid) / analyticsData.invoices.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Return Resolution Rate</span>
                <span className="text-sm font-bold text-purple-600">
                  {formatPercentage(analyticsData.returnNotes.completed, analyticsData.returnNotes.total)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${(analyticsData.returnNotes.completed / analyticsData.returnNotes.total) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => router.push(action.path)}
              className={`p-6 bg-white rounded-xl border transition-all hover:shadow-md ${getActionButtonColor(action.color)}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${getActionIconColor(action.color)}`}>
                  {action.icon}
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          ))}
          </div>
        </div>

      {/* Financial Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Total Invoice Value</h3>
            <p className="text-3xl font-bold">{formatCurrency(analyticsData.invoices.totalAmount)}</p>
            <p className="text-blue-200 text-sm mt-1">
              Avg: {formatCurrency(analyticsData.invoices.averageAmount)} per invoice
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Return Value</h3>
            <p className="text-3xl font-bold">{formatCurrency(analyticsData.returnNotes.totalValue)}</p>
            <p className="text-blue-200 text-sm mt-1">
              {formatPercentage(analyticsData.returnNotes.totalValue, analyticsData.invoices.totalAmount)} of total invoices
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Damage Costs</h3>
            <p className="text-3xl font-bold">{formatCurrency(analyticsData.damages.totalCost)}</p>
            <p className="text-blue-200 text-sm mt-1">
              {analyticsData.damages.pending} pending resolution
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 