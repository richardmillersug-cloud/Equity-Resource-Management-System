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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Return Notes</h1>
                <p className="text-sm sm:text-base text-gray-600">Purchasing Manager - Returns & Restocking Overview</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={loadData}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 font-semibold text-sm sm:text-base transition-all duration-300 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Refresh Data</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>
          </div>
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total Returns</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalReturns}</p>
                </div>
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Returns</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pendingReturns}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Items Received</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.receivedItems}</p>
                </div>
                <PackageCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Need Restocking</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.itemsNeedingRestock}</p>
                </div>
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0 ml-2" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Return Value</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">UGX {(stats.totalValue || 0).toLocaleString()}</p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap sm:flex-nowrap space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Return Notes Overview</span>
                  <span className="sm:hidden">Overview</span>
                </button>
                <button
                  onClick={() => setActiveTab('returned')}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'returned'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Returned Items</span>
                  <span className="sm:hidden">Returned</span>
                </button>
                <button
                  onClick={() => setActiveTab('restocking')}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'restocking'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Restocking Required</span>
                  <span className="sm:hidden">Restocking</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by supplier, return note, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              {activeTab === 'overview' && (
                <div className="relative">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Return Notes Overview</h3>
                <p className="text-xs sm:text-sm text-gray-500">All return notes across all statuses</p>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return Note</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Supplier</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Return Date</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Total Value</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredReturnNotes.map((note) => (
                        <tr key={note.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center min-w-0">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mr-2 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {note.returnNoteNumber || note.id.slice(0, 8)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 md:hidden mt-1">{note?.supplierName || 'Unknown Supplier'}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden md:table-cell">
                            {note?.supplierName || 'Unknown Supplier'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                            {note.returnDate && note.returnDate.toDate ? note.returnDate.toDate().toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {(note?.items || []).length} items
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                            UGX {(note.totalValue || 0).toLocaleString()}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(note.status)}-100 text-${getStatusColor(note.status)}-800`}>
                              {getStatusLabel(note.status)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-xs truncate hidden lg:table-cell">
                            {note?.reason || 'No reason provided'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'returned' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Returned Items</h3>
                <p className="text-xs sm:text-sm text-gray-500">Items that have been physically returned to inventory</p>
              </div>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Return Note</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Supplier</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Return Date</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRestockingItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center min-w-0">
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.itemName}</span>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-purple-600 font-medium hidden md:table-cell">
                            {item.returnNoteNumber}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                            {item.supplierName}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                            {item.returnDate}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
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
            </div>
          )}

          {activeTab === 'restocking' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Items Requiring Restocking</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Returned items that need to be restocked in inventory</p>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredRestockingItems.map((item, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center min-w-0 flex-1">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mr-2 flex-shrink-0" />
                            <h4 className="text-sm font-medium text-gray-900 truncate">{item.itemName}</h4>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)} flex-shrink-0 ml-2`}>
                            {item.priority}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="font-medium">{item.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Return Note:</span>
                            <span className="font-medium text-purple-600 truncate ml-2">{item.returnNoteNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Supplier:</span>
                            <span className="font-medium truncate ml-2">{item.supplierName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Return Date:</span>
                            <span className="font-medium">{item.returnDate}</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button 
                            onClick={() => handleMarkAsRestocked(item.returnNoteId, item.itemName)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Mark as Restocked
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {filteredRestockingItems.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <PackageCheck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Items Need Restocking</h3>
                      <p className="text-xs sm:text-sm text-gray-500">All returned items have been processed or no items have been returned yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}