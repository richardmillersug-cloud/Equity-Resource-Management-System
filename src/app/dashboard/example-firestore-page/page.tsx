'use client';

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import { authService } from '../../../lib/firebase/auth';
import { bulletproofServices } from '../../../lib/firebase/firestore-service-fixed';

// Define your data interface
interface ExampleData {
  id: string;
  name: string;
  description: string;
  amount: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export default function ExampleFirestorePage() {
  // State management
  const [data, setData] = useState<ExampleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ExampleData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: 0,
    status: 'active' as 'active' | 'inactive'
  });

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Load user and data on mount
  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  // Load current user
  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Failed to load user authentication');
    }
  };

  // Load data from Firestore
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Method 1: Load all data at once
      const allData = await bulletproofServices.expenses.getAll(); // Use appropriate service
      setData(allData);

      // Method 2: Subscribe to real-time updates (uncomment if needed)
      // const unsubscribe = bulletproofServices.expenses.subscribeToCollection(
      //   (newData) => {
      //     setData(newData);
      //   },
      //   (error) => {
      //     console.error('Subscription error:', error);
      //     setError('Failed to subscribe to data updates');
      //   }
      // );
      // return unsubscribe; // Return cleanup function

    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  // Create new item
  const handleCreate = async () => {
    if (!currentUser) {
      setError('User not authenticated');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const newItem = {
        ...formData,
        createdBy: currentUser.uid,
        // createdAt and updatedAt will be added automatically by the service
      };

      const id = await bulletproofServices.expenses.create(newItem);
      setSuccess('Item created successfully!');
      
      // Refresh data
      await loadData();
      
      // Reset form
      resetForm();

    } catch (error) {
      console.error('Failed to create item:', error);
      setError('Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  // Update existing item
  const handleUpdate = async () => {
    if (!editingItem || !currentUser) {
      setError('No item selected or user not authenticated');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await bulletproofServices.expenses.update(editingItem.id, {
        ...formData,
        // updatedAt will be added automatically
      });

      setSuccess('Item updated successfully!');
      
      // Refresh data
      await loadData();
      
      // Reset form
      resetForm();

    } catch (error) {
      console.error('Failed to update item:', error);
      setError('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      setError('');
      await bulletproofServices.expenses.delete(id);
      setSuccess('Item deleted successfully!');
      
      // Refresh data
      await loadData();

    } catch (error) {
      console.error('Failed to delete item:', error);
      setError('Failed to delete item');
    }
  };

  // Edit item
  const handleEdit = (item: ExampleData) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      amount: item.amount,
      status: item.status
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      amount: 0,
      status: 'active'
    });
    setEditingItem(null);
    setShowForm(false);
  };

  // Filter data based on search and status
  const filteredData = data.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Firestore Data Management
              </h1>
              <p className="text-gray-600 mt-2">Example page showing Firestore integration patterns</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Item
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Items ({filteredData.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.amount.toLocaleString()} UGX
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'Create New Item'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}