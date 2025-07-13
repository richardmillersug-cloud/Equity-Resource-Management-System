'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedSupplierService, EnhancedSupplier } from '../../../../lib/firebase/enhanced-supplier';
import { initializeSuppliers } from '../../../../lib/firebase/seed-suppliers';
import { 
  Search, 
  Plus, 
  Edit, 
  Eye, 
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  CreditCard,
  User,
  AlertCircle,
  Smartphone,
  Clock,
  Trash2,
  Save,
  X,
  Printer
} from 'lucide-react';

interface SupplierStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  thisMonth: number;
}

// Helper function to get employee name (mock for now)
const getEmployeeName = (employeeId: string): string => {
  const employeeMap: { [key: string]: string } = {
    'EMP001': 'John Manager',
    'EMP002': 'Sarah Johnson', 
    'EMP003': 'Mike Wilson'
  };
  return employeeMap[employeeId] || 'Unknown Employee';
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<EnhancedSupplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<EnhancedSupplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [submitPending, setSubmitPending] = useState(false);
  const [stats, setStats] = useState<SupplierStats>({ total: 0, active: 0, pending: 0, inactive: 0, thisMonth: 0 });
  const router = useRouter();

  // Load suppliers from Firebase
  useEffect(() => {
    loadSuppliers();
  }, []);

  // Filter suppliers when search/filter changes
  useEffect(() => {
    filterSuppliers();
  }, [searchTerm, statusFilter, suppliers]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      
      // Initialize suppliers (create sample data if none exist)
      await initializeSuppliers();
      
      // Load all suppliers
      const allSuppliers = await enhancedSupplierService.getAll();
      setSuppliers(allSuppliers);
      
      // Load statistics
      const supplierStats = await enhancedSupplierService.getSupplierStats();
      
      // Calculate this month's registrations
      const thisMonth = allSuppliers.filter(supplier => {
        if (!supplier.dateOfRegistration) return false;
        const registrationDate = supplier.dateOfRegistration.toDate();
        const now = new Date();
        return registrationDate.getMonth() === now.getMonth() && 
               registrationDate.getFullYear() === now.getFullYear();
      }).length;
      
      setStats({ ...supplierStats, thisMonth });
      
    } catch (error) {
      console.error('Error loading suppliers:', error);
      alert('Error loading suppliers. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    let filtered = suppliers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        (supplier.supplierName && supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (supplier.tinNumber && supplier.tinNumber.includes(searchTerm)) ||
        (supplier.phoneNumbers && Array.isArray(supplier.phoneNumbers) && supplier.phoneNumbers.some(phone => phone && phone.includes(searchTerm)))
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'Active': 'bg-green-100 text-green-800 border-green-200',
      'Inactive': 'bg-gray-100 text-gray-800 border-gray-200',
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[status as keyof typeof colors] || colors.Pending;
  };

  const handleAddSupplier = () => {
    router.push('/dashboard/purchase-manager/suppliers/add');
  };

  const handleEditSupplier = (supplier: EnhancedSupplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(true);
    startEditing(supplier);
  };

  const handleViewSupplier = (supplier: EnhancedSupplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
    setSelectedSupplier(null);
    setIsEditing(false);
    setEditFormData({});
  };

  const startEditing = (supplier: EnhancedSupplier) => {
    setIsEditing(true);
    setEditFormData({
      supplierName: supplier.supplierName,
      address: supplier.address,
      emailAddress: supplier.emailAddress || '',
      phoneNumbers: [...supplier.phoneNumbers],
      routeDays: [...(supplier.routeDays || [])]
    });
  };

  const handleEditInputChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhoneNumberChange = (index: number, value: string) => {
    const updatedPhones = [...editFormData.phoneNumbers];
    updatedPhones[index] = value;
    setEditFormData((prev: any) => ({
      ...prev,
      phoneNumbers: updatedPhones
    }));
  };

  const addPhoneNumber = () => {
    setEditFormData((prev: any) => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, '']
    }));
  };

  const removePhoneNumber = (index: number) => {
    const updatedPhones = editFormData.phoneNumbers.filter((_: any, i: number) => i !== index);
    setEditFormData((prev: any) => ({
      ...prev,
      phoneNumbers: updatedPhones
    }));
  };

  const handleRouteDayChange = (day: string, checked: boolean) => {
    const updatedDays = checked
      ? [...editFormData.routeDays, day]
      : editFormData.routeDays.filter((d: string) => d !== day);
    
    setEditFormData((prev: any) => ({
      ...prev,
      routeDays: updatedDays
    }));
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) {
      return;
    }

    try {
      await enhancedSupplierService.delete(supplierId);
      await loadSuppliers();
      closeSupplierModal();
      alert('Supplier deleted successfully!');
      } catch (error) {
        console.error('Error deleting supplier:', error);
      alert('Error deleting supplier. Please try again.');
    }
  };

  const submitPendingEdit = async () => {
    if (!selectedSupplier) return;

    try {
      setSubmitPending(true);
      
      // Prepare changes
      const changes = {
        supplierName: editFormData.supplierName,
        address: editFormData.address,
        emailAddress: editFormData.emailAddress || undefined,
        phoneNumbers: editFormData.phoneNumbers.filter((phone: string) => phone.trim() !== ''),
        routeDays: editFormData.routeDays.length > 0 ? editFormData.routeDays : undefined
      };

      // Directly update supplier (purchasing managers have full edit permissions)
      await enhancedSupplierService.update(selectedSupplier.id, changes);
      
      // Refresh supplier data
      await loadSuppliers();
      
      // Update selected supplier to show changes
      const updatedSupplier = await enhancedSupplierService.getById(selectedSupplier.id);
      if (updatedSupplier) {
        setSelectedSupplier(updatedSupplier);
      }
      
      setIsEditing(false);
      alert('Supplier information updated successfully!');
      
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Error updating supplier. Please try again.');
    } finally {
      setSubmitPending(false);
    }
  };

  const exportSuppliers = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'Supplier Name',
        'TIN Number',
        'Registration Date',
        'Address',
        'Phone Numbers',
        'Email Address',
        'Route Days',
        'Status',
        'Managing Employee',
        'Bank Accounts',
        'Mobile Payments',
        'Created At',
        'Pending Edits'
      ];

      // Prepare CSV rows
      const csvRows = filteredSuppliers.map(supplier => {
        const phoneNumbers = supplier.phoneNumbers && Array.isArray(supplier.phoneNumbers) 
          ? supplier.phoneNumbers.join('; ') 
          : 'N/A';
        const routeDays = supplier.routeDays && Array.isArray(supplier.routeDays) 
          ? supplier.routeDays.join(', ') 
          : 'None';
        const bankAccounts = supplier.bankAccounts && Array.isArray(supplier.bankAccounts)
          ? supplier.bankAccounts.map(acc => 
              `${acc.bankName} (${acc.accountNumber})`
            ).join('; ') || 'None'
          : 'None';
        const mobilePayments = supplier.mobilePayments && Array.isArray(supplier.mobilePayments)
          ? supplier.mobilePayments.map(payment => 
              `${payment.provider}: ${payment.merchantCode} (${payment.phoneNumber})`
            ).join('; ') || 'None'
          : 'None';
        const pendingEdits = supplier.pendingEdits?.filter(edit => edit.status === 'Pending').length || 0;

        return [
          supplier.supplierName || 'N/A',
          supplier.tinNumber || 'N/A',
          supplier.dateOfRegistration 
            ? supplier.dateOfRegistration.toDate().toLocaleDateString() 
            : 'N/A',
          supplier.address || 'N/A',
          phoneNumbers,
          supplier.emailAddress || 'N/A',
          routeDays,
          supplier.status || 'N/A',
          getEmployeeName(supplier.employeeId),
          bankAccounts,
          mobilePayments,
          supplier.createdAt 
            ? supplier.createdAt.toDate().toLocaleDateString() 
            : 'N/A',
          pendingEdits > 0 ? `${pendingEdits} pending` : 'None'
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => 
          row.map(field => 
            // Escape commas and quotes in CSV fields
            typeof field === 'string' && (field.includes(',') || field.includes('"')) 
              ? `"${field.replace(/"/g, '""')}"` 
              : field
          ).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert(`Successfully exported ${filteredSuppliers.length} suppliers to CSV file!`);
    } catch (error) {
      console.error('Error exporting suppliers:', error);
      alert('Error exporting suppliers. Please try again.');
    }
  };

  const printSuppliers = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to enable printing');
        return;
      }

      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Suppliers Report - ${currentDate}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
                line-height: 1.4;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #7C3AED;
                padding-bottom: 20px;
              }
              .header h1 {
                color: #7C3AED;
                margin: 0;
                font-size: 28px;
              }
              .header p {
                margin: 5px 0;
                color: #666;
              }
              .stats {
                display: flex;
                justify-content: space-around;
                margin-bottom: 30px;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
              }
              .stat-item {
                text-align: center;
              }
              .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: #7C3AED;
              }
              .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
              }
              .supplier-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
              }
              .supplier-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                background: white;
                break-inside: avoid;
              }
              .supplier-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 10px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 10px;
              }
              .supplier-name {
                font-weight: bold;
                font-size: 16px;
                color: #111827;
              }
              .supplier-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
              }
              .status-active { background: #d1fae5; color: #065f46; }
              .status-pending { background: #fef3c7; color: #92400e; }
              .status-inactive { background: #f3f4f6; color: #374151; }
              .supplier-detail {
                margin: 5px 0;
                font-size: 12px;
              }
              .detail-label {
                font-weight: 500;
                color: #4b5563;
              }
              .route-days {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 4px;
              }
              .route-day {
                background: #ede9fe;
                color: #5b21b6;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
              }
              .pending-edit {
                background: #fed7aa;
                color: #9a3412;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
                margin-top: 5px;
                display: inline-block;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
              }
              @media print {
                body { margin: 0; }
                .supplier-card { break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Suppliers Report</h1>
              <p>Generated on ${currentDate} at ${currentTime}</p>
              <p>Total Suppliers: ${filteredSuppliers.length}</p>
            </div>

            <div class="stats">
              <div class="stat-item">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">Total</div>
          </div>
              <div class="stat-item">
                <div class="stat-number">${stats.active}</div>
                <div class="stat-label">Active</div>
        </div>
              <div class="stat-item">
                <div class="stat-number">${stats.pending}</div>
                <div class="stat-label">Pending</div>
      </div>
              <div class="stat-item">
                <div class="stat-number">${stats.inactive}</div>
                <div class="stat-label">Inactive</div>
              </div>
            </div>

            <div class="supplier-grid">
              ${filteredSuppliers.map(supplier => {
                const pendingEditsCount = supplier.pendingEdits?.filter(edit => edit.status === 'Pending').length || 0;
                const statusClass = `status-${supplier.status.toLowerCase()}`;
                
                return `
                  <div class="supplier-card">
                    <div class="supplier-header">
                      <div class="supplier-name">${supplier.supplierName}</div>
                      <span class="supplier-status ${statusClass}">${supplier.status}</span>
                    </div>
                    
                    <div class="supplier-detail">
                      <span class="detail-label">TIN:</span> ${supplier.tinNumber}
                    </div>
                    
                    <div class="supplier-detail">
                      <span class="detail-label">Address:</span> ${supplier.address}
                    </div>
                    
                    <div class="supplier-detail">
                      <span class="detail-label">Phone:</span> ${supplier.phoneNumbers.join(', ')}
                    </div>
                    
                    ${supplier.emailAddress ? `
                      <div class="supplier-detail">
                        <span class="detail-label">Email:</span> ${supplier.emailAddress}
                      </div>
                    ` : ''}
                    
                    <div class="supplier-detail">
                      <span class="detail-label">Registration:</span> ${supplier.dateOfRegistration 
                        ? supplier.dateOfRegistration.toDate().toLocaleDateString() 
                        : 'N/A'}
                    </div>
                    
                    <div class="supplier-detail">
                      <span class="detail-label">Manager:</span> ${getEmployeeName(supplier.employeeId)}
                    </div>
                    
                    ${supplier.routeDays && supplier.routeDays.length > 0 ? `
                      <div class="supplier-detail">
                        <span class="detail-label">Route Days:</span>
                        <div class="route-days">
                          ${supplier.routeDays.map(day => `<span class="route-day">${day}</span>`).join('')}
                        </div>
                      </div>
                    ` : ''}
                    
                    ${supplier.bankAccounts && supplier.bankAccounts.length > 0 ? `
                      <div class="supplier-detail">
                        <span class="detail-label">Bank Accounts:</span> ${supplier.bankAccounts.length} account(s)
                      </div>
                    ` : ''}
                    
                    ${supplier.mobilePayments && supplier.mobilePayments.length > 0 ? `
                      <div class="supplier-detail">
                        <span class="detail-label">Mobile Payments:</span> ${supplier.mobilePayments.map(p => p.provider).join(', ')}
                      </div>
                    ` : ''}
                    
                    ${pendingEditsCount > 0 ? `
                      <div class="pending-edit">
                        ${pendingEditsCount} Pending Edit${pendingEditsCount > 1 ? 's' : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="footer">
              <p>Suppliers Management System - Purchasing Manager Dashboard</p>
              <p>This report contains ${filteredSuppliers.length} suppliers based on current filters</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };

    } catch (error) {
      console.error('Error printing suppliers:', error);
      alert('Error generating print document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
          <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
              <div>
                                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                    Suppliers Management
                  </h1>
                  <p className="text-purple-100 text-lg">Manage your supplier relationships and information with modern tools</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/dashboard/purchase-manager/suppliers/pending')}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Pending Edits</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await initializeSuppliers();
                      await loadSuppliers();
                    } catch (error) {
                      console.error('Error seeding:', error);
                    }
                  }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition-all duration-300"
                >
                  Seed Data
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
              <span>Add Supplier</span>
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Suppliers</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">All registered</span>
              </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Building className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Active</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.active}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Currently active</span>
              </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stats.pending}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Awaiting approval</span>
              </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">This Month</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.thisMonth}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">New registrations</span>
              </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, TIN, or contact..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-gray-900"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
            </select>
              </div>

              <button 
                onClick={exportSuppliers}
                className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
              >
              <Download className="w-4 h-4" />
                <span>Export ({filteredSuppliers.length})</span>
              </button>

              <button 
                onClick={printSuppliers}
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg font-medium"
              >
                <Printer className="w-4 h-4" />
                <span>Print / PDF</span>
            </button>
            </div>
          </div>
        </div>

        {/* Modern Suppliers Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animation-delay-150"></div>
                </div>
                <span className="text-gray-600 font-medium">Loading suppliers...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Supplier Info
                      </div>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contact
                      </div>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Registration
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Route Days
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Manager
                    </div>
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSuppliers.map((supplier, index) => (
                                      <tr key={supplier.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 group border-l-4 border-transparent hover:border-purple-400">
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{supplier.supplierName}</span>
                          {supplier.pendingEdits?.some(edit => edit.status === 'Pending') && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Edit
                    </span>
                          )}
                  </div>
                        <div className="text-sm text-gray-500">TIN: {supplier.tinNumber}</div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {supplier.address}
                    </div>
                    </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {supplier.phoneNumbers?.slice(0, 2).map((phone, index) => (
                          <div key={index} className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {phone}
                    </div>
                        ))}
                        {supplier.phoneNumbers && supplier.phoneNumbers.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{supplier.phoneNumbers.length - 2} more
                  </div>
                        )}
                        {supplier.emailAddress && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="w-3 h-3 mr-1" />
                            {supplier.emailAddress}
                    </div>
                        )}
                    </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-3 h-3 mr-1" />
                        {supplier.dateOfRegistration 
                          ? supplier.dateOfRegistration.toDate().toLocaleDateString() 
                          : 'N/A'}
                  </div>
                    </td>
                    <td className="px-6 py-4">
                      {supplier.routeDays && supplier.routeDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {supplier.routeDays.map((day, index) => (
                            <span key={day} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {day}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No route days</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{getEmployeeName(supplier.employeeId)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(supplier.status)}`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                          onClick={() => handleViewSupplier(supplier)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                          title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                          title="Edit Supplier"
                        >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                          title="Delete Supplier"
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

          {!loading && filteredSuppliers.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Building className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No suppliers found</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'All' 
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for'
                  : 'Get started by adding your first supplier to begin managing your supply chain'
                }
              </p>
              {!searchTerm && statusFilter === 'All' && (
                <button
                  onClick={handleAddSupplier}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  Add First Supplier
                </button>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Modern Supplier Details Modal */}
      {showSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* Modern Modal Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700"></div>
              <div className="relative px-8 py-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedSupplier.supplierName}</h2>
                    <p className="text-purple-100 flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      TIN: {selectedSupplier.tinNumber}
                    </p>
                  </div>
                  <button
                    onClick={closeSupplierModal}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-2 rounded-xl hover:bg-white/30 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
                </div>

            {/* Modern Modal Content */}
            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Enhanced Information Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                      <Building className="w-4 h-4 text-white" />
                    </div>
                    Basic Information
                  </h3>
                                     <div className="space-y-3">
                  <div>
                       <label className="text-sm font-medium text-gray-500">Supplier Name</label>
                       {isEditing ? (
                         <input
                           type="text"
                           value={editFormData.supplierName || ''}
                           onChange={(e) => handleEditInputChange('supplierName', e.target.value)}
                           className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         />
                       ) : (
                         <p className="text-gray-900">{selectedSupplier.supplierName}</p>
                       )}
                      </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">TIN Number</label>
                      <p className="text-gray-900">{selectedSupplier.tinNumber}</p>
                      </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registration Date</label>
                      <p className="text-gray-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {selectedSupplier.dateOfRegistration 
                          ? selectedSupplier.dateOfRegistration.toDate().toLocaleDateString()
                          : 'N/A'}
                      </p>
                      </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedSupplier.status)}`}>
                        {selectedSupplier.status}
                        </span>
                      </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Managing Employee</label>
                      <p className="text-gray-900">{getEmployeeName(selectedSupplier.employeeId)}</p>
                      </div>
                    </div>
                  </div>
                  
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    Address & Location
                  </h3>
                  <div className="space-y-3">
                  <div>
                       <label className="text-sm font-medium text-gray-500">Address</label>
                       {isEditing ? (
                         <textarea
                           value={editFormData.address || ''}
                           onChange={(e) => handleEditInputChange('address', e.target.value)}
                           rows={3}
                           className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                         />
                       ) : (
                         <p className="text-gray-900">{selectedSupplier.address}</p>
                       )}
                        </div>
                                         <div>
                       <label className="text-sm font-medium text-gray-500">Route Days</label>
                       {isEditing ? (
                         <div className="mt-2">
                           <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                             {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                               <label key={day} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-purple-50 transition-colors">
                                 <input
                                   type="checkbox"
                                   checked={editFormData.routeDays?.includes(day) || false}
                                   onChange={(e) => handleRouteDayChange(day, e.target.checked)}
                                   className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                 />
                                 <span className="text-sm text-gray-700">{day}</span>
                               </label>
                             ))}
                      </div>
                      </div>
                       ) : (
                         <div className="flex flex-wrap gap-1 mt-1">
                           {selectedSupplier.routeDays && selectedSupplier.routeDays.length > 0 ? (
                             selectedSupplier.routeDays.map((day) => (
                               <span key={day} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                 {day}
                               </span>
                             ))
                           ) : (
                             <span className="text-sm text-gray-400 italic">No route days set</span>
                           )}
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-purple-600" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                     <label className="text-sm font-medium text-gray-500 block mb-2">Phone Numbers</label>
                     {isEditing ? (
                       <div className="space-y-2">
                         {editFormData.phoneNumbers?.map((phone: string, index: number) => (
                           <div key={index} className="flex items-center space-x-2">
                             <div className="flex-1 relative">
                               <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                               <input
                                 type="tel"
                                 value={phone}
                                 onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                 placeholder="+1234567890"
                               />
                      </div>
                             {editFormData.phoneNumbers.length > 1 && (
                               <button
                                 type="button"
                                 onClick={() => removePhoneNumber(index)}
                                 className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                         ))}
                         <button
                           type="button"
                           onClick={addPhoneNumber}
                           className="text-purple-600 hover:text-purple-700 flex items-center text-sm"
                         >
                           <Plus className="w-4 h-4 mr-1" />
                           Add Phone
                         </button>
                       </div>
                     ) : (
                       <div className="space-y-2">
                         {selectedSupplier.phoneNumbers && selectedSupplier.phoneNumbers.length > 0 ? (
                           selectedSupplier.phoneNumbers.map((phone, index) => (
                             <div key={index} className="flex items-center text-gray-900">
                               <Phone className="w-4 h-4 mr-2 text-gray-400" />
                               {phone}
                             </div>
                           ))
                         ) : (
                           <div className="flex items-center text-gray-500">
                             <Phone className="w-4 h-4 mr-2" />
                             No phone numbers provided
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                        <div>
                     <label className="text-sm font-medium text-gray-500 block mb-2">Email Address</label>
                     {isEditing ? (
                       <div className="relative">
                         <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                         <input
                           type="email"
                           value={editFormData.emailAddress || ''}
                           onChange={(e) => handleEditInputChange('emailAddress', e.target.value)}
                           className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                           placeholder="supplier@example.com"
                         />
                       </div>
                     ) : (
                       <div className="flex items-center text-gray-900">
                         <Mail className="w-4 h-4 mr-2 text-gray-400" />
                         {selectedSupplier.emailAddress || 'No email provided'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              {/* Payment Information */}
              <div className="space-y-4">
                {/* Bank Accounts */}
                {selectedSupplier.bankAccounts && selectedSupplier.bankAccounts.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                      Bank Accounts
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedSupplier.bankAccounts.map((account, index) => (
                        <div key={account.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Bank Account {index + 1}</h4>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-gray-500">Bank:</span> {account.bankName}</div>
                            <div><span className="text-gray-500">Account:</span> {account.accountNumber}</div>
                            <div><span className="text-gray-500">Bank Code:</span> {account.bankNumber}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Payments */}
                {selectedSupplier.mobilePayments && selectedSupplier.mobilePayments.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Smartphone className="w-5 h-5 mr-2 text-purple-600" />
                      Mobile Payments
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedSupplier.mobilePayments.map((payment, index) => (
                        <div key={payment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.provider === 'MTN' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.provider}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div><span className="text-gray-500">Merchant Code:</span> {payment.merchantCode}</div>
                            <div><span className="text-gray-500">Phone:</span> {payment.phoneNumber}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Record Information
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Created At</label>
                    <p className="text-gray-900">{selectedSupplier.createdAt 
                      ? selectedSupplier.createdAt.toDate().toLocaleString()
                      : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{selectedSupplier.updatedAt 
                      ? selectedSupplier.updatedAt.toDate().toLocaleString()
                      : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

                         {/* Modal Footer */}
             <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex justify-between items-center">
               {/* Pending Edits Info */}
               <div className="flex items-center space-x-2">
                 {selectedSupplier.pendingEdits?.some(edit => edit.status === 'Pending') && (
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                     <Clock className="w-4 h-4 mr-1" />
                     {selectedSupplier.pendingEdits.filter(edit => edit.status === 'Pending').length} Pending Edit(s)
                   </span>
                 )}
               </div>

               {/* Action Buttons */}
               <div className="flex space-x-3">
                 {isEditing ? (
                   <>
                  <button
                       onClick={() => setIsEditing(false)}
                       className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors flex items-center space-x-2"
                     >
                       <X className="w-4 h-4" />
                       <span>Cancel</span>
                     </button>
                     <button
                       onClick={submitPendingEdit}
                       disabled={submitPending}
                       className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                     >
                       <Save className="w-4 h-4" />
                       <span>{submitPending ? 'Updating...' : 'Update Supplier'}</span>
                     </button>
                   </>
                 ) : (
                   <>
                     <button
                       onClick={closeSupplierModal}
                       className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                    <button
                       onClick={() => handleDeleteSupplier(selectedSupplier.id)}
                       className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                     >
                       <Trash2 className="w-4 h-4" />
                       <span>Delete</span>
                    </button>
                    <button
                       onClick={() => startEditing(selectedSupplier)}
                       className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                     >
                       <Edit className="w-4 h-4" />
                       <span>Edit Supplier</span>
                    </button>
                   </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
} 