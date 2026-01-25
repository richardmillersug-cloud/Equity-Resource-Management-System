'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Truck,
  Calendar,
  User,
  FileText,
  Edit,
  Save,
  X
} from 'lucide-react';
import { RestockOrderService, RestockOrder, RestockItem, RESTOCK_ORDER_STATUSES } from '../../../../lib/firebase/restock-order-service';
import { authService } from '../../../../lib/firebase/auth';

const restockOrderService = new RestockOrderService();

export default function RestockVerificationPage() {
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RestockOrder | null>(null);
  const [verificationItems, setVerificationItems] = useState<RestockItem[]>([]);
  const [receiverNotes, setReceiverNotes] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadCurrentUser();
    loadRestockOrders();
  }, []);

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
      const orders = await restockOrderService.getOrdersForReceiver();
      setRestockOrders(orders || []);
    } catch (error) {
      console.error('Error loading restock orders:', error);
      setRestockOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = (order: RestockOrder) => {
    setSelectedOrder(order);
    setVerificationItems(order.items.map(item => ({ ...item })));
    setReceiverNotes('');
    setShowVerifyModal(true);
  };

  const handleUpdateReceivedQuantity = (itemId: string, receivedQuantity: number, discrepancyReason?: string) => {
    setVerificationItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            receivedQuantity,
            discrepancyReason,
            updatedAt: new Date()
          }
        : item
    ));
  };

  const handleSubmitVerification = async () => {
    try {
      if (!selectedOrder) return;

      await restockOrderService.verifyDelivery(
        selectedOrder.id,
        verificationItems,
        receiverNotes
      );

      setShowVerifyModal(false);
      setSelectedOrder(null);
      setVerificationItems([]);
      setReceiverNotes('');
      await loadRestockOrders();
      
      alert('Verification completed successfully!');
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Failed to submit verification. Please try again.');
    }
  };

  const getItemStatus = (item: RestockItem) => {
    if (item.receivedQuantity === undefined) return { status: 'pending', color: 'gray', label: 'Pending' };
    if (item.receivedQuantity === 0) return { status: 'not_received', color: 'red', label: 'Not Received' };
    if (item.receivedQuantity < item.expectedQuantity) return { status: 'partial', color: 'yellow', label: 'Partial' };
    if (item.receivedQuantity === item.expectedQuantity) return { status: 'complete', color: 'green', label: 'Complete' };
    return { status: 'overdelivered', color: 'blue', label: 'Over Delivered' };
  };

  const getOrderStatus = (order: RestockOrder) => {
    const statusConfig = RESTOCK_ORDER_STATUSES.find(s => s.value === order.status);
    return statusConfig || { value: order.status, label: order.status, color: 'gray' };
  };

  const calculateOrderSummary = (items: RestockItem[]) => {
    const totalExpected = items.reduce((sum, item) => sum + item.expectedQuantity, 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const totalExpectedValue = items.reduce((sum, item) => sum + (item.totalExpectedValue || 0), 0);
    const totalReceivedValue = items.reduce((sum, item) => sum + ((item.receivedQuantity || 0) * item.unitPrice), 0);
    
    return {
      totalExpected,
      totalReceived,
      totalExpectedValue,
      totalReceivedValue,
      discrepancyCount: items.filter(item => 
        item.receivedQuantity !== undefined && item.receivedQuantity !== item.expectedQuantity
      ).length
    };
  };

  const filteredOrders = restockOrders.filter(order => {
    const matchesSearch = (order?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order?.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (order?.supplier || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-2 text-lg">Loading restock orders...</span>
      </div>
    );
  }

  const receivedItemsCount = restockOrders.reduce((sum, order) => {
    return sum + (order.items || []).filter(item => item.receivedQuantity && item.receivedQuantity > 0).length;
  }, 0);

  const totalItemsCount = restockOrders.reduce((sum, order) => {
    return sum + (order.items || []).length;
  }, 0);

  const pendingVerificationCount = restockOrders.filter(order => 
    order.status === 'delivered' || order.status === 'in_transit'
  ).length;

  const verifiedCount = restockOrders.filter(order => order.status === 'verified').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mx-4 mt-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Stock Received Verification
                </h1>
                <p className="text-purple-100 text-base">Verify received items against expected deliveries</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={loadRestockOrders}
                disabled={loading}
                className={`bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white/30 hover:shadow-xl hover:-translate-y-0.5'}`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Refresh Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{restockOrders.length}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">All restock orders</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Items Received</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{receivedItemsCount}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">of {totalItemsCount} total items</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending Verification</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">{pendingVerificationCount}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Awaiting verification</span>
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
                <p className="text-gray-500 text-sm font-medium mb-1">Verified Orders</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{verifiedCount}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Completed verifications</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, order number, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="verified">Verified</option>
              </select>
            </div>
            
            <button
              onClick={loadRestockOrders}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              Restock Orders for Verification ({(filteredOrders || []).length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Value</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {!filteredOrders || filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Package className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Found</h3>
                        <p className="text-gray-500">
                          {searchQuery || statusFilter !== 'all' 
                            ? 'No orders match your search criteria. Try adjusting your filters.' 
                            : 'No restock orders available for verification.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const orderStatus = getOrderStatus(order);
                    const receivedItems = (order?.items || []).filter(item => item.receivedQuantity && item.receivedQuantity > 0).length;
                    const totalItems = (order?.items || []).length;
                    return (
                      <tr key={order.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 group border-l-4 border-transparent hover:border-purple-400">
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                            <div className="text-xs text-gray-500 mt-1">{order.title}</div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Truck className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="text-sm text-gray-900">{order?.supplier || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="text-sm text-gray-900">
                              {order.expectedDeliveryDate && order.expectedDeliveryDate.toDate ? 
                                order.expectedDeliveryDate.toDate().toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{totalItems} items</div>
                            {receivedItems > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                {receivedItems} received
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            UGX {(order?.totalExpectedValue || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            orderStatus.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                            orderStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            orderStatus.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {orderStatus.label}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(order.status === 'delivered' || order.status === 'in_transit') && (
                            <button
                              onClick={() => handleStartVerification(order)}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Verify Items
                            </button>
                          )}
                          {order.status === 'verified' && (
                            <span className="text-green-600 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerifyModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Verify Restock Order</h3>
                  <p className="text-purple-100">Order: {selectedOrder.orderNumber} - {selectedOrder.title}</p>
                </div>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">

            {/* Order Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-600">Supplier:</span>
                  <p className="text-sm text-gray-900">{selectedOrder.supplier}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Expected Date:</span>
                  <p className="text-sm text-gray-900">
                    {selectedOrder.expectedDeliveryDate && selectedOrder.expectedDeliveryDate.toDate ? 
                      selectedOrder.expectedDeliveryDate.toDate().toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Total Expected Value:</span>
                  <p className="text-sm text-gray-900">UGX {(selectedOrder.totalExpectedValue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Items Verification */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Verify Received Items
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-purple-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {verificationItems.map((item) => {
                      const itemStatus = getItemStatus(item);
                      const isComplete = item.receivedQuantity === item.expectedQuantity;
                      const isPartial = item.receivedQuantity && item.receivedQuantity > 0 && item.receivedQuantity < item.expectedQuantity;
                      const isReceived = item.receivedQuantity && item.receivedQuantity > 0;
                      
                      return (
                        <tr key={item.id} className={`${isReceived ? 'bg-green-50/50' : ''} hover:bg-purple-50 transition-colors`}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {isReceived && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                                {item.description && (
                                  <div className="text-xs text-gray-500">{item.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.expectedQuantity}</div>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={item.receivedQuantity || ''}
                              onChange={(e) => handleUpdateReceivedQuantity(
                                item.id, 
                                parseInt(e.target.value) || 0,
                                item.discrepancyReason
                              )}
                              className={`w-24 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                isComplete ? 'border-green-300 bg-green-50' :
                                isPartial ? 'border-yellow-300 bg-yellow-50' :
                                'border-gray-300'
                              }`}
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">UGX {item.unitPrice?.toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">UGX {(item.totalExpectedValue || 0).toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <div className={`text-sm font-medium ${
                              isReceived ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              UGX {((item.receivedQuantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              itemStatus.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                              itemStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              itemStatus.color === 'red' ? 'bg-red-100 text-red-800 border-red-200' :
                              itemStatus.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                              {itemStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {item.receivedQuantity !== undefined && item.receivedQuantity !== item.expectedQuantity && (
                              <input
                                type="text"
                                value={item.discrepancyReason || ''}
                                onChange={(e) => handleUpdateReceivedQuantity(
                                  item.id,
                                  item.receivedQuantity || 0,
                                  e.target.value
                                )}
                                className="w-40 border border-yellow-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-yellow-50"
                                placeholder="Reason for discrepancy"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 mb-6 border border-purple-100">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Verification Summary
              </h4>
              {(() => {
                const summary = calculateOrderSummary(verificationItems);
                const receivedPercentage = summary.totalExpected > 0 
                  ? ((summary.totalReceived / summary.totalExpected) * 100).toFixed(1)
                  : '0';
                const valueDifference = summary.totalReceivedValue - summary.totalExpectedValue;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <span className="text-xs font-medium text-gray-600 uppercase">Total Expected</span>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalExpected} items</p>
                      <p className="text-xs text-gray-500 mt-1">Expected quantity</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <span className="text-xs font-medium text-gray-600 uppercase">Total Received</span>
                      <p className="text-2xl font-bold text-green-600 mt-1">{summary.totalReceived} items</p>
                      <p className="text-xs text-gray-500 mt-1">{receivedPercentage}% received</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <span className="text-xs font-medium text-gray-600 uppercase">Expected Value</span>
                      <p className="text-2xl font-bold text-gray-900 mt-1">UGX {summary.totalExpectedValue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Total expected</p>
                    </div>
                    <div className={`bg-white rounded-lg p-4 border ${
                      valueDifference >= 0 ? 'border-green-200' : 'border-yellow-200'
                    }`}>
                      <span className="text-xs font-medium text-gray-600 uppercase">Received Value</span>
                      <p className={`text-2xl font-bold mt-1 ${
                        valueDifference >= 0 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        UGX {summary.totalReceivedValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {valueDifference >= 0 ? '+' : ''}{valueDifference.toLocaleString()} difference
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Receiver Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receiver Notes
              </label>
              <textarea
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Add any notes about the delivery, discrepancies, or other observations..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVerification}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
              >
                <Save className="w-4 h-4" />
                Submit Verification
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}