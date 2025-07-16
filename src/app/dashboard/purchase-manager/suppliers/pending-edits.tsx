'use client';


import React from 'react';
// import {
//   Clock,
//   CheckCircle,
//   XCircle,
//   Eye,
//   User,
//   Calendar,
//   Building2,
//   Phone,
//   Mail,
//   MapPin,
//   Edit,
//   AlertTriangle,
//   FileText,
//   ArrowRight,
//   Zap,
//   Filter,
//   Search,
// } from 'lucide-react';
import { enhancedSupplierService, EnhancedSupplier, PendingEdit } from '../../../../lib/firebase/enhanced-supplier';
import { authService } from '../../../../lib/firebase/auth';

interface PendingEditWithSupplier extends PendingEdit {
  supplier: EnhancedSupplier;
}

export default function PendingEditsManagement() {
  const [pendingEdits, setPendingEdits] = useState<PendingEditWithSupplier[]>([]);
  const [filteredEdits, setFilteredEdits] = useState<PendingEditWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdit, setSelectedEdit] = useState<PendingEditWithSupplier | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingEdits();
  }, []);

  useEffect(() => {
    filterEdits();
  }, [pendingEdits, searchTerm, filterStatus]);

  const loadPendingEdits = async () => {
    try {
      setLoading(true);
      const suppliersWithPendingEdits = await enhancedSupplierService.getSuppliersWithPendingEdits();
      
      const allPendingEdits: PendingEditWithSupplier[] = [];
      
      suppliersWithPendingEdits.forEach(supplier => {
        if (supplier.pendingEdits) {
          supplier.pendingEdits
            .filter(edit => edit.status === 'Pending')
            .forEach(edit => {
              allPendingEdits.push({
                ...edit,
                supplier
              });
            });
        }
      });

      // Sort by date (newest first)
      allPendingEdits.sort((a, b) => b.editedAt.toDate().getTime() - a.editedAt.toDate().getTime());
      
      setPendingEdits(allPendingEdits);
    } catch (error) {
      console.error('Error loading pending edits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEdits = () => {
    let filtered = pendingEdits;

    if (searchTerm) {
      filtered = filtered.filter(edit =>
        edit.supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        edit.supplier.tinNumber.includes(searchTerm) ||
        edit.editedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEdits(filtered);
  };

  const handleApproveEdit = async (edit: PendingEditWithSupplier) => {
    try {
      setProcessing(edit.id);
      const currentUser = authService.getCurrentUser();
      const approvedBy = currentUser?.uid || 'unknown';
      
      await enhancedSupplierService.approvePendingEdit(edit.supplierId, edit.id, approvedBy);
      await loadPendingEdits(); // Refresh the list
      setShowModal(false);
      
      alert('Edit approved successfully!');
    } catch (error) {
      console.error('Error approving edit:', error);
      alert('Failed to approve edit. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectEdit = async (edit: PendingEditWithSupplier, reason?: string) => {
    try {
      setProcessing(edit.id);
      const currentUser = authService.getCurrentUser();
      const approvedBy = currentUser?.uid || 'unknown';
      
      await enhancedSupplierService.rejectPendingEdit(edit.supplierId, edit.id, approvedBy, reason);
      await loadPendingEdits(); // Refresh the list
      setShowModal(false);
      
      alert('Edit rejected successfully!');
    } catch (error) {
      console.error('Error rejecting edit:', error);
      alert('Failed to reject edit. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const openEditModal = (edit: PendingEditWithSupplier) => {
    setSelectedEdit(edit);
    setShowModal(true);
  };

  const getChangesSummary = (changes: unknown) => {
    const changeCount = Object.keys(changes).length;
    const fields = Object.keys(changes);
    
    if (changeCount === 1) {
      return `Updated ${fields[0]}`;
    } else if (changeCount <= 3) {
      return `Updated ${fields.join(', ')}`;
    } else {
      return `Updated ${changeCount} fields`;
    }
  };

  const formatFieldName = (field: string) => {
    const fieldNames: { [key: string]: string } = {
      supplierName: 'Supplier Name',
      address: 'Address',
      emailAddress: 'Email Address',
      phoneNumbers: 'Phone Numbers',
      routeDays: 'Route Days',
      bankAccounts: 'Bank Accounts',
      mobilePayments: 'Mobile Payments'
    };
    return fieldNames[field] || field;
  };

  const renderFieldChange = (field: string, oldValue: unknown, newValue: unknown) => {
    if (field === 'phoneNumbers' && Array.isArray(newValue)) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Phone Numbers:</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium">Previous:</p>
            <p className="text-sm text-red-600">{Array.isArray(oldValue) ? oldValue.join(', ') : 'None'}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">New:</p>
            <p className="text-sm text-green-600">{newValue.join(', ')}</p>
          </div>
        </div>
      );
    }

    if (field === 'routeDays' && Array.isArray(newValue)) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Route Days:</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium">Previous:</p>
            <p className="text-sm text-red-600">{Array.isArray(oldValue) ? oldValue.join(', ') : 'None'}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">New:</p>
            <p className="text-sm text-green-600">{newValue.join(', ')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">{formatFieldName(field)}:</p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 font-medium">Previous:</p>
          <p className="text-sm text-red-600">{oldValue || 'None'}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700 font-medium">New:</p>
          <p className="text-sm text-green-600">{newValue}</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Pending Supplier Edits
                </h1>
                <p className="text-purple-100 text-lg">Review and approve supplier changes submitted by receivers</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">{filteredEdits.length} Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Pending</p>
                <p className="text-3xl font-bold text-purple-600">{pendingEdits.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">This Week</p>
                <p className="text-3xl font-bold text-blue-600">
                  {pendingEdits.filter(edit => {
                    const editDate = edit.editedAt.toDate();
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return editDate >= weekAgo;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Urgent</p>
                <p className="text-3xl font-bold text-red-600">
                  {pendingEdits.filter(edit => {
                    const editDate = edit.editedAt.toDate();
                    const threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                    return editDate <= threeDaysAgo;
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Suppliers</p>
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(pendingEdits.map(edit => edit.supplierId)).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by supplier name, TIN, or editor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Pending Edits Grid */}
        {filteredEdits.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border border-gray-100">
            <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'No pending edits match your search criteria.' 
                : 'There are no pending supplier edits to review.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEdits.map((edit) => {
              const isUrgent = edit.editedAt.toDate() <= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
              
              return (
                <div
                  key={edit.id}
                  className={`bg-white rounded-2xl p-6 shadow-lg border hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer ${
                    isUrgent ? 'border-red-200 bg-red-50' : 'border-gray-100'
                  }`}
                  onClick={() => openEditModal(edit)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isUrgent 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : 'bg-gradient-to-r from-orange-500 to-red-600'
                      }`}>
                        {isUrgent ? <Zap className="w-6 h-6 text-white" /> : <Edit className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                          {edit.supplier.supplierName}
                        </h3>
                        <p className="text-gray-500 text-sm">{edit.supplier.tinNumber}</p>
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
//   Urgent
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 text-sm">Edited by: {edit.editedBy}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 text-sm">
                        {edit.editedAt.toDate().toLocaleDateString()} at {edit.editedAt.toDate().toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 text-sm">{getChangesSummary(edit.changes)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {Object.keys(edit.changes).length} field{Object.keys(edit.changes).length !== 1 ? 's' : ''} changed
                    </span>
                    <button className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Eye className="w-4 h-4" />
//   Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Review Modal */}
        {showModal && selectedEdit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
              
              {/* Header */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-600"></div>
                <div className="relative p-6 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">Review Supplier Edit</h2>
                      <p className="text-orange-100">{selectedEdit.supplier.supplierName}</p>
                    </div>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-2 rounded-xl hover:bg-white/30 transition-all duration-300"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                
                {/* Edit Information */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Edited By</p>
                      <p className="font-medium text-gray-900">{selectedEdit.editedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Edit Date</p>
                      <p className="font-medium text-gray-900">
                        {selectedEdit.editedAt.toDate().toLocaleDateString()} at {selectedEdit.editedAt.toDate().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Changes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Proposed Changes</h3>
                  {Object.entries(selectedEdit.changes).map(([field, newValue]) => {
                    const currentValue = (selectedEdit.supplier as any)[field];
                    return (
                      <div key={field} className="bg-white border border-gray-200 rounded-2xl p-4">
                        {renderFieldChange(field, currentValue, newValue)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
//   Cancel
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Enter rejection reason (optional):');
                    handleRejectEdit(selectedEdit, reason || undefined);
                  }}
                  disabled={processing === selectedEdit.id}
                  className="px-6 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
//   Reject
                </button>
                <button
                  onClick={() => handleApproveEdit(selectedEdit)}
                  disabled={processing === selectedEdit.id}
                  className="px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
//   Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}