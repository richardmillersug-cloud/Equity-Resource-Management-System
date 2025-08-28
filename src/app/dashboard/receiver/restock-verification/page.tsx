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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Restock Verification</h1>
              <p className="text-purple-100 text-lg">Verify received items against expected deliveries</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={loadRestockOrders}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Restock Orders for Verification</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const orderStatus = getOrderStatus(order);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">{order.title}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order?.supplier || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.expectedDeliveryDate && order.expectedDeliveryDate.toDate ? 
                          order.expectedDeliveryDate.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(order?.items || []).length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        UGX {(order?.totalExpectedValue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${orderStatus.color}-100 text-${orderStatus.color}-800`}>
                          {orderStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(order.status === 'delivered' || order.status === 'in_transit') && (
                          <button
                            onClick={() => handleStartVerification(order)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerifyModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-medium text-gray-900">Verify Restock Order</h3>
                <p className="text-gray-600">Order: {selectedOrder.orderNumber} - {selectedOrder.title}</p>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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
              <h4 className="text-lg font-medium text-gray-900 mb-4">Verify Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
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
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{item.expectedQuantity}</td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              value={item.receivedQuantity || ''}
                              onChange={(e) => handleUpdateReceivedQuantity(
                                item.id, 
                                parseInt(e.target.value) || 0,
                                item.discrepancyReason
                              )}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                              min="0"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">UGX {item.unitPrice?.toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">UGX {(item.totalExpectedValue || 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            UGX {((item.receivedQuantity || 0) * item.unitPrice).toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${itemStatus.color}-100 text-${itemStatus.color}-800`}>
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
                                className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
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
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Verification Summary</h4>
              {(() => {
                const summary = calculateOrderSummary(verificationItems);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total Expected:</span>
                      <p className="text-sm text-gray-900">{summary.totalExpected} items</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total Received:</span>
                      <p className="text-sm text-gray-900">{summary.totalReceived} items</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Expected Value:</span>
                      <p className="text-sm text-gray-900">UGX {summary.totalExpectedValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Received Value:</span>
                      <p className="text-sm text-gray-900">UGX {summary.totalReceivedValue.toLocaleString()}</p>
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
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitVerification}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Submit Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}