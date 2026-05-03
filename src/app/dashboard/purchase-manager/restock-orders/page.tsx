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
  FileText,
  DollarSign,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RestockOrderService, RestockOrder, RestockItem, RESTOCK_ORDER_STATUSES, PRIORITY_LEVELS } from '../../../../lib/firebase/restock-order-service';
import { authService } from '../../../../lib/firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';

const restockOrderService = new RestockOrderService();

// --- Helpers ---

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  try {
    if (date?.toDate) return date.toDate().toLocaleDateString();
    if (date instanceof Date) return date.toLocaleDateString();
    return new Date(date).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

const formatCurrency = (amount?: number) =>
  amount ? `UGX ${amount.toLocaleString()}` : 'UGX 0';

// Full Tailwind class names so JIT can detect them at build time
const STATUS_BADGE: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-800',
  blue:   'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  green:  'bg-green-100 text-green-800',
  red:    'bg-red-100 text-red-800',
};

const getStatusBadgeClass = (status: string) => {
  const cfg = RESTOCK_ORDER_STATUSES.find(s => s.value === status);
  return STATUS_BADGE[cfg?.color ?? 'gray'] ?? STATUS_BADGE.gray;
};

const getStatusLabel = (status: string) =>
  RESTOCK_ORDER_STATUSES.find(s => s.value === status)?.label ?? status;

const getPriorityBadgeClass = (priority: string) => {
  const cfg = PRIORITY_LEVELS.find(p => p.value === priority);
  return STATUS_BADGE[cfg?.color ?? 'gray'] ?? STATUS_BADGE.gray;
};

// --- Component ---

