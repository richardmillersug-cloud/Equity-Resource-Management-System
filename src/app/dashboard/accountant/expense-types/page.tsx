'use client';

import { useState, useEffect } from 'react';
import { ExpenseTypesService, ExpenseType } from '@/lib/firebase/expense-types';
import { SimpleExpenseTypesService } from '@/lib/firebase/expense-types-simple';
import { ExpenseTypeSeeder } from '@/lib/firebase/seed-expense-types';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Tag, 
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap,
  FileText,
  Database,
  RefreshCw,
  Receipt,
  X,
  Save,
  User,
  Building,
  Calendar,
  DollarSign,
  Grid3X3,
  List
} from 'lucide-react';

export default function ExpenseTypesPage() {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  
  // New type form states
  const [showNewTypeForm, setShowNewTypeForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    currency: 'UGX',
    requiresApproval: false,
    approvalLevel: 'manager' as 'manager' | 'director' | 'accountant' | 'auto',
    approvalThreshold: 0,
    allowedDepartments: [] as string[],
    restrictedRoles: [] as string[],
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'one-time',
    isRecurring: false,
    preferredVendors: [] as string[],
    requiresReceipt: true,
    tags: [] as string[],
    budgetCategory: ''
  });

  const expenseTypesService = new ExpenseTypesService();
  const simpleExpenseTypesService = new SimpleExpenseTypesService();
  const seeder = new ExpenseTypeSeeder();

  useEffect(() => {
    loadExpenseTypes();
  }, []);

  useEffect(() => {
    filterExpenseTypes();
  }, [expenseTypes, searchTerm, categoryFilter]);

  const loadExpenseTypes = async () => {
    try {
      setLoading(true);
      setError('');
      
      let types: ExpenseType[] = [];
      
      try {
        console.log('🔄 Trying to load expense types with composite index...');
        types = await expenseTypesService.getActiveExpenseTypes();
        console.log('✅ Successfully loaded expense types with regular service');
      } catch (indexError: any) {
        console.warn('⚠️ Composite index not available, using simple service:', indexError.message);
        
        if (indexError.message?.includes('requires an index') || indexError.code === 'failed-precondition') {
          try {
            console.log('🔄 Falling back to simple expense types service...');
            types = await simpleExpenseTypesService.getActiveExpenseTypesSimple();
            console.log('✅ Successfully loaded expense types with simple service');
            
            setError('Using simplified query - for better performance, please create the required Firestore index.');
          } catch (fallbackError: any) {
            console.error('❌ Fallback service also failed:', fallbackError);
            throw new Error('Both regular and fallback services failed: ' + fallbackError.message);
          }
        } else {
          throw indexError;
        }
      }
      
      setExpenseTypes(types);
      
    } catch (err: any) {
      console.error('❌ Error loading expense types:', err);
      setError('Failed to load expense types: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenseTypes = () => {
    let filtered = [...expenseTypes];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(type =>
        type.name.toLowerCase().includes(search) ||
        type.description.toLowerCase().includes(search) ||
        type.category.toLowerCase().includes(search) ||
        type.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(type => type.category === categoryFilter);
    }

    setFilteredTypes(filtered);
  };

  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      await seeder.seedExpenseTypes();
      await loadExpenseTypes();
    } catch (err: any) {
      setError('Failed to seed data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateExpenseType = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      setError('');

      // Validation
      if (!formData.name.trim() || !formData.description.trim() || !formData.category.trim()) {
        throw new Error('Name, description, and category are required');
      }

      if (formData.allowedDepartments.length === 0) {
        throw new Error('At least one department must be selected');
      }

      // Create expense type
      await expenseTypesService.createExpenseType({
        ...formData,
        isActive: true,
        createdBy: 'current-user', // TODO: Get from auth
        lastModifiedBy: 'current-user'
      });

      // Reset form and close modal
      resetForm();
      setShowNewTypeForm(false);
      await loadExpenseTypes();
      
    } catch (err: any) {
      setError('Failed to create expense type: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      currency: 'UGX',
      requiresApproval: false,
      approvalLevel: 'manager',
      approvalThreshold: 0,
      allowedDepartments: [],
      restrictedRoles: [],
      priority: 'medium',
      frequency: 'monthly',
      isRecurring: false,
      preferredVendors: [],
      requiresReceipt: true,
      tags: [],
      budgetCategory: ''
    });
  };

  const handleArrayInputChange = (field: 'allowedDepartments' | 'restrictedRoles' | 'preferredVendors' | 'tags', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getApprovalLevelColor = (level: string) => {
    switch (level) {
      case 'director': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'accountant': return 'bg-green-100 text-green-800';
      case 'auto': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };



  const categories = Array.from(new Set(expenseTypes.map(type => type.category)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Expense Types</p>
          <p className="text-sm text-gray-400">Fetching expense category data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-8 space-y-8">
        
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Expense Types Management
                  </h1>
                  <p className="text-blue-100 text-lg">Configure and manage standardized expense categories</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isSeeding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => window.location.href = '/dashboard/accountant/expenses/create'}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <Receipt className="w-5 h-5" />
                    <span>Create Expense</span>
                  </button>
                                     <button 
                     onClick={() => setShowNewTypeForm(true)}
                     className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                   >
                     <Plus className="w-5 h-5" />
                     <span>New Type</span>
                   </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Types</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{expenseTypes.length}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Active expense types</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Categories</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{categories.length}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Different categories</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Tag className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Require Approval</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {expenseTypes.filter(t => t.requiresApproval).length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Need approval</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">High Priority</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  {expenseTypes.filter(t => t.priority === 'critical' || t.priority === 'high').length}
                </p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Critical & high priority</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search expense types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {/* Display Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1">
                <button
                  onClick={() => setDisplayMode('grid')}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    displayMode === 'grid'
                      ? 'bg-white shadow-md text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setDisplayMode('list')}
                  className={`p-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${
                    displayMode === 'list'
                      ? 'bg-white shadow-md text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Types Grid */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              Expense Types ({(filteredTypes || []).length})
            </h2>
          </div>

          {!filteredTypes || filteredTypes.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Settings className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No expense types found</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {expenseTypes.length === 0 
                  ? "No expense types have been created yet. Click 'Seed Data' to add sample expense types."
                  : "No expense types match your current search criteria. Try adjusting your filters."
                }
              </p>
              {expenseTypes.length === 0 && (
                <button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium mx-auto"
                >
                  {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>{isSeeding ? 'Adding Sample Data...' : 'Add Sample Data'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-8">
              {/* Grid View */}
              {displayMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTypes.map((type) => (
                    <div key={type.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-1">
                            {type.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                              {type.category}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(type.priority)}`}>
                              {type.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Currency:</span>
                          <span className="font-medium">{type.currency}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Approval:</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApprovalLevelColor(type.approvalLevel)}`}>
                            {type.requiresApproval ? type.approvalLevel : 'None'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Departments:</span>
                          <span className="text-xs text-gray-800">{type.allowedDepartments.length} depts</span>
                        </div>
                        {type.accountingCode && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Code:</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{type.accountingCode}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {type.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        {type.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{type.tags.length - 3} more
                          </span>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Used: {type.usageCount || 0} times
                          </div>
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => window.location.href = `/dashboard/accountant/expenses/create?type=${type.id}`}
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Expense</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {displayMode === 'list' && (
                <div className="space-y-4">
                  {filteredTypes.map((type) => (
                    <div key={type.id} className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-6">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors mb-2">
                                {type.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                  {type.category}
                                </span>
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(type.priority)}`}>
                                  {type.priority}
                                </span>
                                {type.accountingCode && (
                                  <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-full">
                                    {type.accountingCode}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-8 text-sm">
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Currency</div>
                                <div className="font-medium">{type.currency}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Approval</div>
                                <div className="text-sm">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getApprovalLevelColor(type.approvalLevel)}`}>
                                    {type.requiresApproval ? type.approvalLevel : 'None'}
                                  </span>
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Usage</div>
                                <div className="font-medium">{type.usageCount || 0} times</div>
                              </div>
                              <div className="text-center">
                                <div className="text-gray-500 text-xs">Departments</div>
                                <div className="font-medium">{type.allowedDepartments.length} depts</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex flex-wrap gap-2">
                              {type.tags.slice(0, 4).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                              {type.tags.length > 4 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                  +{type.tags.length - 4} more
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <button className="text-blue-600 hover:text-blue-900 transition-colors p-2" title="Edit">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900 transition-colors p-2" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => window.location.href = `/dashboard/accountant/expenses/create?type=${type.id}`}
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Create Expense</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
                     )}
         </div>

         {/* New Expense Type Modal */}
         {showNewTypeForm && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
             <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
               {/* Modal Header */}
               <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                 <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                     <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                       <Plus className="w-4 h-4 text-white" />
                     </div>
                     Create New Expense Type
                   </h2>
                   <button
                     onClick={() => {
                       setShowNewTypeForm(false);
                       resetForm();
                     }}
                     className="text-gray-400 hover:text-gray-600 transition-colors"
                   >
                     <X className="w-6 h-6" />
                   </button>
                 </div>
               </div>

               {/* Modal Form */}
               <form onSubmit={handleCreateExpenseType} className="p-8 space-y-6">
                 {/* Basic Information */}
                 <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                   <FileText className="w-5 h-5" />
                   Basic Information
                 </h3>
                 
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                   <div className="flex items-start">
                     <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                       <Settings className="w-4 h-4 text-blue-600" />
                     </div>
                     <div>
                       <h4 className="text-sm font-semibold text-blue-800 mb-1">Auto-Generated Fields</h4>
                       <p className="text-sm text-blue-700">
                         • <strong>Unique ID:</strong> Automatically generated by the system<br/>
                         • <strong>Accounting Code:</strong> Auto-generated based on category (e.g., OPER-001, MKTG-002)
                       </p>
                     </div>
                   </div>
                 </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                       <input
                         type="text"
                         required
                         value={formData.name}
                         onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="e.g., Office Rent"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                       <input
                         type="text"
                         required
                         value={formData.category}
                         onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="e.g., Operations, Marketing"
                       />
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                     <textarea
                       required
                       rows={3}
                       value={formData.description}
                       onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                       className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       placeholder="Detailed description of the expense type..."
                     />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                       <input
                         type="text"
                         value={formData.subcategory}
                         onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="e.g., Facilities, Transportation"
                       />
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                       <select
                         value={formData.currency}
                         onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       >
                         <option value="UGX">UGX</option>
                         <option value="USD">USD</option>
                         <option value="EUR">EUR</option>
                       </select>
                     </div>
                   </div>
                 </div>

                 {/* Approval Settings */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                     <CheckCircle className="w-5 h-5" />
                     Approval Settings
                   </h3>
                   
                   <div className="flex items-center gap-3">
                     <input
                       type="checkbox"
                       id="requiresApproval"
                       checked={formData.requiresApproval}
                       onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                       className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                     />
                     <label htmlFor="requiresApproval" className="text-sm font-medium text-gray-700">
                       Requires Approval
                     </label>
                   </div>

                   {formData.requiresApproval && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Approval Level</label>
                         <select
                           value={formData.approvalLevel}
                           onChange={(e) => setFormData(prev => ({ ...prev, approvalLevel: e.target.value as any }))}
                           className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         >
                           <option value="manager">Manager</option>
                           <option value="director">Director</option>
                           <option value="accountant">Accountant</option>
                           <option value="auto">Auto-approve</option>
                         </select>
                       </div>
                       
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">Approval Threshold (UGX)</label>
                         <input
                           type="number"
                           min="0"
                           value={formData.approvalThreshold}
                           onChange={(e) => setFormData(prev => ({ ...prev, approvalThreshold: parseInt(e.target.value) || 0 }))}
                           className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="0"
                         />
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Classification */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                     <Tag className="w-5 h-5" />
                     Classification
                   </h3>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                       <select
                         value={formData.priority}
                         onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       >
                         <option value="low">Low</option>
                         <option value="medium">Medium</option>
                         <option value="high">High</option>
                         <option value="critical">Critical</option>
                       </select>
                     </div>
                     
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                       <select
                         value={formData.frequency}
                         onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       >
                         <option value="daily">Daily</option>
                         <option value="weekly">Weekly</option>
                         <option value="monthly">Monthly</option>
                         <option value="quarterly">Quarterly</option>
                         <option value="annual">Annual</option>
                         <option value="one-time">One-time</option>
                       </select>
                     </div>
                   </div>

                   <div className="flex items-center gap-3">
                     <input
                       type="checkbox"
                       id="isRecurring"
                       checked={formData.isRecurring}
                       onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                       className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                     />
                     <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
                       Recurring Expense
                     </label>
                   </div>

                   <div className="flex items-center gap-3">
                     <input
                       type="checkbox"
                       id="requiresReceipt"
                       checked={formData.requiresReceipt}
                       onChange={(e) => setFormData(prev => ({ ...prev, requiresReceipt: e.target.checked }))}
                       className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                     />
                     <label htmlFor="requiresReceipt" className="text-sm font-medium text-gray-700">
                       Requires Receipt
                     </label>
                   </div>
                 </div>

                 {/* Department Access */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                     <Building className="w-5 h-5" />
                     Department Access
                   </h3>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Departments * (comma-separated)</label>
                     <input
                       type="text"
                       required
                       value={formData.allowedDepartments.join(', ')}
                       onChange={(e) => handleArrayInputChange('allowedDepartments', e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       placeholder="e.g., Administration, Finance, Operations"
                     />
                   </div>
                 </div>

                 {/* Additional Fields */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                     <Settings className="w-5 h-5" />
                     Additional Information
                   </h3>
                   
                   <div className="grid grid-cols-1 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Budget Category</label>
                       <input
                         type="text"
                         value={formData.budgetCategory}
                         onChange={(e) => setFormData(prev => ({ ...prev, budgetCategory: e.target.value }))}
                         className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         placeholder="e.g., Operating Expenses"
                       />
                       <p className="text-sm text-gray-500 mt-1">
                         <span className="font-medium">Note:</span> Accounting code will be auto-generated based on category
                       </p>
                     </div>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                     <input
                       type="text"
                       value={formData.tags.join(', ')}
                       onChange={(e) => handleArrayInputChange('tags', e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       placeholder="e.g., rent, facilities, monthly"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Vendors (comma-separated)</label>
                     <input
                       type="text"
                       value={formData.preferredVendors.join(', ')}
                       onChange={(e) => handleArrayInputChange('preferredVendors', e.target.value)}
                       className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                       placeholder="e.g., Vendor 1, Vendor 2"
                     />
                   </div>
                 </div>

                 {/* Form Actions */}
                 <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                   <button
                     type="button"
                     onClick={() => {
                       setShowNewTypeForm(false);
                       resetForm();
                     }}
                     className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                   >
                     Cancel
                   </button>
                   
                   <button
                     type="submit"
                     disabled={formLoading}
                     className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 font-medium transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                   >
                     {formLoading ? (
                       <>
                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                         <span>Creating...</span>
                       </>
                     ) : (
                       <>
                         <Save className="w-4 h-4" />
                         <span>Create Expense Type</span>
                       </>
                     )}
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}
     </div>
   );
 }
