'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Clock, 
  CheckCircle,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Download,
  Search,
  Bell,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Truck,
  AlertCircle,
  Settings,
  Filter,
  ChevronDown,
  Eye,
  PlusCircle,
  RefreshCw,
  Zap,
  Target,
  Activity,
  Layers,
  PieChart,
  HelpCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { InterfaceDatabaseConnector } from '../../../lib/firebase/interface-database-connector';
import HydrationSafeLoader from '../../../components/ui/HydrationSafeLoader';

// Types
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
  _offline?: boolean;
}

// Real data interfaces
interface Delivery {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  status: 'pending' | 'delivered' | 'cancelled';
  items: any[];
  notes?: string;
}

interface ReturnNote {
  id: string;
  invoiceId: string;
  deliveryId: string;
  supplierName: string;
  returnReason: string;
  items: any[];
  totalValue: number;
  status: 'pending' | 'completed' | 'approved';
  createdAt: Date;
}

interface DamageReport {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  damageType: string;
  estimatedCost: number;
  status: 'pending' | 'resolved' | 'investigating';
  reportedAt: Date;
}

interface RestockItem {
  id: string;
  itemName: string;
  currentStock: number;
  minimumStock: number;
  recommendedRestock: number;
  supplierId: string;
  supplierName: string;
  priority: 'high' | 'medium' | 'low';
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

  // Real data states
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([]);
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  
  const [currentDay, setCurrentDay] = useState<string>(new Date().toDateString());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const subscriptions: (() => void)[] = [];

