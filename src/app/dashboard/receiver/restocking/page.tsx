'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, XCircle, CheckCircle, Clock, AlertTriangle, Calendar, Truck, BarChart3, Search, Filter } from 'lucide-react';
import { enhancedRestockingService, RestockingItem, RestockingStats } from '../../../../lib/firebase/enhanced-restocking';
import { EnhancedSupplierService } from '../../../../lib/firebase/enhanced-supplier';
import { authService } from '../../../../lib/firebase/auth';

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

  const supplierService = new EnhancedSupplierService();

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
      const suppliersData = await supplierService.getAllSuppliers();
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
      
      const itemToAdd = {
        ...newItem,
        expectedDate: new Date(newItem.expectedDate),
        receiverId: currentUser?.uid || '',
        status: 'pending' as const
      };

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
      alert('Failed to carry forward item. Please try again.');
    }
  };

  // Filter items based on status and search
  const filteredItems = restockingItems.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = !searchQuery.trim() || 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const categories = ['Electronics', 'Furniture', 'Stationery', 'Equipment', 'Supplies', 'Food', 'Clothing', 'Other'];
  const units = ['pcs', 'kg', 'lbs', 'boxes', 'cases', 'liters', 'meters', 'sets'];

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
                disabled={isRefreshing}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
      </div>
    </div>
  );
}

// Restocking Item Card Component
const RestockingItemCard = ({ item, onApprove, onCarryForward }: {
  item: RestockingItem;
  onApprove: (id: string, quantity: number) => void;
  onCarryForward: (id: string, newDate: string) => void;
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  
  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Item content will be implemented next */}
      </div>
      
      {/* Approve and Carry Forward modals will be implemented next */}
    </>
  );
};

// Add Item Modal Component  
const AddItemModal = ({ newItem, setNewItem, suppliers, categories, units, onSubmit, onClose, isSubmitting }: any) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {/* Modal content will be implemented next */}
    </div>
  );
}; 