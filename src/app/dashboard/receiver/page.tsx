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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell } from 'recharts';
import { InterfaceDatabaseConnector } from '../../../lib/firebase/interface-database-connector';

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
    const pending = returnData.filter(r => r.status === 'pending').length;
    const completed = returnData.filter(r => r.status === 'completed').length;
    const totalValue = returnData.reduce((sum, r) => sum + (r.totalValue || 0), 0);

    setAnalyticsData(prev => ({
      ...prev,
      returnNotes: {
        total: returnData.length,
        pending,
        completed,
        totalValue,
        reasonBreakdown: prev.returnNotes.reasonBreakdown, // Keep existing for now
        monthlyTrend: prev.returnNotes.monthlyTrend // Keep existing for now
      }
    }));
  };

  const updateAnalyticsFromDamages = (damageData: DamageReport[]) => {
    const resolved = damageData.filter(d => d.status === 'resolved').length;
    const pending = damageData.filter(d => d.status === 'pending').length;
    const totalCost = damageData.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

    setAnalyticsData(prev => ({
      ...prev,
      damages: {
        total: damageData.length,
        resolved,
        pending,
        totalCost,
        categoryBreakdown: prev.damages.categoryBreakdown, // Keep existing for now
        trends: prev.damages.trends // Keep existing for now
      }
    }));
  };

  const updateAnalyticsFromInvoices = (invoiceData: any[]) => {
    const pending = invoiceData.filter(i => i.status === 'pending').length;
    const approved = invoiceData.filter(i => i.status === 'approved').length;
    const paid = invoiceData.filter(i => i.status === 'paid').length;
    const totalAmount = invoiceData.reduce((sum, i) => sum + (i.amount || 0), 0);
    const averageAmount = invoiceData.length > 0 ? totalAmount / invoiceData.length : 0;

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
        topSuppliers: prev.invoices.topSuppliers, // Keep existing for now
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Receiver Dashboard
                </h1>
                <p className="text-purple-100 text-lg">Real-time data from Firestore • Track deliveries, returns, and inventory</p>
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
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'deliveries', label: 'Deliveries', icon: Truck },
              { id: 'returns', label: 'Return Notes', icon: FileText },
              { id: 'damages', label: 'Damages', icon: AlertTriangle },
              { id: 'restock', label: 'Restock Items', icon: Package }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 ${
                    viewMode === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {viewMode === 'deliveries' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Delivery Management</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{delivery.supplierName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{delivery.invoiceNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(delivery.expectedDeliveryDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {delivery.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-purple-600 hover:text-purple-900 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'returns' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Return Notes</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnNotes.map((returnNote) => (
                      <tr key={returnNote.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{returnNote.supplierName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{returnNote.returnReason}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(returnNote.totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            returnNote.status === 'completed' ? 'bg-green-100 text-green-800' :
                            returnNote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {returnNote.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(returnNote.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'damages' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Damage Reports</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Damage Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimated Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {damages.map((damage) => (
                      <tr key={damage.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{damage.itemName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{damage.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{damage.damageType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(damage.estimatedCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            damage.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            damage.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {damage.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'restock' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Restock Recommendations</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimum Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {restockItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.currentStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.minimumStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.recommendedRestock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.supplierName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 