    try {
      // Subscribe to real-time data using InterfaceDatabaseConnector
      const unsubscribeDeliveries = InterfaceDatabaseConnector.subscribeToDeliveriesData(
        (data) => {
          console.log('Deliveries data received:', data);
          setDeliveries(data);
          updateAnalyticsFromDeliveries(data);
        },
        (error) => console.error('Deliveries subscription error:', error)
      );
      subscriptions.push(unsubscribeDeliveries);

      const unsubscribeReturnNotes = InterfaceDatabaseConnector.subscribeToReturnNotesData(
        (data) => {
          console.log('Return Notes data received:', data);
          setReturnNotes(data);
          updateAnalyticsFromReturnNotes(data);
        },
        (error) => console.error('Return Notes subscription error:', error)
      );
      subscriptions.push(unsubscribeReturnNotes);

      const unsubscribeDamages = InterfaceDatabaseConnector.subscribeToDamagesData(
        (data) => {
          console.log('Damages data received:', data);
          setDamages(data);
          updateAnalyticsFromDamages(data);
        },
        (error) => console.error('Damages subscription error:', error)
      );
      subscriptions.push(unsubscribeDamages);

      const unsubscribeRestockItems = InterfaceDatabaseConnector.subscribeToRestockItemsData(
        (data) => {
          console.log('Restock Items data received:', data);
          setRestockItems(data);
        },
        (error) => console.error('Restock Items subscription error:', error)
      );
      subscriptions.push(unsubscribeRestockItems);

      const unsubscribeInvoices = InterfaceDatabaseConnector.subscribeToInvoicesData(
        (data) => {
          console.log('Invoices data received:', data);
          setInvoices(data);
          updateAnalyticsFromInvoices(data);
        },
        (error) => console.error('Invoices subscription error:', error)
      );
      subscriptions.push(unsubscribeInvoices);

      setLoading(false);

    } catch (error) {
      console.error('Failed to initialize receiver data:', error);
      setError('Failed to connect to database. Please refresh the page.');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Update analytics based on real data
  const updateAnalyticsFromDeliveries = (deliveryData: Delivery[]) => {
    const onTime = deliveryData.filter(d => d.status === 'delivered' && d.actualDeliveryDate && d.expectedDeliveryDate && 
      new Date(d.actualDeliveryDate) <= new Date(d.expectedDeliveryDate)).length;
    const late = deliveryData.filter(d => d.status === 'delivered' && d.actualDeliveryDate && d.expectedDeliveryDate && 
      new Date(d.actualDeliveryDate) > new Date(d.expectedDeliveryDate)).length;
    const upcoming = deliveryData.filter(d => d.status === 'pending').length;
    const performanceScore = deliveryData.length > 0 ? Math.round((onTime / deliveryData.length) * 100) : 0;

    setAnalyticsData(prev => ({
      ...prev,
      deliveries: {
        total: deliveryData.length,
        onTime,
        late,
        upcoming,
        performanceScore,
        timeDistribution: prev.deliveries.timeDistribution // Keep existing for now
      }
    }));
  };

  const updateAnalyticsFromReturnNotes = (returnData: ReturnNote[]) => {
    const pending = returnData.filter(r => r.status === 'pending' || r.status === 'Pending').length;
    const completed = returnData.filter(r => r.status === 'completed' || r.status === 'Completed' || r.status === 'processed').length;
    const totalValue = returnData.reduce((sum, r) => sum + (r.totalValue || 0), 0);

    // Calculate reason breakdown
    const reasonCounts: { [key: string]: { reason: string; count: number; value: number } } = {};
    returnData.forEach(r => {
      const reason = r.returnReason || 'Unknown';
      if (!reasonCounts[reason]) {
        reasonCounts[reason] = { reason, count: 0, value: 0 };
      }
      reasonCounts[reason].count++;
      reasonCounts[reason].value += r.totalValue || 0;
    });
    const reasonBreakdown = Object.values(reasonCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalyticsData(prev => ({
      ...prev,
      returnNotes: {
        total: returnData.length,
        pending,
        completed,
        totalValue,
        reasonBreakdown,
        monthlyTrend: prev.returnNotes.monthlyTrend // Keep existing for now
      }
    }));
  };

  const updateAnalyticsFromDamages = (damageData: DamageReport[]) => {
    const resolved = damageData.filter(d => d.status === 'resolved' || d.status === 'Resolved').length;
    const pending = damageData.filter(d => d.status === 'pending' || d.status === 'Pending' || d.status === 'reported').length;
    const totalCost = damageData.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

    // Calculate category breakdown
    const categoryCounts: { [key: string]: { category: string; count: number; cost: number } } = {};
    damageData.forEach(d => {
      const category = d.category || 'Unknown';
      if (!categoryCounts[category]) {
        categoryCounts[category] = { category, count: 0, cost: 0 };
      }
      categoryCounts[category].count++;
      categoryCounts[category].cost += d.estimatedCost || 0;
    });
    const categoryBreakdown = Object.values(categoryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalyticsData(prev => ({
      ...prev,
      damages: {
        total: damageData.length,
        resolved,
        pending,
        totalCost,
        categoryBreakdown,
        trends: prev.damages.trends // Keep existing for now
      }
    }));
  };

  const updateAnalyticsFromInvoices = (invoiceData: any[]) => {
    const pending = invoiceData.filter(i => i.status === 'Pending' || i.status === 'pending').length;
    const approved = invoiceData.filter(i => i.status === 'Approved' || i.status === 'approved').length;
    const paid = invoiceData.filter(i => i.status === 'Paid' || i.status === 'paid').length;
    const totalAmount = invoiceData.reduce((sum, i) => sum + (i.amount || 0), 0);
    const averageAmount = invoiceData.length > 0 ? totalAmount / invoiceData.length : 0;

    // Calculate top suppliers by invoice count
    const supplierCounts: { [key: string]: { name: string; count: number; amount: number } } = {};
    invoiceData.forEach(inv => {
      const supplierName = inv.supplierName || 'Unknown';
      if (!supplierCounts[supplierName]) {
        supplierCounts[supplierName] = { name: supplierName, count: 0, amount: 0 };
      }
      supplierCounts[supplierName].count++;
      supplierCounts[supplierName].amount += inv.amount || 0;
    });
    const topSuppliers = Object.values(supplierCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({ name: s.name, amount: s.amount, count: s.count }));

    setAnalyticsData(prev => ({
      ...prev,
        invoices: { 
        total: invoiceData.length,
        pending,
        approved,
        paid,
        totalAmount,
        averageAmount,
        monthlyTrend: prev.invoices.monthlyTrend, // Keep existing for now
        topSuppliers,
        paymentTrends: prev.invoices.paymentTrends // Keep existing for now
      }
    }));
    };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <HydrationSafeLoader />
        <div className="ml-4 text-lg text-gray-600">Loading receiver dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Receiver Dashboard
                </h1>
                <p className="text-purple-100 text-base">Real-time data from Firestore • Track deliveries, returns, and inventory</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => InterfaceDatabaseConnector.getDashboardAnalytics().then(console.log)}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh Data
              </button>
              <button className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <Download className="w-5 h-5" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{analyticsData.deliveries.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{analyticsData.deliveries.onTime} on time • {analyticsData.deliveries.late} late</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Truck className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Return Notes</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{analyticsData.returnNotes.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{formatCurrency(analyticsData.returnNotes.totalValue)} value</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Damages</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">{analyticsData.damages.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{formatCurrency(analyticsData.damages.totalCost)} cost</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Restock Items</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{restockItems.length}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{restockItems.filter(r => r.priority === 'high').length} high priority</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Invoices</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{analyticsData.invoices.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{formatCurrency(analyticsData.invoices.totalAmount)} total</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Delivery Performance</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{analyticsData.deliveries.performanceScore}%</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">{analyticsData.deliveries.onTime}/{analyticsData.deliveries.total} on time</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending Actions</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">
                  {analyticsData.returnNotes.pending + analyticsData.damages.pending + analyticsData.invoices.pending}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Requires attention</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Upcoming Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{analyticsData.deliveries.upcoming}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Scheduled this week</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive Analytics Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Delivery Performance Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Delivery Performance
                </h3>
                <p className="text-sm text-gray-500 mt-1">On-time vs Late deliveries</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'On Time', value: analyticsData.deliveries.onTime, color: '#10b981' },
                  { name: 'Late', value: analyticsData.deliveries.late, color: '#ef4444' },
                  { name: 'Pending', value: analyticsData.deliveries.upcoming, color: '#f59e0b' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]}>
                    {[
                      { name: 'On Time', value: analyticsData.deliveries.onTime },
                      { name: 'Late', value: analyticsData.deliveries.late },
                      { name: 'Pending', value: analyticsData.deliveries.upcoming }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'On Time' ? '#10b981' : entry.name === 'Late' ? '#ef4444' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{analyticsData.deliveries.onTime}</p>
                <p className="text-xs text-gray-500">On Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{analyticsData.deliveries.late}</p>
                <p className="text-xs text-gray-500">Late</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{analyticsData.deliveries.upcoming}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Invoice Status
                </h3>
                <p className="text-sm text-gray-500 mt-1">Current invoice distribution</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Tooltip />
                  <Pie
                    data={[
                      { name: 'Pending', value: analyticsData.invoices.pending, color: '#f59e0b' },
                      { name: 'Approved', value: analyticsData.invoices.approved, color: '#10b981' },
                      { name: 'Paid', value: analyticsData.invoices.paid, color: '#3b82f6' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Pending', value: analyticsData.invoices.pending, color: '#f59e0b' },
                      { name: 'Approved', value: analyticsData.invoices.approved, color: '#10b981' },
                      { name: 'Paid', value: analyticsData.invoices.paid, color: '#3b82f6' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analyticsData.invoices.pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700">Approved</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analyticsData.invoices.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">Paid</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{analyticsData.invoices.paid}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Operational Metrics */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Financial Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              Financial Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Invoice Value</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(analyticsData.invoices.totalAmount)}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Damage Cost</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(analyticsData.damages.totalCost)}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Return Value</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(analyticsData.returnNotes.totalValue)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Average Invoice</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(analyticsData.invoices.averageAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Efficiency */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-purple-600" />
              Operational Efficiency
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Delivery On-Time Rate</span>
                  <span className="text-sm font-semibold text-gray-900">{analyticsData.deliveries.performanceScore}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${analyticsData.deliveries.performanceScore}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Return Resolution Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {analyticsData.returnNotes.total > 0 
                      ? formatPercentage(analyticsData.returnNotes.completed, analyticsData.returnNotes.total)
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: analyticsData.returnNotes.total > 0 
                        ? `${(analyticsData.returnNotes.completed / analyticsData.returnNotes.total) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Damage Resolution Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {analyticsData.damages.total > 0 
                      ? formatPercentage(analyticsData.damages.resolved, analyticsData.damages.total)
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: analyticsData.damages.total > 0 
                        ? `${(analyticsData.damages.resolved / analyticsData.damages.total) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Overall Efficiency</p>
                  <p className="text-lg font-bold text-purple-600">
                    {Math.round(
                      (analyticsData.deliveries.performanceScore + 
                       (analyticsData.returnNotes.total > 0 ? (analyticsData.returnNotes.completed / analyticsData.returnNotes.total) * 100 : 0) +
                       (analyticsData.damages.total > 0 ? (analyticsData.damages.resolved / analyticsData.damages.total) * 100 : 0)) / 3
                    )}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-600" />
              Activity Summary
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Deliveries</p>
                    <p className="text-xs text-gray-500">Processed this period</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-purple-600">{analyticsData.deliveries.total}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Return Notes</p>
                    <p className="text-xs text-gray-500">{analyticsData.returnNotes.completed} completed</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">{analyticsData.returnNotes.total}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Damage Reports</p>
                    <p className="text-xs text-gray-500">{analyticsData.damages.resolved} resolved</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">{analyticsData.damages.total}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Invoices</p>
                    <p className="text-xs text-gray-500">{analyticsData.invoices.approved} approved</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-600">{analyticsData.invoices.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trends & Insights */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Performance Trends & Insights
              </h3>
              <p className="text-sm text-gray-500 mt-1">Key metrics and recommendations</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-gray-900">On-Time Delivery</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{analyticsData.deliveries.onTime}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.deliveries.total > 0 
                  ? formatPercentage(analyticsData.deliveries.onTime, analyticsData.deliveries.total)
                  : '0%'} of total deliveries
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-gray-900">Completed Returns</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{analyticsData.returnNotes.completed}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.returnNotes.total > 0 
                  ? formatPercentage(analyticsData.returnNotes.completed, analyticsData.returnNotes.total)
                  : '0%'} resolution rate
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-medium text-gray-900">Pending Issues</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {analyticsData.returnNotes.pending + analyticsData.damages.pending}
              </p>
              <p className="text-xs text-gray-500 mt-1">Requires immediate attention</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-900">Invoice Processing</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.invoices.approved}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analyticsData.invoices.total > 0 
                  ? formatPercentage(analyticsData.invoices.approved, analyticsData.invoices.total)
                  : '0%'} approval rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 