export default function RestockOrdersPage() {
  const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<RestockOrder | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inTransitOrders: 0,
    deliveredOrders: 0,
    completedOrders: 0
  });

  const [newOrder, setNewOrder] = useState<Partial<RestockOrder>>({
    title: '',
    description: '',
    expectedDeliveryDate: new Date(),
    supplier: '',
    priority: 'medium',
    items: [],
    notes: ''
  });

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

  // Auth
  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      loadRestockOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Error loading current user:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Data loading — fetch all docs without orderBy so Firestore never silently
  // excludes records that are missing the ordered field, then sort client-side.
  const loadRestockOrders = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'restockOrders'));
      const orders: RestockOrder[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RestockOrder));

      // Sort newest-first: prefer createdAt, fall back to submittedAt
      orders.sort((a, b) => {
        const getTime = (v: any): number => {
          if (!v) return 0;
          if (v?.toDate) return v.toDate().getTime();
          return new Date(v).getTime();
        };
        return (getTime(b.createdAt) || getTime(b.submittedAt)) -
               (getTime(a.createdAt) || getTime(a.submittedAt));
      });

      setRestockOrders(orders);

      // Derive stats from fetched data
      setStats({
        totalOrders:    orders.length,
        pendingOrders:  orders.filter(o => ['draft', 'submitted'].includes(o.status)).length,
        inTransitOrders: orders.filter(o => o.status === 'in_transit').length,
        deliveredOrders: orders.filter(o => o.status === 'delivered').length,
        completedOrders: orders.filter(o => o.status === 'complete').length,
      });
    } catch (err: any) {
      console.error('Error loading restock orders:', err);
      alert(`Failed to load restock orders: ${err?.message ?? 'Unknown error'}`);
      setRestockOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Create / Update order
  const handleSaveOrder = async () => {
    if (!currentUser?.uid) {
      alert('Please log in to manage restock orders');
      return;
    }
    if (!newOrder.title || !newOrder.supplier || !newOrder.expectedDeliveryDate) {
      alert('Please fill in Title, Supplier and Expected Delivery Date');
      return;
    }
    if (!newOrder.items || newOrder.items.length === 0) {
      alert('Please add at least one item to the restock order');
      return;
    }

    try {
      const orderData = {
        ...newOrder,
        createdBy: currentUser.uid,
        status: (newOrder.status ?? 'draft') as RestockOrder['status'],
        items: newOrder.items ?? []
      };

      if (editingOrderId) {
        await restockOrderService.updateRestockOrder(
          editingOrderId,
          orderData as Partial<RestockOrder>
        );
        alert('Restock order updated successfully!');
      } else {
        await restockOrderService.createRestockOrder(
          orderData as Omit<RestockOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
        );
        alert('Restock order created successfully!');
      }

      closeCreateModal();
      await loadRestockOrders();
    } catch (err: any) {
      console.error('Error saving restock order:', err);
      alert(`Failed to save restock order: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingOrderId(null);
    resetNewOrderForm();
  };

  // Add item to form
  const handleAddItem = () => {
    if (!newItem.itemName || !newItem.expectedQuantity || !newItem.unitPrice) {
      alert('Please fill in Item Name, Quantity and Unit Price');
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
    setNewOrder(prev => ({ ...prev, items: [...(prev.items ?? []), item] }));
    resetNewItemForm();
    setShowAddItemModal(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setNewOrder(prev => ({ ...prev, items: prev.items?.filter(i => i.id !== itemId) ?? [] }));
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
    if (!confirm('Submit this order for delivery? This will notify the receiver.')) return;
    try {
      await restockOrderService.submitOrder(orderId);
      await loadRestockOrders();
      alert('Order submitted successfully!');
    } catch (err: any) {
      console.error('Error submitting order:', err);
      alert(`Failed to submit order: ${err?.message ?? 'Unknown error'}`);
    }
  };

  const openEditModal = (order: RestockOrder) => {
    setSelectedOrder(order);
    setNewOrder({ ...order });
    setEditingOrderId(order.id);
    setShowCreateModal(true);
  };

  const openViewModal = (order: RestockOrder) => {
    setSelectedOrder(order);
    setExpandedItems(false);
    setShowViewModal(true);
  };

  const filteredOrders = restockOrders.filter(order => {
    const matchesSearch =
      (order.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.supplier ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const orderTotal = (newOrder.items ?? []).reduce(
    (sum, i) => sum + (i.totalExpectedValue ?? 0),
    0
  );

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-lg text-gray-600">
          {authLoading ? 'Authenticating...' : 'Loading restock orders...'}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-6 pb-12">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Restock Orders</h1>
                <p className="text-sm text-gray-600">Create and manage expected items for restocking</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadRestockOrders}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => { resetNewOrderForm(); setEditingOrderId(null); setShowCreateModal(true); }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Restock Order</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Orders',  value: stats.totalOrders,     icon: FileText,     color: 'text-blue-500'   },
              { label: 'Pending',       value: stats.pendingOrders,   icon: Clock,        color: 'text-yellow-500' },
              { label: 'In Transit',    value: stats.inTransitOrders, icon: Truck,        color: 'text-orange-500' },
              { label: 'Delivered',     value: stats.deliveredOrders, icon: Package,      color: 'text-purple-500' },
              { label: 'Completed',     value: stats.completedOrders, icon: CheckCircle,  color: 'text-green-500'  },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${color} flex-shrink-0`} />
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, order number, or supplier..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Statuses</option>
                  {RESTOCK_ORDER_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Restock Orders</h3>
              <span className="text-sm text-gray-500">{filteredOrders.length} record{filteredOrders.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expected Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Expected Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No restock orders found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try adjusting your search or filter.'
                            : 'Click "Create Restock Order" to get started.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{order.title}</div>
                          <div className="text-xs text-gray-400 md:hidden mt-0.5">{order.supplier ?? 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 hidden md:table-cell">
                          {order.supplier ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 hidden lg:table-cell">
                          {formatDate(order.expectedDeliveryDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {(order.items ?? []).length} items
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 hidden sm:table-cell">
                          {formatCurrency(order.totalExpectedValue)}
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(order.priority)}`}>
                            {order.priority ?? 'medium'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openViewModal(order)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => openEditModal(order)}
                                  className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                                  title="Edit order"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSubmitOrder(order.id)}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                  title="Submit order"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================
          VIEW ORDER MODAL
      ============================== */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-50 flex items-start justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-lg font-bold text-gray-900">{selectedOrder.orderNumber}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(selectedOrder.priority)}`}>
                    {selectedOrder.priority}
                  </span>
                </div>
                <p className="text-gray-600">{selectedOrder.title}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Order Details
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Supplier</span>
                      <span className="font-medium">{selectedOrder.supplier ?? 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created by</span>
                      <span className="font-medium">{selectedOrder.createdBy ?? 'N/A'}</span>
                    </div>
                    {selectedOrder.assignedTo && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Assigned to</span>
                        <span className="font-medium">{selectedOrder.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Timeline
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created</span>
                      <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expected Delivery</span>
                      <span className="font-medium">{formatDate(selectedOrder.expectedDeliveryDate)}</span>
                    </div>
                    {selectedOrder.actualDeliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Actual Delivery</span>
                        <span className="font-medium">{formatDate(selectedOrder.actualDeliveryDate)}</span>
                      </div>
                    )}
                    {selectedOrder.submittedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Submitted</span>
                        <span className="font-medium">{formatDate(selectedOrder.submittedAt)}</span>
                      </div>
                    )}
                    {selectedOrder.verifiedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Verified</span>
                        <span className="font-medium">{formatDate(selectedOrder.verifiedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">Expected Value</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedOrder.totalExpectedValue)}</p>
                </div>
                {selectedOrder.totalReceivedValue !== undefined && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Received Value</p>
                    <p className="text-lg font-bold text-green-800">{formatCurrency(selectedOrder.totalReceivedValue)}</p>
                  </div>
                )}
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-600 mb-1">Total Items</p>
                  <p className="text-lg font-bold text-purple-800">{(selectedOrder.items ?? []).length}</p>
                </div>
              </div>

              {/* Description */}
              {selectedOrder.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedOrder.description}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <button
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 mb-2"
                  onClick={() => setExpandedItems(v => !v)}
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Order Items ({(selectedOrder.items ?? []).length})
                  </span>
                  {expandedItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {expandedItems && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exp. Qty</th>
                          {selectedOrder.status !== 'draft' && selectedOrder.status !== 'submitted' && (
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rcv. Qty</th>
                          )}
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {(selectedOrder.items ?? []).map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{item.itemName}</div>
                              {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                            </td>
                            <td className="px-4 py-3 text-right">{item.expectedQuantity}</td>
                            {selectedOrder.status !== 'draft' && selectedOrder.status !== 'submitted' && (
                              <td className="px-4 py-3 text-right">{item.receivedQuantity ?? '—'}</td>
                            )}
                            <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalExpectedValue)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                item.status === 'complete'      ? 'bg-green-100 text-green-800'  :
                                item.status === 'partial'       ? 'bg-yellow-100 text-yellow-800':
                                item.status === 'overdelivered' ? 'bg-blue-100 text-blue-800'   :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!expandedItems && (
                  <button
                    onClick={() => setExpandedItems(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Show all {(selectedOrder.items ?? []).length} items
                  </button>
                )}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Notes</h4>
                  <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">{selectedOrder.notes}</p>
                </div>
              )}
              {selectedOrder.receiverNotes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Receiver Notes</h4>
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">{selectedOrder.receiverNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              {selectedOrder.status === 'draft' && (
                <>
                  <button
                    onClick={() => { setShowViewModal(false); openEditModal(selectedOrder); }}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => { setShowViewModal(false); handleSubmitOrder(selectedOrder.id); }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Submit Order
                  </button>
                </>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
          CREATE / EDIT ORDER MODAL
      ============================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-50 flex items-start justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingOrderId ? 'Edit Restock Order' : 'Create New Restock Order'}
              </h3>
              <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Order Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={newOrder.title ?? ''}
                    onChange={e => setNewOrder(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Weekly Produce Order"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <input
                    type="text"
                    value={newOrder.supplier ?? ''}
                    onChange={e => setNewOrder(p => ({ ...p, supplier: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date *</label>
                  <input
                    type="date"
                    value={newOrder.expectedDeliveryDate ? new Date(
                      (newOrder.expectedDeliveryDate as any)?.toDate?.() ?? newOrder.expectedDeliveryDate
                    ).toISOString().split('T')[0] : ''}
                    onChange={e => setNewOrder(p => ({ ...p, expectedDeliveryDate: new Date(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newOrder.priority ?? 'medium'}
                    onChange={e => setNewOrder(p => ({ ...p, priority: e.target.value as RestockOrder['priority'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PRIORITY_LEVELS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newOrder.description ?? ''}
                  onChange={e => setNewOrder(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Expected Items</h4>
                    {orderTotal > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">Total: {formatCurrency(orderTotal)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { resetNewItemForm(); setShowAddItemModal(true); }}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {(newOrder.items ?? []).length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No items yet. Click "Add Item" to begin.</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(newOrder.items ?? []).map(item => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.itemName}</div>
                              {item.category && <div className="text-xs text-gray-400">{item.category}</div>}
                            </td>
                            <td className="px-4 py-3 text-right">{item.expectedQuantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.totalExpectedValue)}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newOrder.notes ?? ''}
                  onChange={e => setNewOrder(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for this order"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                {editingOrderId ? 'Save Changes' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
          ADD ITEM MODAL
      ============================== */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto z-[60] flex items-start justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Add Expected Item</h3>
              <button onClick={() => { setShowAddItemModal(false); resetNewItemForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newItem.itemName ?? ''}
                  onChange={e => setNewItem(p => ({ ...p, itemName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Tomatoes"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Quantity *</label>
                <input
                  type="number"
                  value={newItem.expectedQuantity || ''}
                  onChange={e => setNewItem(p => ({ ...p, expectedQuantity: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (UGX) *</label>
                <input
                  type="number"
                  value={newItem.unitPrice || ''}
                  onChange={e => setNewItem(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newItem.category ?? ''}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Produce"
                />
              </div>

              {/* Live total preview */}
              {(newItem.expectedQuantity ?? 0) > 0 && (newItem.unitPrice ?? 0) > 0 && (
                <div className="sm:col-span-2 bg-blue-50 rounded-lg p-3 text-sm text-center">
                  <span className="text-blue-600">Estimated Total: </span>
                  <span className="font-bold text-blue-800">
                    {formatCurrency((newItem.expectedQuantity ?? 0) * (newItem.unitPrice ?? 0))}
                  </span>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newItem.description ?? ''}
                  onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Item description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newItem.expiryDate ? new Date(newItem.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={e => setNewItem(p => ({ ...p, expiryDate: e.target.value ? new Date(e.target.value) : undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={newItem.batchNumber ?? ''}
                  onChange={e => setNewItem(p => ({ ...p, batchNumber: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button
                onClick={() => { setShowAddItemModal(false); resetNewItemForm(); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
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
