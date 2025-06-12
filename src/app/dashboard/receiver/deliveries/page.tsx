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
  const [loading, setLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState<string>(new Date().toDateString());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

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
    try {
      setLoading(true);
      
      // Load today's expected suppliers
      const suppliers = await ReceiverQueries.getTodaysExpectedSuppliers();
      setDailySuppliers(suppliers);
      
      // Load today's restock items
      const restock = await ReceiverQueries.getTodaysRestockItems();
      setRestockItems(restock);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading daily data:', error);
      
      // Mock data for demo
      setDailySuppliers([
        {
          id: '1',
          name: 'TechCorp Ltd',
          expectedTime: '09:30 AM',
          items: 45,
          status: 'on-time',
          priority: 'high',
          contactPerson: 'John Smith',
          phone: '+256 700 123456',
          deliveryItems: [
            { name: 'Laptops', quantity: 15, category: 'Electronics' },
            { name: 'Monitors', quantity: 20, category: 'Electronics' },
            { name: 'Keyboards', quantity: 10, category: 'Accessories' }
          ]
        },
        {
          id: '2',
          name: 'Supply Chain Co',
          expectedTime: '11:15 AM',
          items: 23,
          status: 'delayed',
          priority: 'medium',
          contactPerson: 'Mary Johnson',
          phone: '+256 700 789012',
          deliveryItems: [
            { name: 'Office Chairs', quantity: 8, category: 'Furniture' },
            { name: 'Desks', quantity: 15, category: 'Furniture' }
          ]
        },
        {
          id: '3',
          name: 'Global Parts Inc',
          expectedTime: '02:00 PM',
          items: 67,
          status: 'early',
          priority: 'high',
          contactPerson: 'David Wilson',
          phone: '+256 700 345678',
          deliveryItems: [
            { name: 'Printer Cartridges', quantity: 50, category: 'Supplies' },
            { name: 'Paper Reams', quantity: 17, category: 'Supplies' }
          ]
        },
        {
          id: '4',
          name: 'Office Solutions Ltd',
          expectedTime: '03:45 PM',
          items: 32,
          status: 'on-time',
          priority: 'medium',
          contactPerson: 'Sarah Brown',
          phone: '+256 700 456789',
          deliveryItems: [
            { name: 'Staplers', quantity: 12, category: 'Office Supplies' },
            { name: 'File Folders', quantity: 20, category: 'Office Supplies' }
          ]
        }
      ]);

      setRestockItems([
        {
          id: '1',
          itemName: 'HP Laptop Batteries',
          currentStock: 5,
          restockThreshold: 20,
          suggestedQuantity: 50,
          supplier: 'TechCorp Ltd',
          priority: 'urgent',
          category: 'Electronics',
          lastRestocked: '2024-01-15',
          averageUsage: 8
        },
        {
          id: '2',
          itemName: 'Office Paper A4',
          currentStock: 12,
          restockThreshold: 30,
          suggestedQuantity: 100,
          supplier: 'Supply Chain Co',
          priority: 'high',
          category: 'Supplies',
          lastRestocked: '2024-01-20',
          averageUsage: 15
        },
        {
          id: '3',
          itemName: 'Ethernet Cables',
          currentStock: 8,
          restockThreshold: 25,
          suggestedQuantity: 75,
          supplier: 'Global Parts Inc',
          priority: 'medium',
          category: 'Accessories',
          lastRestocked: '2024-01-18',
          averageUsage: 6
        },
        {
          id: '4',
          itemName: 'Printer Toner Cartridges',
          currentStock: 3,
          restockThreshold: 15,
          suggestedQuantity: 40,
          supplier: 'Office Solutions Ltd',
          priority: 'urgent',
          category: 'Supplies',
          lastRestocked: '2024-01-12',
          averageUsage: 5
        }
      ]);
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between mb-4">
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
              <p className="text-gray-600 mt-1">{getCurrentDayLabel()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            <button
              onClick={loadDailyData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
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
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Today's Expected Suppliers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Expected Suppliers Today</h2>
            <span className="text-sm text-gray-500">{filteredSuppliers.length} suppliers</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading suppliers...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No suppliers expected today</p>
              <p className="text-gray-400 text-sm">Check back tomorrow for new deliveries</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredSuppliers.map((supplier) => (
                <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{supplier.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSupplierStatusColor(supplier.status)}`}>
                          {supplier.status.replace('-', ' ').toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(supplier.priority)}`}>
                          {getPriorityIcon(supplier.priority)} {supplier.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">Expected: {formatTime(supplier.expectedTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          <span className="font-medium">{supplier.items} items</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          <span>{supplier.contactPerson}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          <span>{supplier.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Delivery Items */}
                  <div className="pt-3 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Items:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {supplier.deliveryItems?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <div className="text-right">
                            <span className="text-gray-600">×{item.quantity}</span>
                            <div className="text-xs text-gray-500">{item.category}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Expected to be Restocked Today */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Items Needing Restock</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-red-600">
                {filteredRestockItems.filter(item => item.priority === 'urgent').length} Urgent
              </span>
              <span className="text-sm text-gray-500">{filteredRestockItems.length} items</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-3 text-gray-600">Loading restock items...</span>
            </div>
          ) : filteredRestockItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">All items are well stocked</p>
              <p className="text-gray-400 text-sm">No restocking needed today</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredRestockItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{item.itemName}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(item.priority)}`}>
                          {getPriorityIcon(item.priority)} {item.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex justify-between">
                          <span>Current Stock:</span>
                          <span className={`font-medium ${item.currentStock <= item.restockThreshold * 0.3 ? 'text-red-600' : 
                            item.currentStock <= item.restockThreshold * 0.6 ? 'text-orange-600' : 'text-gray-900'}`}>
                            {item.currentStock} units
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Threshold:</span>
                          <span className="font-medium text-gray-900">{item.restockThreshold} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Suggested Order:</span>
                          <span className="font-medium text-blue-600">{item.suggestedQuantity} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily Usage:</span>
                          <span className="font-medium text-gray-900">{item.averageUsage} units</span>
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
                  
                  {/* Additional Info */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Supplier:</span>
                        <div className="text-gray-900">{item.supplier}</div>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>
                        <div className="text-gray-900">{item.category}</div>
                      </div>
                      <div>
                        <span className="font-medium">Last Restocked:</span>
                        <div className="text-gray-900">{item.lastRestocked}</div>
                      </div>
                      <div>
                        <span className="font-medium">Days Until Empty:</span>
                        <div className="text-gray-900">
                          {item.averageUsage > 0 ? Math.ceil(item.currentStock / item.averageUsage) : 'N/A'} days
                        </div>
                      </div>
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