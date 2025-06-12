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
  Filter
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
  currentStock: number;
  restockThreshold: number;
  suggestedQuantity: number;
  supplier: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  lastRestocked: string;
  averageUsage: number;
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Truck className="h-8 w-8 text-blue-600 mr-3" />
                Daily Deliveries
              </h1>
              <p className="text-gray-600 mt-1">
                {getCurrentDayLabel()} • Last updated: {formatTime(lastUpdated.toLocaleTimeString())}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {error ? (
                <span className="text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Connection Error
                </span>
              ) : (
                <span className="text-green-600 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Live Updates
                </span>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={handleRefresh}
                className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers, contacts, or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="on-time">On Time</option>
            <option value="delayed">Delayed</option>
            <option value="early">Early</option>
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expected Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{dailySuppliers.length}</p>
            </div>
            <Truck className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {dailySuppliers.reduce((sum, supplier) => sum + supplier.items, 0)}
              </p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent Restocks</p>
              <p className="text-2xl font-bold text-red-600">
                {restockItems.filter(item => item.priority === 'urgent').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Time</p>
              <p className="text-2xl font-bold text-green-600">
                {dailySuppliers.filter(supplier => supplier.status === 'on-time').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Today's Expected Suppliers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              Today's Expected Suppliers
            </h2>
            <span className="text-sm text-gray-500">
              {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} expected
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
            <div className="space-y-4">
              {filteredSuppliers.map((supplier) => (
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
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="w-16 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestockItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Items Well Stocked</h3>
              <p className="text-gray-500">
                {error 
                  ? 'Unable to load inventory data. Please check your connection.'
                  : 'No items currently need restocking.'
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
            <div className="space-y-4">
              {filteredRestockItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${getPriorityColor(item.priority)}`}>
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{item.itemName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>Current: {item.currentStock}</span>
                          <span>Threshold: {item.restockThreshold}</span>
                          <span>Suggested: {item.suggestedQuantity}</span>
                          <span>Supplier: {item.supplier}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stock Level Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Stock Level</span>
                      <span>{Math.round((item.currentStock / item.restockThreshold) * 100)}% of threshold</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.currentStock <= item.restockThreshold * 0.2 ? 'bg-red-500' :
                          item.currentStock <= item.restockThreshold * 0.5 ? 'bg-orange-500' :
                          item.currentStock <= item.restockThreshold * 0.8 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((item.currentStock / item.restockThreshold) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <span className="ml-2 font-medium">{item.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Restocked:</span>
                        <span className="ml-2 font-medium">{item.lastRestocked}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Avg Usage:</span>
                        <span className="ml-2 font-medium">{item.averageUsage}/day</span>
                      </div>
                      {item.daysUntilEmpty && (
                        <div>
                          <span className="text-gray-500">Days Until Empty:</span>
                          <span className={`ml-2 font-medium ${item.daysUntilEmpty <= 7 ? 'text-red-600' : item.daysUntilEmpty <= 14 ? 'text-orange-600' : 'text-green-600'}`}>
                            {item.daysUntilEmpty}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 