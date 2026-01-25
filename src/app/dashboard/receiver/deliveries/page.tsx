'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ReceiverQueries } from '../../../../lib/firebase/role-based-queries';
import { 
  Package,
  Clock,
  User,
  Phone,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Truck,
  Calendar,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DailySupplier {
  id: string;
  name: string;
  expectedTime: string;
  items: number;
  status: 'on-time' | 'delayed' | 'early';
  priority: 'high' | 'medium' | 'low';
  contactPerson: string;
  phone: string;
  deliveryItems: {
    name: string;
    quantity: number;
    category: string;
  }[];
}

interface RestockItem {
  id: string;
  itemName: string;
  itemDescription?: string;
  currentStock: number;
  restockThreshold: number;
  suggestedQuantity: number;
  unit?: string;
  supplier: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  lastRestocked: string;
  averageUsage: number;
  expectedDate?: string;
  status?: 'pending' | 'partial' | 'overdue' | 'received';
  notes?: string;
  receivedQuantity?: number;
  createdDate?: string;
  daysUntilDelivery?: number;
}

export default function DeliveriesPage() {
  const router = useRouter();
  const [dailySuppliers, setDailySuppliers] = useState<DailySupplier[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<string>(new Date().toDateString());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Real-time subscriptions
  useEffect(() => {
    let suppliersUnsubscribe: (() => void) | null = null;
    let restockUnsubscribe: (() => void) | null = null;

    const setupSubscriptions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Subscribe to today's expected suppliers
        suppliersUnsubscribe = ReceiverQueries.subscribeTodaysExpectedSuppliers((suppliers) => {
          setDailySuppliers(suppliers);
          setLastUpdated(new Date());
          setLoading(false);
        });

        // Subscribe to restock items
        restockUnsubscribe = ReceiverQueries.subscribeRestockItems((items) => {
          setRestockItems(items);
          setLastUpdated(new Date());
        });

      } catch (err) {
        console.error('Error setting up subscriptions:', err);
        setError('Failed to load delivery data. Please try again.');
        setLoading(false);
        
        // Fallback to one-time data load
        loadDailyData();
      }
    };

    setupSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      if (suppliersUnsubscribe) suppliersUnsubscribe();
      if (restockUnsubscribe) restockUnsubscribe();
    };
  }, []);

  // Check for day change every minute and refresh subscriptions
  useEffect(() => {
    const dayCheckInterval = setInterval(() => {
      const newDay = new Date().toDateString();
      if (newDay !== currentDay) {
        setCurrentDay(newDay);
        // Refresh subscriptions for new day
        window.location.reload(); // Simple way to refresh subscriptions
      }
    }, 60000); // Check every minute

    return () => clearInterval(dayCheckInterval);
  }, [currentDay]);

  // Fallback method for loading data without subscriptions
  const loadDailyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load today's expected suppliers
      const suppliers = await ReceiverQueries.getTodaysExpectedSuppliers();
      setDailySuppliers(suppliers);
      
      // Load today's restock items
      const restock = await ReceiverQueries.getTodaysRestockItems();
      setRestockItems(restock);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading daily data:', error);
      setError('Failed to load delivery data. Please check your connection and try again.');
      
      // Set empty arrays to show empty state
      setDailySuppliers([]);
      setRestockItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    loadDailyData();
  };

  // Helper functions
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

  const getCurrentDayLabel = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  // Filter functions
  const filteredSuppliers = dailySuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || supplier.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredRestockItems = restockItems.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  // Pagination for suppliers
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterPriority]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 p-6">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Daily Deliveries
                </h1>
                <p className="text-purple-100 text-base">
                  {getCurrentDayLabel()} • Last updated: {formatTime(lastUpdated.toLocaleTimeString())}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-purple-100">
                {error ? (
                  <span className="text-red-200 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Connection Error
                  </span>
                ) : (
                  <span className="text-green-200 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Live Updates
                  </span>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-2xl hover:bg-purple-50 transition-all duration-300 disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Modern Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers, contacts, or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="on-time">On Time</option>
            <option value="delayed">Delayed</option>
            <option value="early">Early</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Expected Suppliers</p>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{dailySuppliers.length}</p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                {dailySuppliers.reduce((sum, supplier) => sum + supplier.items, 0)}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Urgent Restocks</p>
              <p className="text-3xl font-bold text-red-600 group-hover:text-red-700 transition-colors">
                {restockItems.filter(item => item.priority === 'urgent').length}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">On Time</p>
              <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                {dailySuppliers.filter(supplier => supplier.status === 'on-time').length}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Today's Expected Suppliers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-6 w-6 text-purple-600 mr-2" />
              Today's Expected Suppliers
            </h2>
            <span className="text-sm text-gray-500 bg-purple-50 px-3 py-1 rounded-full">
              {filteredSuppliers.length > 0 
                ? `Page ${currentPage} of ${totalPages} (${filteredSuppliers.length} total)` 
                : 'No suppliers expected'
              }
            </span>
          </div>

          {loading && dailySuppliers.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Deliveries Scheduled</h3>
              <p className="text-gray-500">
                {error 
                  ? 'Unable to load delivery data. Please check your connection.'
                  : 'No suppliers are expected to deliver today.'
                }
              </p>
              {error && (
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedSuppliers.map((supplier) => (
                <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${getSupplierStatusColor(supplier.status)}`}>
                        <Package className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {supplier.expectedTime}
                          </span>
                          <span className="flex items-center">
                            <Package className="h-4 w-4 mr-1" />
                            {supplier.items} items
                          </span>
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {supplier.contactPerson}
                          </span>
                          <span className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {supplier.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(supplier.priority)}`}>
                        {getPriorityIcon(supplier.priority)}
                        {supplier.priority.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSupplierStatusColor(supplier.status)}`}>
                        {supplier.status.replace('-', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Delivery Items */}
                  {supplier.deliveryItems && supplier.deliveryItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Items:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {supplier.deliveryItems.map((item, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-500"> × {item.quantity}</span>
                            <span className="text-xs text-gray-400 block">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                ))}
              </div>

              {/* Pagination Controls - Always visible when there are suppliers */}
              {filteredSuppliers.length > 0 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 font-medium">
                      {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : `${filteredSuppliers.length} supplier${filteredSuppliers.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || totalPages === 1}
                    className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                      currentPage === totalPages || totalPages === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                    }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Items Needing Restock Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 text-orange-600 mr-2" />
              Items Needing Restock
            </h2>
            <span className="text-sm text-gray-500">
              {filteredRestockItems.length} item{filteredRestockItems.length !== 1 ? 's' : ''} need attention
            </span>
          </div>

          {loading && restockItems.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredRestockItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Expected Today</h3>
              <p className="text-gray-500">
                {error 
                  ? 'Unable to load restock data. Please check your connection.'
                  : 'No restocking items are expected for delivery today.'
                }
              </p>
              {error && (
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRestockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${getPriorityColor(item.priority)} mr-3`}>
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                            {item.itemDescription && (
                              <div className="text-xs text-gray-500">{item.itemDescription}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.category}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.currentStock || 0}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{item.suggestedQuantity}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{item.unit || 'pcs'}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{item.supplier}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {item.expectedDate}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                          item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 