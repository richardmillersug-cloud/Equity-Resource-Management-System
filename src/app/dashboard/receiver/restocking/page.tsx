'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { EnhancedRestockingService } from '../../../../lib/firebase/enhanced-restocking';
import { EnhancedSupplierService } from '../../../../lib/firebase/enhanced-supplier';
import { Package, Plus, Search, RefreshCw, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Edit, Trash2, Download, FileText, FileSpreadsheet, File, Filter, AlertTriangle } from 'lucide-react';
import { authService } from '../../../../lib/firebase/auth';

interface RestockingItem {
  id: string;
  itemName: string;
  itemDescription?: string;
  category: string;
  supplierName?: string;
  expectedQuantity: number;
  receivedQuantity?: number;
  unit: string;
  expectedDate: any; // Firestore Timestamp
  receivedDate?: any; // Firestore Timestamp
  status: 'pending' | 'received' | 'partial' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  receiverId: string;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

interface RestockingStats {
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
}

const enhancedRestockingService = new EnhancedRestockingService();
const supplierService = new EnhancedSupplierService();

export default function RestockingPage() {
  // State variables
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [restockingItems, setRestockingItems] = useState<RestockingItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; }[]>([]);
  const [stats, setStats] = useState<RestockingStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RestockingItem | null>(null);
  const [editItem, setEditItem] = useState<any>({
    itemName: '',
    itemDescription: '',
    category: '',
    supplierName: '',
    expectedQuantity: 1,
    unit: 'pcs',
    expectedDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    notes: ''
  });

