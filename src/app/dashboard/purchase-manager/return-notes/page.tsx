'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  RefreshCw, 
  Search, 
  Filter, 
  Eye, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Truck,
  ArrowRight,
  BarChart3,
  TrendingUp,
  AlertCircle,
  PackageCheck
} from 'lucide-react';
import { EnhancedReturnNoteService, ReturnNote, RETURN_STATUSES } from '../../../../lib/firebase/enhanced-return-note';

const returnNoteService = new EnhancedReturnNoteService();

interface RestockingItem {
  itemName: string;
  quantity: number;
  returnNoteId: string;
  returnNoteNumber: string;
  supplierName: string;
  returnDate: string;
  status: 'pending_restock' | 'restocked';
  priority: 'high' | 'medium' | 'low';
}

export default function PurchasingReturnNotesPage() {
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([]);
  const [restockingItems, setRestockingItems] = useState<RestockingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'returned' | 'restocking'>('overview');
  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    receivedItems: 0,
    itemsNeedingRestock: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReturnNotes(),
        loadRestockingItems()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnNotes = async () => {
    try {
      const notes = await returnNoteService.getReturnNotesForPurchasing();
      setReturnNotes(notes || []);
      
      // Get comprehensive stats with error handling
      try {
        const statsData = await returnNoteService.getPurchasingStats();
        setStats({
          totalReturns: statsData?.totalReturns || 0,
          pendingReturns: statsData?.pendingReturns || 0,
          receivedItems: statsData?.receivedItems || 0,
          itemsNeedingRestock: statsData?.itemsNeedingRestock || 0,
          totalValue: statsData?.totalReturnValue || 0
        });
      } catch (statsError) {
        console.error('Error loading stats:', statsError);
        // Set default stats if stats loading fails
        setStats({
          totalReturns: 0,
          pendingReturns: 0,
          receivedItems: 0,
          itemsNeedingRestock: 0,
          totalValue: 0
        });
      }
    } catch (error) {
      console.error('Error loading return notes:', error);
      setReturnNotes([]);
    }
  };

  const loadRestockingItems = async () => {
    try {
      const items = await returnNoteService.getItemsForRestocking();
      
      // Convert to the format expected by the component with safety checks
      const restockItems: RestockingItem[] = (items || []).map(item => ({
        itemName: item?.itemName || 'Unknown Item',
        quantity: item?.quantity || 0,
        returnNoteId: item?.returnNoteId || '',
        returnNoteNumber: item?.returnNoteNumber || 'N/A',
        supplierName: item?.supplierName || 'Unknown Supplier',
        returnDate: item?.returnDate && item.returnDate.toDate ? item.returnDate.toDate().toLocaleDateString() : 'N/A',
        status: item?.status || 'pending_restock',
        priority: item?.priority || 'medium'
      }));
      
      setRestockingItems(restockItems);
    } catch (error) {
      console.error('Error loading restocking items:', error);
      setRestockingItems([]);
    }
  };

  const filteredReturnNotes = returnNotes.filter(note => {
    const matchesSearch = (note?.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (note?.returnNoteNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (note?.reason || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || note?.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredRestockingItems = restockingItems.filter(item => 
    (item?.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item?.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item?.returnNoteNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status;
  };

  const handleMarkAsRestocked = async (returnNoteId: string, itemName: string) => {
    try {
      // Find the item index in the return note
      const returnNote = returnNotes.find(note => note.id === returnNoteId);
      if (!returnNote) return;
      
      const itemIndex = returnNote.items.findIndex(item => item.itemName === itemName);
      if (itemIndex === -1) return;
      
      await returnNoteService.markItemAsRestocked(returnNoteId, itemIndex);
      
      // Refresh data
      await loadData();
      
      // Show success message (you might want to add a toast notification here)
      console.log(`Marked ${itemName} as restocked`);
    } catch (error) {
      console.error('Error marking item as restocked:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading return notes and restocking data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Return Notes Management</h1>
              <p className="text-purple-100 text-lg">Purchasing Manager - Returns & Restocking Overview</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={loadData}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Returns</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReturns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Returns</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingReturns}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <PackageCheck className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Items Received</p>
                <p className="text-2xl font-bold text-gray-900">{stats.receivedItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Need Restocking</p>
                <p className="text-2xl font-bold text-gray-900">{stats.itemsNeedingRestock}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Return Value</p>
                <p className="text-2xl font-bold text-gray-900">UGX {(stats.totalValue || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Return Notes Overview
              </button>
              <button
                onClick={() => setActiveTab('returned')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'returned'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <PackageCheck className="w-5 h-5 inline mr-2" />
                Returned Items
              </button>
              <button
                onClick={() => setActiveTab('restocking')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'restocking'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5 inline mr-2" />
                Restocking Required
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by supplier, return note, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            {activeTab === 'overview' && (
              <div className="relative">
                <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Statuses</option>
                  {RETURN_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              onClick={loadData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Return Notes Overview</h3>
              <p className="text-sm text-gray-500">All return notes across all statuses</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Note</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturnNotes.map((note) => (
                    <tr key={note.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-purple-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {note.returnNoteNumber || note.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {note?.supplierName || 'Unknown Supplier'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {note.returnDate && note.returnDate.toDate ? note.returnDate.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(note?.items || []).length} items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        UGX {(note.totalValue || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(note.status)}-100 text-${getStatusColor(note.status)}-800`}>
                          {getStatusLabel(note.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {note?.reason || 'No reason provided'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'returned' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Returned Items</h3>
              <p className="text-sm text-gray-500">Items that have been physically returned to inventory</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Note</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRestockingItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                        {item.returnNoteNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.supplierName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.returnDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'restocking' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Items Requiring Restocking</h3>
                <p className="text-sm text-gray-500">Returned items that need to be restocked in inventory</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRestockingItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <Package className="w-6 h-6 text-blue-500 mr-2" />
                          <h4 className="text-sm font-medium text-gray-900 truncate">{item.itemName}</h4>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span className="font-medium">{item.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Return Note:</span>
                          <span className="font-medium text-purple-600">{item.returnNoteNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Supplier:</span>
                          <span className="font-medium">{item.supplierName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Return Date:</span>
                          <span className="font-medium">{item.returnDate}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button 
                          onClick={() => handleMarkAsRestocked(item.returnNoteId, item.itemName)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Restocked
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredRestockingItems.length === 0 && (
                  <div className="text-center py-12">
                    <PackageCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Need Restocking</h3>
                    <p className="text-gray-500">All returned items have been processed or no items have been returned yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}