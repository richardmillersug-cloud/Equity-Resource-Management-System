import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Save,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { PurchasingManagerCRUD, CRUDUtils } from '../../lib/firebase/enhanced-crud-operations';

interface PurchasingManagerCRUDInterfaceProps {
  activeTab: 'suppliers' | 'invoices' | 'purchaseOrders' | 'payments' | 'expenses';
}

export default function PurchasingManagerCRUDInterface({ activeTab }: PurchasingManagerCRUDInterfaceProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Data states
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    setupRealTimeSubscriptions();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'suppliers':
          const supplierData = await PurchasingManagerCRUD.getSuppliers();
          setSuppliers(supplierData);
          break;
        case 'invoices':
          const invoiceData = await PurchasingManagerCRUD.getInvoices();
          setInvoices(invoiceData);
          break;
        case 'purchaseOrders':
          const orderData = await PurchasingManagerCRUD.getPurchaseOrders();
          setPurchaseOrders(orderData);
          break;
        case 'payments':
          const paymentData = await PurchasingManagerCRUD.getPayments();
          setPayments(paymentData);
          break;
      }
    } catch (error: any) {
      setError(error.message);
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscriptions = () => {
    switch (activeTab) {
      case 'suppliers':
        return PurchasingManagerCRUD.subscribeToSuppliers(setSuppliers);
      case 'invoices':
        return PurchasingManagerCRUD.subscribeToInvoices(setInvoices);
      case 'purchaseOrders':
        return PurchasingManagerCRUD.subscribeToPurchaseOrders(setPurchaseOrders);
    }
  };

  // ==================== SUPPLIER OPERATIONS ====================

  const handleCreateSupplier = async (supplierData: any) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.createSupplier(supplierData);
      await CRUDUtils.logOperation('create', 'suppliers', 'new', supplierData);
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSupplier = async (supplierId: string, updates: any) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.updateSupplier(supplierId, updates);
      await CRUDUtils.logOperation('update', 'suppliers', supplierId, updates);
      setShowEditModal(false);
      setSelectedItem(null);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to deactivate this supplier?')) return;
    
    try {
      setLoading(true);
      await PurchasingManagerCRUD.deleteSupplier(supplierId);
      await CRUDUtils.logOperation('delete', 'suppliers', supplierId);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== INVOICE OPERATIONS ====================

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.updateInvoiceStatus(invoiceId, status, notes);
      await CRUDUtils.logOperation('update', 'invoices', invoiceId, { status, notes });
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PURCHASE ORDER OPERATIONS ====================

  const handleCreatePurchaseOrder = async (orderData: any) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.createPurchaseOrder(orderData);
      await CRUDUtils.logOperation('create', 'purchaseOrders', 'new', orderData);
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePurchaseOrder = async (orderId: string, updates: any) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.updatePurchaseOrder(orderId, updates);
      await CRUDUtils.logOperation('update', 'purchaseOrders', orderId, updates);
      setShowEditModal(false);
      setSelectedItem(null);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== PAYMENT OPERATIONS ====================

  const handleCreatePayment = async (paymentData: any) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.createPayment(paymentData);
      await CRUDUtils.logOperation('create', 'payments', 'new', paymentData);
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXPENSE OPERATIONS ====================

  const handleUpdateExpenseStatus = async (expenseId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      setLoading(true);
      await PurchasingManagerCRUD.updateExpenseStatus(expenseId, status, notes);
      await CRUDUtils.logOperation('update', 'expenses', expenseId, { status, notes });
      loadData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  const getCurrentData = () => {
    switch (activeTab) {
      case 'suppliers':
        return suppliers;
      case 'invoices':
        return invoices;
      case 'purchaseOrders':
        return purchaseOrders;
      case 'payments':
        return payments;
      case 'expenses':
        return expenses;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    
    let filtered = data.filter(item => {
      const matchesSearch = searchTerm === '' || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return filtered;
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'paid':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected':
      case 'inactive':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
      case 'paid':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canCreate = () => {
    return ['suppliers', 'purchaseOrders', 'payments'].includes(activeTab);
  };

  const canEdit = () => {
    return ['suppliers', 'purchaseOrders'].includes(activeTab);
  };

  const canDelete = () => {
    return ['suppliers'].includes(activeTab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your {activeTab.toLowerCase()} efficiently
          </p>
        </div>
        
        {canCreate() && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredData().map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.supplierName || item.name || item.description || item.reason || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.tinNumber || item.invoiceNumber || item.orderNumber || item.referenceNumber || `ID: ${item.id.slice(0, 8)}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.dateOfRegistration?.toDate?.()?.toLocaleDateString() ||
                     item.createdAt?.toDate?.()?.toLocaleDateString() || 
                     item.orderDate?.toDate?.()?.toLocaleDateString() ||
                     item.paymentDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.amount ? `UGX ${item.amount.toLocaleString()}` : 
                     item.totalAmount ? `UGX ${item.totalAmount.toLocaleString()}` :
                     item.creditLimit ? `UGX ${item.creditLimit.toLocaleString()}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {canEdit() && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Action buttons for invoices and expenses */}
                      {(activeTab === 'invoices' || activeTab === 'expenses') && item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => activeTab === 'invoices' ? 
                              handleUpdateInvoiceStatus(item.id, 'approved') :
                              handleUpdateExpenseStatus(item.id, 'approved')
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => activeTab === 'invoices' ? 
                              handleUpdateInvoiceStatus(item.id, 'rejected') :
                              handleUpdateExpenseStatus(item.id, 'rejected')
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {canDelete() && (
                        <button
                          onClick={() => handleDeleteSupplier(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button className="text-gray-600 hover:text-gray-900">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Create New {activeTab.slice(0, -1).replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {activeTab === 'suppliers' && (
              <SupplierCreateForm onSubmit={handleCreateSupplier} onCancel={() => setShowCreateModal(false)} />
            )}
            
            {activeTab === 'purchaseOrders' && (
              <PurchaseOrderCreateForm onSubmit={handleCreatePurchaseOrder} onCancel={() => setShowCreateModal(false)} />
            )}
            
            {activeTab === 'payments' && (
              <PaymentCreateForm onSubmit={handleCreatePayment} onCancel={() => setShowCreateModal(false)} />
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Edit {activeTab.slice(0, -1).replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {activeTab === 'suppliers' && (
              <SupplierEditForm 
                supplier={selectedItem}
                onSubmit={(updates) => handleUpdateSupplier(selectedItem.id, updates)} 
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }} 
              />
            )}
            
            {activeTab === 'purchaseOrders' && (
              <PurchaseOrderEditForm 
                order={selectedItem}
                onSubmit={(updates) => handleUpdatePurchaseOrder(selectedItem.id, updates)} 
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedItem(null);
                }} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FORM COMPONENTS ====================

const SupplierCreateForm = ({ onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    supplierName: '',
    tinNumber: '',
    address: '',
    emailAddress: '',
    phoneNumber: '',
    bankName: '',
    accountNumber: '',
    bankNumber: '',
    contactPerson: '',
    paymentTerms: '',
    creditLimit: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      creditLimit: parseFloat(formData.creditLimit.toString())
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name *
          </label>
          <input
            type="text"
            required
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            TIN Number *
          </label>
          <input
            type="text"
            required
            value={formData.tinNumber}
            onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person
          </label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Credit Limit (UGX)
          </label>
          <input
            type="number"
            value={formData.creditLimit}
            onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Supplier
        </button>
      </div>
    </form>
  );
};

const SupplierEditForm = ({ supplier, onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    supplierName: supplier.supplierName || '',
    address: supplier.address || '',
    emailAddress: supplier.emailAddress || '',
    phoneNumber: supplier.phoneNumber || '',
    contactPerson: supplier.contactPerson || '',
    paymentTerms: supplier.paymentTerms || '',
    creditLimit: supplier.creditLimit || 0,
    status: supplier.status || 'active',
    notes: supplier.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      creditLimit: parseFloat(formData.creditLimit.toString())
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name
          </label>
          <input
            type="text"
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.emailAddress}
            onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Update Supplier
        </button>
      </div>
    </form>
  );
};

const PurchaseOrderCreateForm = ({ onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    totalAmount: 0,
    expectedDeliveryDate: '',
    notes: '',
    priority: 'medium',
    items: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      totalAmount: parseFloat(formData.totalAmount.toString()),
      expectedDeliveryDate: new Date(formData.expectedDeliveryDate)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name *
          </label>
          <input
            type="text"
            required
            value={formData.supplierName}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount (UGX) *
          </label>
          <input
            type="number"
            required
            value={formData.totalAmount}
            onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Delivery Date *
          </label>
          <input
            type="date"
            required
            value={formData.expectedDeliveryDate}
            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Purchase Order
        </button>
      </div>
    </form>
  );
};

const PurchaseOrderEditForm = ({ order, onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    status: order.status || 'pending',
    totalAmount: order.totalAmount || 0,
    notes: order.notes || '',
    receivedDate: order.receivedDate ? order.receivedDate.toDate().toISOString().split('T')[0] : ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates = {
      ...formData,
      totalAmount: parseFloat(formData.totalAmount.toString())
    };
    
    if (formData.receivedDate) {
      updates.receivedDate = new Date(formData.receivedDate);
    }
    
    onSubmit(updates);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="received">Received</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Amount (UGX)
          </label>
          <input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Received Date
        </label>
        <input
          type="date"
          value={formData.receivedDate}
          onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Update Purchase Order
        </button>
      </div>
    </form>
  );
};

const PaymentCreateForm = ({ onSubmit, onCancel }: any) => {
  const [formData, setFormData] = useState({
    invoiceId: '',
    supplierId: '',
    amount: 0,
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount.toString())
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invoice ID *
          </label>
          <input
            type="text"
            required
            value={formData.invoiceId}
            onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (UGX) *
          </label>
          <input
            type="number"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method *
          </label>
          <select
            required
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reference Number
          </label>
          <input
            type="text"
            value={formData.referenceNumber}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Process Payment
        </button>
      </div>
    </form>
  );
}; 