  // Add Item Form State
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemDescription: '',
    category: '',
    supplierName: '',
    expectedQuantity: 1,
    unit: 'pcs',
    expectedDate: new Date().toISOString().split('T')[0],
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: ''
  });

  useEffect(() => {
    loadCurrentUser();
    loadSuppliers();
    loadRestockingItems();
    loadStats();
  }, [selectedDate]);

  const loadCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getActiveSuppliers();
      console.log('Loaded suppliers from database:', suppliersData); // Debug log
      setSuppliers(suppliersData.map(supplier => ({
        id: supplier.id,
        name: supplier.supplierName
      })));
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadRestockingItems = async () => {
    try {
      const items = await enhancedRestockingService.getRestockingItemsByDate(selectedDate);
      setRestockingItems(items);
    } catch (error) {
      console.error('Error loading restocking items:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await enhancedRestockingService.getRestockingStats(selectedDate);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadRestockingItems(), loadStats()]);
    setIsRefreshing(false);
  };

  const handleAddItem = async () => {
    try {
      setIsSubmitting(true);
      
      // Generate the code value
      const itemToAdd = {
        ...newItem,
        expectedDate: new Date(newItem.expectedDate),
        receiverId: currentUser?.uid || '',
        status: 'pending' as const
      };

      console.log('Adding item with supplier data:', itemToAdd); // Debug log

      await enhancedRestockingService.addRestockingItem(itemToAdd);
      alert('Expected item added successfully!');
      
      // Reset form
      setNewItem({
        itemName: '',
        itemDescription: '',
        category: '',
        supplierName: '',
        expectedQuantity: 1,
        unit: 'pcs',
        expectedDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        notes: ''
      });
      
      setShowAddModal(false);
      loadRestockingItems();
      loadStats();
      
    } catch (error) {
      console.error('Error adding restocking item:', error);
      alert('Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveItem = async (itemId: string, receivedQuantity: number) => {
    try {
      await enhancedRestockingService.approveRestockingItem(
        itemId, 
        currentUser?.uid || '', 
        receivedQuantity
      );
      loadRestockingItems();
      loadStats();
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Failed to approve item. Please try again.');
    }
  };

  const handleCarryForward = async (itemId: string, newDate: string) => {
    try {
      await enhancedRestockingService.carryForwardItem(itemId, new Date(newDate));
      loadRestockingItems();
      loadStats();
    } catch (error) {
      console.error('Error carrying forward item:', error);
    }
  };

  const handleEditItem = (item: RestockingItem) => {
    setSelectedItem(item);
    setEditItem({
      itemName: item.itemName,
      itemDescription: item.itemDescription || '',
      category: item.category,
      supplierName: item.supplierName || '',
      expectedQuantity: item.expectedQuantity,
      unit: item.unit,
      expectedDate: item.expectedDate.toDate().toISOString().split('T')[0],
      priority: item.priority,
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;
    
    try {
      setIsSubmitting(true);
      
      const updates = {
        ...editItem,
        expectedDate: new Date(editItem.expectedDate)
      };

      await enhancedRestockingService.updateRestockingItem(selectedItem.id, updates);
      alert('Item updated successfully!');
      
      setShowEditModal(false);
      setSelectedItem(null);
      loadRestockingItems();
      loadStats();
      
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = (item: RestockingItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteItem = async () => {
    if (!selectedItem) return;
    
    try {
      await enhancedRestockingService.deleteRestockingItem(selectedItem.id);
      alert('Item deleted successfully!');
      
      setShowDeleteModal(false);
      setSelectedItem(null);
      loadRestockingItems();
      loadStats();
      
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const handleExportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const dataToExport = filteredItems.map(item => ({
        'Item Name': item.itemName,
        'Description': item.itemDescription || '',
        'Category': item.category,
        'Supplier': item.supplierName || '',
        'Expected Quantity': item.expectedQuantity,
        'Received Quantity': item.receivedQuantity || 0,
        'Unit': item.unit,
        'Expected Date': item.expectedDate.toDate().toLocaleDateString(),
        'Received Date': item.receivedDate ? item.receivedDate.toDate().toLocaleDateString() : '',
        'Status': item.status.toUpperCase(),
        'Priority': item.priority.toUpperCase(),
        'Notes': item.notes || ''
      }));

      if (format === 'csv') {
        downloadCSV(dataToExport, 'restocking-items');
      } else if (format === 'excel') {
        downloadExcel(dataToExport, 'restocking-items');
      } else if (format === 'pdf') {
        downloadPDF(dataToExport, 'restocking-items');
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const downloadExcel = (data: any[], filename: string) => {
    // Simple Excel-compatible format
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => row[header]).join('\t'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.xlsx`;
    link.click();
  };

  const downloadPDF = (data: any[], filename: string) => {
    // Create HTML content for PDF
    const htmlContent = `
      <html>
        <head>
          <title>Restocking Items Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status { font-weight: bold; }
            .pending { color: #f59e0b; }
            .received { color: #10b981; }
            .partial { color: #3b82f6; }
            .overdue { color: #ef4444; }
          </style>
        </head>
        <body>
          <h1>Restocking Items Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${Object.keys(row).map(key => `<td class="${key === 'Status' ? `status ${row[key].toLowerCase()}` : ''}">${row[key]}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Filter items based on search query
  const filteredItems = restockingItems.filter(item => {
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.itemDescription && item.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  const categories = ['Electronics', 'Furniture', 'Stationery', 'Equipment', 'Supplies', 'Food', 'Clothing', 'Other'];
  const units = ['pcs', 'kg', 'lbs', 'boxes', 'cases', 'liters', 'meters', 'sets'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="w-8 h-8 mr-3 text-blue-600" />
                Restocking Management
              </h1>
              <p className="text-gray-600 mt-2">
                Track expected deliveries and manage daily restocking activities
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              
              <button
                onClick={() => setShowExportModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Expected Item
              </button>
            </div>
          </div>
        </div>

        {/* Date Selector & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="received">Received</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Expected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalExpected}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Received</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.received}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Expected Items for {selectedDate}</h2>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredItems.length} of {restockingItems.length} items
              </p>
            )}
          </div>
          
          <div className="p-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-600 mb-4">No items match your search criteria</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No expected items for this date</h3>
                    <p className="text-gray-600 mb-4">Add expected items to track daily deliveries</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center mx-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Item
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <RestockingItemCard 
                    key={item.id} 
                    item={item} 
                    onApprove={handleApproveItem}
                    onCarryForward={handleCarryForward}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddModal && (
          <AddItemModal
            newItem={newItem}
            setNewItem={setNewItem}
            suppliers={suppliers}
            categories={categories}
            units={units}
            onSubmit={handleAddItem}
            onClose={() => setShowAddModal(false)}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Edit Modal */}
        {showEditModal && selectedItem && (
          <EditItemModal
            editItem={editItem}
            setEditItem={setEditItem}
            suppliers={suppliers}
            categories={categories}
            units={units}
            onSubmit={handleUpdateItem}
            onClose={() => {
              setShowEditModal(false);
              setSelectedItem(null);
            }}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "{selectedItem.itemName}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteItem}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
              <p className="text-gray-600 mb-6">Choose the format to export your restocking data:</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleExportData('csv')}
                  className="w-full bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-3 px-4 rounded-lg transition-colors flex items-center"
                >
                  <FileText className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">CSV Format</div>
                    <div className="text-sm text-green-600">Compatible with Excel, Google Sheets</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExportData('excel')}
                  className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-3 px-4 rounded-lg transition-colors flex items-center"
                >
                  <FileSpreadsheet className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Excel Format</div>
                    <div className="text-sm text-blue-600">Microsoft Excel compatible</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleExportData('pdf')}
                  className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-3 px-4 rounded-lg transition-colors flex items-center"
                >
                  <File className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">PDF Report</div>
                    <div className="text-sm text-red-600">Formatted report for printing</div>
                  </div>
                </button>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Restocking Item Card Component
const RestockingItemCard = ({ item, onApprove, onCarryForward, onEdit, onDelete }: {
  item: RestockingItem;
  onApprove: (id: string, quantity: number) => void;
  onCarryForward: (id: string, newDate: string) => void;
  onEdit: (item: RestockingItem) => void;
  onDelete: (item: RestockingItem) => void;
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [receivedQuantity, setReceivedQuantity] = useState(item.receivedQuantity || 0);
  const [carryForwardDate, setCarryForwardDate] = useState(new Date().toISOString().split('T')[0]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{item.itemName}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                {item.status.toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                {item.priority.toUpperCase()}
              </span>
            </div>
            
            {item.itemDescription && (
              <p className="text-sm text-gray-600 mb-2">{item.itemDescription}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Category:</span>
                <p className="text-gray-900">{item.category}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Expected Qty:</span>
                <p className="text-gray-900">{item.expectedQuantity} {item.unit}</p>
              </div>
              
              {item.receivedQuantity !== undefined && (
                <div>
                  <span className="font-medium text-gray-600">Received Qty:</span>
                  <p className="text-gray-900">{item.receivedQuantity} {item.unit}</p>
                </div>
              )}
              
              {item.supplierName && (
                <div>
                  <span className="font-medium text-gray-600">Supplier:</span>
                  <p className="text-gray-900">{item.supplierName}</p>
                </div>
              )}
            </div>

            {item.notes && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium text-gray-600">Notes:</span>
                <p className="text-gray-900 mt-1">{item.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Expected: {item.expectedDate.toDate().toLocaleDateString()}
            {item.receivedDate && (
              <span className="ml-2">
                | Received: {item.receivedDate.toDate().toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(item)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
            
            <button
              onClick={() => onDelete(item)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
            
            {item.status !== 'received' && (
              <button
                onClick={() => setShowApproveModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </button>
            )}
            
            {(item.status === 'pending' || item.status === 'overdue') && (
              <button
                onClick={() => setShowCarryForwardModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Carry Forward
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Item Receipt</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item: {item.itemName}
                </label>
                <p className="text-sm text-gray-600">Expected: {item.expectedQuantity} {item.unit}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={item.expectedQuantity * 2}
                  value={receivedQuantity}
                  onChange={(e) => setReceivedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onApprove(item.id, receivedQuantity);
                    setShowApproveModal(false);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Approve Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carry Forward Modal */}
      {showCarryForwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Carry Forward Item</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item: {item.itemName}
                </label>
                <p className="text-sm text-gray-600">Current Expected Date: {item.expectedDate.toDate().toLocaleDateString()}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Expected Date
                </label>
                <input
                  type="date"
                  value={carryForwardDate}
                  onChange={(e) => setCarryForwardDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowCarryForwardModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onCarryForward(item.id, carryForwardDate);
                    setShowCarryForwardModal(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Carry Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Add Item Modal Component  
const AddItemModal = ({ newItem, setNewItem, suppliers, categories, units, onSubmit, onClose, isSubmitting }: any) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Expected Item</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={newItem.itemName}
                onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={newItem.category}
                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Expected Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={newItem.expectedQuantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, expectedQuantity: parseInt(e.target.value) || 1 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quantity"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Expected Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Date *
              </label>
              <input
                type="date"
                required
                value={newItem.expectedDate}
                onChange={(e) => setNewItem(prev => ({ ...prev, expectedDate: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={newItem.priority}
                onChange={(e) => setNewItem(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <select
              value={newItem.supplierName}
              onChange={(e) => setNewItem(prev => ({ ...prev, supplierName: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select supplier (optional)</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
              ))}
            </select>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Description
            </label>
            <textarea
              value={newItem.itemDescription}
              onChange={(e) => setNewItem(prev => ({ ...prev, itemDescription: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter item description (optional)"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={newItem.notes}
              onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter any additional notes (optional)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newItem.itemName.trim() || !newItem.category}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expected Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Item Modal Component
const EditItemModal = ({ editItem, setEditItem, suppliers, categories, units, onSubmit, onClose, isSubmitting }: any) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Item</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={editItem.itemName}
                onChange={(e) => setEditItem(prev => ({ ...prev, itemName: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={editItem.category}
                onChange={(e) => setEditItem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Expected Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={editItem.expectedQuantity}
                onChange={(e) => setEditItem(prev => ({ ...prev, expectedQuantity: parseInt(e.target.value) || 1 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quantity"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                value={editItem.unit}
                onChange={(e) => setEditItem(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Expected Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Date *
              </label>
              <input
                type="date"
                required
                value={editItem.expectedDate}
                onChange={(e) => setEditItem(prev => ({ ...prev, expectedDate: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={editItem.priority}
                onChange={(e) => setEditItem(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <select
              value={editItem.supplierName}
              onChange={(e) => setEditItem(prev => ({ ...prev, supplierName: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select supplier (optional)</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
              ))}
            </select>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Description
            </label>
            <textarea
              value={editItem.itemDescription}
              onChange={(e) => setEditItem(prev => ({ ...prev, itemDescription: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter item description (optional)"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={editItem.notes}
              onChange={(e) => setEditItem(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter any additional notes (optional)"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !editItem.itemName.trim() || !editItem.category}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 