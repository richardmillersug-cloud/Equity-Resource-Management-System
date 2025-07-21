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
        try {
          if (!supplier.dateOfRegistration || typeof supplier.dateOfRegistration.toDate !== 'function') {
            return false;
          }
        const registrationDate = supplier.dateOfRegistration.toDate();
        const now = new Date();
        return registrationDate.getMonth() === now.getMonth() && 
               registrationDate.getFullYear() === now.getFullYear();
        } catch (error) {
          console.warn('Invalid date format for supplier:', supplier.id, error);
          return false;
        }
      }).length;
      
      setStats({ ...supplierStats, thisMonth });
      
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]); // Set empty array as fallback
      setStats({ total: 0, active: 0, pending: 0, inactive: 0, thisMonth: 0 }); // Set default stats
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
        (supplier.phoneNumbers && supplier.phoneNumbers.some(phone => phone && phone.includes(searchTerm)))
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
    router.push('/dashboard/receiver/suppliers/add');
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

      // Submit pending edit (using current user as EMP001 for demo)
      await enhancedSupplierService.submitPendingEdit(selectedSupplier.id, changes, 'EMP001');
      
      // Refresh supplier data
      await loadSuppliers();
      
      // Update selected supplier to show pending edit
      const updatedSupplier = await enhancedSupplierService.getById(selectedSupplier.id);
      if (updatedSupplier) {
        setSelectedSupplier(updatedSupplier);
      }
      
      setIsEditing(false);
      alert('Edit submitted for approval by purchasing manager!');
      
    } catch (error) {
      console.error('Error submitting pending edit:', error);
      alert('Error submitting edit. Please try again.');
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
        const phoneNumbers = (supplier.phoneNumbers || []).join('; ');
        const routeDays = supplier.routeDays ? supplier.routeDays.join(', ') : 'None';
        const bankAccounts = (supplier.bankAccounts || []).map(acc => 
          `${acc.bankName} (${acc.accountNumber})`
        ).join('; ') || 'None';
        const mobilePayments = (supplier.mobilePayments || []).map(payment => 
          `${payment.provider}: ${payment.merchantCode} (${payment.phoneNumber})`
        ).join('; ') || 'None';
        const pendingEdits = supplier.pendingEdits?.filter(edit => edit.status === 'Pending').length || 0;

        return [
          supplier.supplierName,
          supplier.tinNumber,
          supplier.dateOfRegistration?.toDate ? supplier.dateOfRegistration.toDate().toLocaleDateString() : 'N/A',
          supplier.address,
          phoneNumbers,
          supplier.emailAddress || 'N/A',
          routeDays,
          supplier.status,
          getEmployeeName(supplier.employeeId),
          bankAccounts,
          mobilePayments,
          supplier.createdAt?.toDate ? supplier.createdAt.toDate().toLocaleDateString() : 'N/A',
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
              .suppliers-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              .suppliers-table th {
                background: #7C3AED;
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .suppliers-table td {
                padding: 10px 8px;
                border-bottom: 1px solid #e5e7eb;
                font-size: 11px;
                vertical-align: top;
              }
              .suppliers-table tr:nth-child(even) {
                background: #f9fafb;
              }
              .suppliers-table tr:hover {
                background: #f3f4f6;
              }
              .supplier-name {
                font-weight: bold;
                color: #111827;
                font-size: 12px;
              }
              .supplier-status {
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
              }
              .status-active { background: #d1fae5; color: #065f46; }
              .status-pending { background: #fef3c7; color: #92400e; }
              .status-inactive { background: #f3f4f6; color: #374151; }
              .contact-info {
                line-height: 1.4;
              }
              .route-days {
                display: flex;
                flex-wrap: wrap;
                gap: 3px;
                margin-top: 2px;
              }
              .route-day {
                background: #ede9fe;
                color: #5b21b6;
                padding: 1px 4px;
                border-radius: 8px;
                font-size: 10px;
              }
              .pending-edit {
                background: #fed7aa;
                color: #9a3412;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 9px;
                margin-top: 3px;
                display: inline-block;
                border: 1px solid #f59e0b;
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
                .suppliers-table { break-inside: avoid; }
                .suppliers-table th { 
                  background: #7C3AED !important;
                  color: white !important;
                }
                .suppliers-table tr { break-inside: avoid; }
                .route-day {
                  background: #ede9fe !important;
                  color: #5b21b6 !important;
                }
                .supplier-status {
                  border: 1px solid !important;
                }
                .status-active { 
                  background: #d1fae5 !important; 
                  color: #065f46 !important;
                  border-color: #059669 !important;
                }
                .status-pending { 
                  background: #fef3c7 !important; 
                  color: #92400e !important;
                  border-color: #f59e0b !important;
                }
                .status-inactive { 
                  background: #f3f4f6 !important; 
                  color: #374151 !important;
                  border-color: #6b7280 !important;
                }
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

            <table class="suppliers-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Supplier Name</th>
                  <th style="width: 10%;">TIN Number</th>
                  <th style="width: 8%;">Status</th>
                  <th style="width: 20%;">Contact Information</th>
                  <th style="width: 18%;">Address</th>
                  <th style="width: 10%;">Registration Date</th>
                  <th style="width: 12%;">Route Days</th>
                  <th style="width: 7%;">Accounts</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSuppliers.map((supplier, index) => {
                const pendingEditsCount = supplier.pendingEdits?.filter(edit => edit.status === 'Pending').length || 0;
                const statusClass = `status-${supplier.status.toLowerCase()}`;
                
                return `
                    <tr>
                      <td>
                      <div class="supplier-name">${supplier.supplierName}</div>
                        <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                          Manager: ${getEmployeeName(supplier.employeeId)}
                    </div>
                        ${pendingEditsCount > 0 ? `
                          <div class="pending-edit" style="margin-top: 3px;">
                            ${pendingEditsCount} Pending Edit${pendingEditsCount > 1 ? 's' : ''}
                    </div>
                        ` : ''}
                      </td>
                      <td>
                        <strong>${supplier.tinNumber}</strong>
                      </td>
                      <td>
                        <span class="supplier-status ${statusClass}">${supplier.status}</span>
                      </td>
                      <td>
                        <div class="contact-info">
                          ${(supplier.phoneNumbers || []).length > 0 ? `
                            <div style="margin-bottom: 3px;">
                              📞 ${(supplier.phoneNumbers || []).slice(0, 2).join(', ')}
                              ${(supplier.phoneNumbers || []).length > 2 ? ` (+${(supplier.phoneNumbers || []).length - 2} more)` : ''}
                    </div>
                          ` : ''}
                    ${supplier.emailAddress ? `
                            <div style="margin-bottom: 3px;">
                              ✉️ ${supplier.emailAddress}
                      </div>
                    ` : ''}
                          ${supplier.mobilePayments && supplier.mobilePayments.length > 0 ? `
                            <div style="font-size: 10px; color: #6b7280;">
                              💳 ${supplier.mobilePayments.map(p => p.provider).join(', ')}
                    </div>
                          ` : ''}
                    </div>
                      </td>
                      <td>
                        <div style="line-height: 1.3;">${supplier.address}</div>
                      </td>
                      <td>
                        <div style="font-size: 11px;">
                          ${supplier.dateOfRegistration?.toDate ? supplier.dateOfRegistration.toDate().toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td>
                    ${supplier.routeDays && supplier.routeDays.length > 0 ? `
                        <div class="route-days">
                            ${supplier.routeDays.map(day => `<span class="route-day">${day.substring(0, 3)}</span>`).join('')}
                        </div>
                        ` : '<span style="color: #9ca3af; font-style: italic;">None</span>'}
                      </td>
                      <td>
                        <div style="text-align: center;">
                    ${supplier.bankAccounts && supplier.bankAccounts.length > 0 ? `
                            <div style="font-weight: bold; color: #059669;">
                              ${supplier.bankAccounts.length}
                      </div>
                            <div style="font-size: 9px; color: #6b7280;">Bank</div>
                    ` : ''}
                    ${supplier.mobilePayments && supplier.mobilePayments.length > 0 ? `
                            <div style="font-weight: bold; color: #7c3aed; margin-top: 2px;">
                              ${supplier.mobilePayments.length}
                      </div>
                            <div style="font-size: 9px; color: #6b7280;">Mobile</div>
                    ` : ''}
                          ${(!supplier.bankAccounts || supplier.bankAccounts.length === 0) && (!supplier.mobilePayments || supplier.mobilePayments.length === 0) ? `
                            <span style="color: #9ca3af; font-style: italic;">None</span>
                    ` : ''}
                  </div>
                      </td>
                    </tr>
                `;
              }).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Suppliers Management System - Receiver Dashboard</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mx-4 mt-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Suppliers Management
                </h1>
                <p className="text-purple-100 text-lg">Manage supplier information and relationships</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={loadSuppliers}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Clock className="w-5 h-5" />
                Refresh Data
              </button>
              <button
                onClick={handleAddSupplier}
                className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Add Supplier
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Suppliers</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.total}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">All suppliers</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
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
                <p className="text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">{stats.pending}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Awaiting approval</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">This Month</p>
                <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.thisMonth}</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">New registrations</span>
                </div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers by name, TIN, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button
                onClick={exportSuppliers}
                className="bg-purple-50 text-purple-600 px-4 py-3 rounded-2xl hover:bg-purple-100 transition-colors flex items-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={printSuppliers}
                className="bg-gray-50 text-gray-600 px-4 py-3 rounded-2xl hover:bg-gray-100 transition-colors flex items-center gap-2 font-medium"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{supplier.supplierName}</h3>
                  <p className="text-sm text-gray-500">TIN: {supplier.tinNumber}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(supplier.status)}`}>
                  {supplier.status}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="truncate">{supplier.address}</span>
                </div>
                
                {supplier.emailAddress && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{supplier.emailAddress}</span>
                  </div>
                )}
                
                {supplier.phoneNumbers && supplier.phoneNumbers.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{supplier.phoneNumbers[0]}</span>
                    {supplier.phoneNumbers.length > 1 && (
                      <span className="ml-1 text-xs text-gray-400">+{supplier.phoneNumbers.length - 1} more</span>
                    )}
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Registered: {supplier.dateOfRegistration?.toDate ? supplier.dateOfRegistration.toDate().toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewSupplier(supplier)}
                  className="flex-1 bg-purple-50 text-purple-600 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-center gap-1 text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleEditSupplier(supplier)}
                  className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md mx-auto">
              <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Suppliers Found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'All' 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Start by adding your first supplier'
                }
              </p>
              {!searchTerm && statusFilter === 'All' && (
                <button
                  onClick={handleAddSupplier}
                  className="bg-purple-600 text-white px-6 py-3 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Add First Supplier
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Supplier Details Modal */}
      {showSupplierModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedSupplier.supplierName}</h2>
                  <p className="text-purple-100">TIN: {selectedSupplier.tinNumber}</p>
                </div>
                <button
                  onClick={closeSupplierModal}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-purple-600" />
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
                        {selectedSupplier.dateOfRegistration?.toDate ? selectedSupplier.dateOfRegistration.toDate().toLocaleDateString() : 'N/A'}
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

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-purple-600" />
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
                         {selectedSupplier.phoneNumbers.map((phone, index) => (
                           <div key={index} className="flex items-center text-gray-900">
                             <Phone className="w-4 h-4 mr-2 text-gray-400" />
                             {phone}
                           </div>
                         ))}
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
                    <p className="text-gray-900">{selectedSupplier.createdAt.toDate().toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{selectedSupplier.updatedAt.toDate().toLocaleString()}</p>
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
                       <span>{submitPending ? 'Submitting...' : 'Submit for Approval'}</span>
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