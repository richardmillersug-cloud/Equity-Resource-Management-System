'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Calendar,
  User,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { RestockOrderService, RestockOrder, RestockItem, RESTOCK_ORDER_STATUSES, PRIORITY_LEVELS } from '../../../../lib/firebase/restock-order-service';
import { authService } from '../../../../lib/firebase/auth';

const restockOrderService = new RestockOrderService();

export default function RestockOrdersPage() {
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RestockOrder | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    completedOrders: 0
  });

  // New order form state
  const [newOrder, setNewOrder] = useState<Partial<RestockOrder>>({
    title: '',
    description: '',
    expectedDeliveryDate: new Date(),
    supplier: '',
    priority: 'medium',
    items: [],
    notes: ''
  });

  // New item form state
  const [newItem, setNewItem] = useState<Partial<RestockItem>>({
    itemName: '',
    expectedQuantity: 0,
    unitPrice: 0,
    supplier: '',
    category: '',
    description: '',
    expiryDate: undefined,
    batchNumber: ''
  });

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadRestockOrders();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadRestockOrders = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading restock orders...');
      
      // Check if user is authenticated
      if (!currentUser) {
        console.log('⚠️ No current user, waiting for authentication...');
        return;
      }
      
      console.log('👤 Current user:', currentUser?.email, 'Role:', currentUser?.role);
      
      const orders = await restockOrderService.getOrdersForPurchasing();
      console.log('📦 Loaded orders:', orders?.length || 0);
      setRestockOrders(orders || []);
      
      // Calculate stats
      try {
        const stats = await restockOrderService.getRestockOrderStats();
        console.log('📊 Stats loaded:', stats);
        setStats({
          totalOrders: stats.totalOrders,
          pendingOrders: stats.pendingOrders,
          inTransitOrders: stats.inTransitOrders,
          deliveredOrders: stats.deliveredOrders,
          completedOrders: stats.completedOrders
        });
      } catch (statsError) {
        console.error('⚠️ Error loading stats (non-critical):', statsError);
        // Set default stats if stats loading fails
        setStats({
          totalOrders: orders?.length || 0,
          pendingOrders: 0,
          inTransitOrders: 0,
          deliveredOrders: 0,
          completedOrders: 0
        });
      }
    } catch (error) {
      console.error('❌ Error loading restock orders:', error);
      setRestockOrders([]);
      // Show user-friendly error message
      alert('Failed to load restock orders. Please check your permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    try {
      console.log('🚀 Starting order creation...');
      
      if (!currentUser?.uid) {
        alert('Please log in to create restock orders');
        console.error('❌ No current user for order creation');
        return;
      }

      console.log('👤 Creating order for user:', currentUser.email);

      if (!newOrder.title || !newOrder.supplier || !newOrder.expectedDeliveryDate) {
        alert('Please fill in all required fields');
        console.error('❌ Missing required fields:', { 
          title: !!newOrder.title, 
          supplier: !!newOrder.supplier, 
          expectedDeliveryDate: !!newOrder.expectedDeliveryDate 
        });
        return;
      }

      if (!newOrder.items || newOrder.items.length === 0) {
        alert('Please add at least one item to the restock order');
        console.error('❌ No items in order');
        return;
      }

      console.log('📦 Order details:', {
        title: newOrder.title,
        supplier: newOrder.supplier,
        itemsCount: newOrder.items?.length,
        priority: newOrder.priority
      });

      const orderData = {
        ...newOrder,
        createdBy: currentUser.uid,
        status: 'draft' as const,
        items: newOrder.items || []
      };

      console.log('💾 Saving order to database...');
      const orderId = await restockOrderService.createRestockOrder(orderData as Omit<RestockOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>);
      console.log('✅ Order created with ID:', orderId);
      
      setShowCreateModal(false);
      resetNewOrderForm();
      await loadRestockOrders();
      alert('Restock order created successfully!');
    } catch (error) {
      console.error('❌ Error creating restock order:', error);
      alert(`Failed to create restock order: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddItem = () => {
    if (!newItem.itemName || !newItem.expectedQuantity || !newItem.unitPrice) {
      alert('Please fill in all required item fields');
      return;
    }

    const item: RestockItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemName: newItem.itemName!,
      expectedQuantity: newItem.expectedQuantity!,
      unitPrice: newItem.unitPrice!,
      totalExpectedValue: newItem.expectedQuantity! * newItem.unitPrice!,
      supplier: newItem.supplier || newOrder.supplier || '',
      category: newItem.category,
      description: newItem.description,
      expiryDate: newItem.expiryDate,
      batchNumber: newItem.batchNumber,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setNewOrder(prev => ({
      ...prev,
      items: [...(prev.items || []), item]
    }));

    resetNewItemForm();
    setShowAddItemModal(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || []
    }));
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      title: '',
      description: '',
      expectedDeliveryDate: new Date(),
      supplier: '',
      priority: 'medium',
      items: [],
      notes: ''
    });
  };

  const resetNewItemForm = () => {
    setNewItem({
      itemName: '',
      expectedQuantity: 0,
      unitPrice: 0,
      supplier: '',
      category: '',
      description: '',
      expiryDate: undefined,
      batchNumber: ''
    });
  };

  const handleSubmitOrder = async (orderId: string) => {
    try {
      await restockOrderService.submitOrder(orderId);
      await loadRestockOrders();
      alert('Order submitted successfully!');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    }
  };

  const filteredOrders = restockOrders.filter(order => {
    const matchesSearch = (order?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order?.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order?.supplier || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const statusConfig = RESTOCK_ORDER_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = RESTOCK_ORDER_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITY_LEVELS.find(p => p.value === priority);
    return priorityConfig?.color || 'gray';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading restock orders...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Restock Orders</h1>
                <p className="text-sm sm:text-base text-gray-600">Create and manage expected items for restocking</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <button
                onClick={loadRestockOrders}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 font-semibold text-sm sm:text-base transition-all duration-300 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 font-semibold text-sm sm:text-base transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex-shrink-0"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Create Restock Order</span>
                <span className="sm:hidden">Create</span>
              </button>
              <button
                onClick={async () => {
                  console.log('🧪 Creating test order...');
                  try {
                    // Pre-fill form with test data
                    setNewOrder({
                      title: 'Test Weekly Produce Order',
                      description: 'Sample order to test the system',
                      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                      supplier: 'Test Supplier Ltd',
                      priority: 'medium',
                      items: [
                        {
                          id: `temp_${Date.now()}_001`,
                          itemName: 'Test Tomatoes',
                          expectedQuantity: 25,
                          unitPrice: 3000,
                          totalExpectedValue: 75000,
                          supplier: 'Test Supplier Ltd',
                          category: 'Produce',
                          description: 'Fresh red tomatoes for testing',
                          status: 'pending',
                          createdAt: new Date(),
                          updatedAt: new Date()
                        }
                      ],
                      notes: 'This is a test order to verify the system works'
                    });
                    setShowCreateModal(true);
                  } catch (error) {
                    console.error('Error creating test order:', error);
                  }
                }}
                className="bg-yellow-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 font-semibold text-sm sm:text-base hover:bg-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex-shrink-0"
              >
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Create Test Order</span>
                <span className="sm:hidden">Test</span>
              </button>
            </div>
          </div>
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">In Transit</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.inTransitOrders}</p>
                </div>
                <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Delivered</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.deliveredOrders}</p>
                </div>
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, order number, or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Statuses</option>
                  {RESTOCK_ORDER_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={loadRestockOrders}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Restock Orders List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Restock Orders</h3>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Supplier</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expected Delivery</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Expected Value</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate">{order.title}</div>
                            <div className="text-xs text-gray-500 md:hidden mt-1">{order?.supplier || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 hidden md:table-cell">
                          {order?.supplier || 'N/A'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 hidden lg:table-cell">
                          {order.expectedDeliveryDate && order.expectedDeliveryDate.toDate ? 
                            order.expectedDeliveryDate.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900">
                          {(order?.items || []).length} items
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 hidden sm:table-cell">
                          UGX {(order?.totalExpectedValue || 0).toLocaleString()}
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getPriorityColor(order.priority)}-100 text-${getPriorityColor(order.priority)}-800`}>
                            {order?.priority || 'medium'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(order.status)}-100 text-${getStatusColor(order.status)}-800`}>
                            {getStatusLabel(order?.status || '')}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowViewModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 p-1"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setNewOrder(order);
                                    setEditingOrderId(order.id);
                                    setShowCreateModal(true);
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900 p-1"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSubmitOrder(order.id)}
                                  className="text-green-600 hover:text-green-900 p-1"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingOrderId ? 'Edit Restock Order' : 'Create New Restock Order'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingOrderId(null);
                  resetNewOrderForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newOrder.title || ''}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter order title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={newOrder.supplier || ''}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={newOrder.expectedDeliveryDate ? new Date(newOrder.expectedDeliveryDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, expectedDeliveryDate: new Date(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newOrder.priority || 'medium'}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PRIORITY_LEVELS.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newOrder.description || ''}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter order description"
                />
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium text-gray-900">Expected Items</h4>
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {/* Items List */}
                <div className="border border-gray-200 rounded-lg">
                  {(newOrder.items || []).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No items added yet. Click "Add Item" to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(newOrder.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                                <div className="text-sm text-gray-500">{item.description}</div>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{item.expectedQuantity}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">UGX {item.unitPrice?.toLocaleString()}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">UGX {(item.totalExpectedValue || 0).toLocaleString()}</td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newOrder.notes || ''}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for this order"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingOrderId(null);
                  resetNewOrderForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingOrderId ? 'Update Order' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Expected Item</h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  resetNewItemForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.itemName || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Quantity *
                </label>
                <input
                  type="number"
                  value={newItem.expectedQuantity || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expectedQuantity: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price (UGX) *
                </label>
                <input
                  type="number"
                  value={newItem.unitPrice || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newItem.category || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Item category"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Item description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newItem.expiryDate ? new Date(newItem.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, expiryDate: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={newItem.batchNumber || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, batchNumber: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Batch number (if applicable)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  resetNewItemForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}