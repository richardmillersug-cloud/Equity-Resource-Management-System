'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedInvoiceService, CreateInvoiceInput } from '../../../../../lib/firebase/enhanced-invoice';
import { enhancedSupplierService, EnhancedSupplier } from '../../../../../lib/firebase/enhanced-supplier';
import { authService } from '../../../../../lib/firebase/auth';
import { 
  Save, 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Truck,
  AlertTriangle,
  CreditCard,
  Hash
} from 'lucide-react';

interface FormData {
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  description: string;
  quantity: number;
  amount: number;
  fdn: string;
  goodsReceivedAsInvoiced: boolean;
  missingItems: string;
  missingReason: string;
  hasTransportPayment: boolean;
  transportAmount: number;
  hasDamages: boolean;
  damages: Array<{
    itemDescription: string;
    quantityDamaged: number;
    estimatedValue: number;
    damageReason: string;
  }>;
  amountInWords: string;
  amountInDigits: number;
  paymentPlan: Array<{
    installmentNumber: number;
    dueDate: string;
    amount: number;
    status: 'Pending' | 'Paid' | 'Overdue';
  }>;
  shippingAddress: string;
  shippingDate: string;
  dueDate: string;
  notes: string;
}

export default function AddInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [suppliers, setSuppliers] = useState<EnhancedSupplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [returnPath, setReturnPath] = useState('/dashboard/receiver/invoices');

  const [formData, setFormData] = useState<FormData>({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    description: '',
    quantity: 0,
    amount: 0,
    fdn: '',
    goodsReceivedAsInvoiced: true,
    missingItems: '',
    missingReason: '',
    hasTransportPayment: false,
    transportAmount: 0,
    hasDamages: false,
    damages: [],
    amountInWords: '',
    amountInDigits: 0,
    paymentPlan: [
      { installmentNumber: 1, dueDate: '', amount: 0, status: 'Pending' }
    ],
    shippingAddress: '',
    shippingDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    console.log('Invoice Add Page: Initializing...');
    
    // Check if user came from purchase manager
    const referrer = document.referrer;
    if (referrer.includes('/dashboard/purchase-manager/invoices')) {
      setReturnPath('/dashboard/purchase-manager/invoices');
    }
    
    // Test Firebase connection first
    testFirebaseConnection();
    
    loadSuppliers();
    generateInvoiceNumber();
    getUserRole();
  }, []);

  const testFirebaseConnection = async () => {
    try {
      console.log('Testing Firebase connection...');
      const { db } = await import('../../../../../lib/firebase/config');
      const { collection } = await import('firebase/firestore');
      
      console.log('Firebase DB instance:', db);
      console.log('Firebase DB type:', typeof db);
      
      // Test if we can access the suppliers collection using v9 SDK
      try {
        console.log('Testing suppliers collection access with v9 SDK...');
        const suppliersRef = collection(db, 'suppliers');
        console.log('Suppliers collection reference:', suppliersRef);
        console.log('Collection reference type:', typeof suppliersRef);
        console.log('Firebase connection test: SUCCESS');
      } catch (collectionError) {
        console.error('Collection access error:', collectionError);
      }
      
    } catch (error) {
      console.error('Firebase connection test: FAILED', error);
    }
  };

  const getUserRole = () => {
    const user = authService.getCurrentUser();
    if (user && user.employee && user.employee.roles && user.employee.roles.length > 0) {
      setUserRole(user.employee.roles[0].jobTitle);
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      console.log('=== Starting supplier loading process ===');
      
      // First, check if enhancedSupplierService exists
      if (!enhancedSupplierService) {
        console.error('Enhanced supplier service is not initialized');
        alert('Firebase service not initialized. Please refresh the page.');
        return;
      }
      
      console.log('Enhanced supplier service:', enhancedSupplierService);
      
      // Test the service methods
      try {
        console.log('Testing service.getAll() method...');
        const allSuppliers = await enhancedSupplierService.getAll();
        console.log(`Successfully loaded ${allSuppliers.length} suppliers from Firebase`);
        
        // Filter for active suppliers
        const activeSuppliers = allSuppliers.filter(supplier => supplier.status === 'Active');
        console.log(`Found ${activeSuppliers.length} active suppliers`);
        
        setSuppliers(activeSuppliers);
        
        // If no suppliers exist, create sample data
        if (allSuppliers.length === 0) {
          console.log('No suppliers found, creating sample suppliers...');
          try {
            const sampleIds = await enhancedSupplierService.createSampleSuppliers();
            console.log(`Created ${sampleIds.length} sample suppliers`);
            
            // Reload suppliers after creating samples
            const newSuppliers = await enhancedSupplierService.getAll();
            const newActiveSuppliers = newSuppliers.filter(supplier => supplier.status === 'Active');
            setSuppliers(newActiveSuppliers);
            console.log(`Loaded ${newActiveSuppliers.length} suppliers after sample creation`);
          } catch (sampleError) {
            console.error('Error creating sample suppliers:', sampleError);
            alert('Unable to create sample suppliers. Please contact administrator.');
          }
        }
        
      } catch (serviceError: any) {
        console.error('Service method error:', serviceError);
        
        // Try to diagnose the issue
        if (serviceError?.message?.includes('permission-denied')) {
          alert('Permission denied. Please check your Firebase security rules.');
        } else if (serviceError?.message?.includes('network')) {
          alert('Network error. Please check your internet connection.');
        } else if (serviceError?.message?.includes('not-found')) {
          alert('Database not found. Please verify your Firebase configuration.');
        } else {
          console.error('Full error details:', serviceError);
          alert(`Database error: ${serviceError?.message || 'Unknown error'}`);
        }
      }
      
    } catch (error) {
      console.error('=== Supplier loading failed ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to load suppliers. Please check the console for details and try refreshing the page.');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      // Get current date components
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      
      // Get timestamp for uniqueness
      const timestamp = now.getTime();
      const sequence = String(timestamp).slice(-4); // Last 4 digits of timestamp
      
      // Generate invoice number: INV-YYYY-MM-DD-XXXX
      const invoiceNumber = `INV-${year}-${month}-${day}-${sequence}`;
      
      setFormData(prev => ({
        ...prev,
        invoiceNumber: invoiceNumber
      }));
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to simple random number
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setFormData(prev => ({
        ...prev,
        invoiceNumber: `INV-${new Date().getFullYear()}-${random}`
      }));
    }
  };

  const convertNumberToWords = (amount: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    if (amount === 0) return 'ZERO SHILLINGS ONLY';

    const convertGroup = (num: number): string => {
      let result = '';
      
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' HUNDRED ';
        num %= 100;
      }
      
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      
      if (num > 0) {
        result += ones[num] + ' ';
      }
      
      return result;
    };

    let words = '';
    let scaleIndex = 0;
    
    while (amount > 0) {
      const group = amount % 1000;
      if (group !== 0) {
        const groupWords = convertGroup(group);
        words = groupWords + (scales[scaleIndex] ? scales[scaleIndex] + ' ' : '') + words;
      }
      amount = Math.floor(amount / 1000);
      scaleIndex++;
    }
    
    return words.trim() + ' SHILLINGS ONLY';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));

    if (name === 'amount') {
      const amount = Number(value);
      setFormData(prev => ({
        ...prev,
        amount,
        amountInWords: convertNumberToWords(amount),
        amountInDigits: amount
      }));
    }

    if (name === 'supplierId') {
      const supplier = suppliers.find(s => s.id === value);
      if (supplier) {
        setSelectedSupplier(supplier);
        setFormData(prev => ({
          ...prev,
          supplierName: supplier.supplierName,
          // Auto-fill shipping address with supplier address if not already filled
          shippingAddress: prev.shippingAddress || supplier.address || ''
        }));
      } else {
        setSelectedSupplier(null);
      }
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const addDamage = () => {
    setFormData(prev => ({
      ...prev,
      damages: [...prev.damages, {
        itemDescription: '',
        quantityDamaged: 0,
        estimatedValue: 0,
        damageReason: ''
      }]
    }));
  };

  const removeDamage = (index: number) => {
    const damage = formData.damages[index];
    if (!damage) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove this damage entry?\n\n` +
      `Item: ${damage.itemDescription}\n` +
      `Damaged Quantity: ${damage.quantityDamaged}\n` +
      `Estimated Value: ${damage.estimatedValue}`
    );

    if (!confirmed) return;

    setFormData(prev => ({
      ...prev,
      damages: prev.damages.filter((_, i) => i !== index)
    }));
  };

  const updateDamage = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      damages: prev.damages.map((damage, i) => 
        i === index ? { ...damage, [field]: value } : damage
      )
    }));
  };

  const addPaymentInstallment = () => {
    setFormData(prev => ({
      ...prev,
      paymentPlan: [...prev.paymentPlan, {
        installmentNumber: prev.paymentPlan.length + 1,
        dueDate: '',
        amount: 0,
        status: 'Pending'
      }]
    }));
  };

  const removePaymentInstallment = (index: number) => {
    const installment = formData.paymentPlan[index];
    if (!installment) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove this payment installment?\n\n` +
      `Installment #${installment.installmentNumber}\n` +
      `Amount: ${installment.amount}\n` +
      `Due Date: ${installment.dueDate}\n` +
      `Status: ${installment.status}`
    );

    if (!confirmed) return;

    setFormData(prev => ({
      ...prev,
      paymentPlan: prev.paymentPlan.filter((_, i) => i !== index)
    }));
  };

  const updatePaymentInstallment = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      paymentPlan: prev.paymentPlan.map((installment, i) => 
        i === index ? { ...installment, [field]: value } : installment
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.invoiceNumber.trim()) newErrors.invoiceNumber = 'Invoice number is required';
    if (!formData.supplierId) newErrors.supplierId = 'Supplier selection is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.quantity <= 0) newErrors.quantity = 'Quantity must be greater than 0';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (!formData.fdn.trim()) newErrors.fdn = 'FDN is required';

    if (!formData.goodsReceivedAsInvoiced && !formData.missingItems.trim()) {
      newErrors.missingItems = 'Please specify what items are missing';
    }

    if (!formData.goodsReceivedAsInvoiced && !formData.missingReason.trim()) {
      newErrors.missingReason = 'Please specify the reason for missing items';
    }

    if (formData.hasTransportPayment && formData.transportAmount <= 0) {
      newErrors.transportAmount = 'Transport amount must be greater than 0';
    }

    if (formData.hasDamages && formData.damages.length === 0) {
      newErrors.damages = 'Please add at least one damage entry';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create base invoice data with required fields
      const invoiceInput: CreateInvoiceInput = {
        invoiceNumber: formData.invoiceNumber,
        date: new Date(formData.date),
        supplierId: formData.supplierId,
        supplierName: formData.supplierName,
        description: formData.description,
        quantity: formData.quantity,
        amount: formData.amount,
        fdn: formData.fdn,
        status: 'Pending',
        goodsReceivedAsInvoiced: formData.goodsReceivedAsInvoiced,
        hasTransportPayment: formData.hasTransportPayment,
        hasDamages: formData.hasDamages,
        amountInWords: formData.amountInWords,
        amountInDigits: formData.amountInDigits,
        paymentPlan: userRole === 'Purchase Manager' ? formData.paymentPlan.map(plan => ({
          installmentNumber: plan.installmentNumber,
          dueDate: new Date(plan.dueDate),
          amount: plan.amount,
          status: plan.status
        })) : [{
          installmentNumber: 1,
          dueDate: new Date(),
          amount: formData.amount,
          status: 'Pending'
        }],
        employeeId: 'EMP001'
      };

      // Add optional fields only if they have values
      if (formData.missingItems && formData.missingItems.trim()) {
        invoiceInput.missingItems = formData.missingItems.trim();
      }

      if (formData.missingReason && formData.missingReason.trim()) {
        invoiceInput.missingReason = formData.missingReason.trim();
      }

      if (formData.hasTransportPayment && formData.transportAmount > 0) {
        invoiceInput.transportAmount = formData.transportAmount;
      }

      if (formData.hasDamages && formData.damages.length > 0) {
        invoiceInput.damages = formData.damages.map(damage => ({
          itemDescription: damage.itemDescription,
          quantityDamaged: damage.quantityDamaged,
          estimatedValue: damage.estimatedValue,
          damageReason: damage.damageReason,
          reportedBy: 'EMP001',
          status: 'Reported' as const
        }));
      }

      if (formData.shippingAddress && formData.shippingAddress.trim()) {
        invoiceInput.shippingAddress = formData.shippingAddress.trim();
      }

      if (formData.shippingDate) {
        invoiceInput.shippingDate = new Date(formData.shippingDate);
      }

      if (formData.dueDate) {
        invoiceInput.dueDate = new Date(formData.dueDate);
      }

      if (formData.notes && formData.notes.trim()) {
        invoiceInput.notes = formData.notes.trim();
      }

      console.log('Sending invoice data to Firebase:', invoiceInput);
      
      const invoiceId = await enhancedInvoiceService.createInvoice(invoiceInput);
      
      console.log('Invoice created successfully with ID:', invoiceId);
      
      setShowSuccess(true);
      
      setTimeout(() => {
        router.push(returnPath);
      }, 2000);
      
    } catch (error) {
      console.error('Detailed error creating invoice:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error creating invoice. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. Please check your Firebase security rules.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('invalid data') || error.message.includes('undefined')) {
          errorMessage = 'Invalid data detected. Please check all form fields and try again.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Database quota exceeded. Please try again later.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      alert(errorMessage);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Created Successfully!</h2>
          <p className="text-gray-600 mb-4">Invoice {formData.invoiceNumber} has been created.</p>
          <div className="text-sm text-gray-500">Redirecting to invoices list...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(returnPath)}
                className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Invoices</span>
              </button>
              <div>
                <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Add New Invoice</h1>
          </div>
                <p className="text-gray-600">Create a new invoice for received goods</p>
              </div>
            </div>
          </div>
        </div>



        {/* Error State */}
        {!loadingSuppliers && suppliers.length === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">⚠️ No suppliers found</p>
                <p className="text-xs text-red-600">Unable to load suppliers from Firebase database</p>
              </div>
              <button
                type="button"
                onClick={loadSuppliers}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition-colors"
              >
                Retry Loading
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingSuppliers && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <p className="text-sm text-blue-700">Loading suppliers from Firebase database...</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(System Generated)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={formData.invoiceNumber}
                      readOnly
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateInvoiceNumber}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
                {errors.invoiceNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.invoiceNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({suppliers.length} from database)
                  </span>
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleInputChange}
                      disabled={loadingSuppliers}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        errors.supplierId ? 'border-red-300' : 'border-gray-300'
                      } ${loadingSuppliers ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {loadingSuppliers ? 'Loading from database...' : 'Select supplier'}
                      </option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          🏭 {supplier.supplierName} - TIN: {supplier.tinNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Refresh suppliers button clicked');
                      loadSuppliers();
                    }}
                    disabled={loadingSuppliers}
                    className="px-2 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh suppliers list"
                  >
                    🔄
                  </button>
                </div>
                {errors.supplierId && (
                  <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
                )}
                {suppliers.length === 0 && !loadingSuppliers && (
                  <div className="mt-1">
                    <p className="text-sm text-yellow-600 mb-2">
                      No active suppliers found in database.
                    </p>
                    <button
                      type="button"
                      onClick={loadSuppliers}
                      className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                    >
                      Refresh Suppliers
                    </button>
                  </div>
                )}
              </div>

              {/* Supplier Information Display */}
              {selectedSupplier && (
                <div className="md:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Supplier Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">TIN Number:</span>
                        <span className="ml-2 text-gray-600">{selectedSupplier.tinNumber}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Registration Date:</span>
                        <span className="ml-2 text-gray-600">
                          {selectedSupplier.dateOfRegistration?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Address:</span>
                        <span className="ml-2 text-gray-600">{selectedSupplier.address}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          selectedSupplier.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedSupplier.status}
                        </span>
                      </div>
                      {selectedSupplier.phoneNumbers && selectedSupplier.phoneNumbers.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>
                          <span className="ml-2 text-gray-600">{selectedSupplier.phoneNumbers[0]}</span>
                        </div>
                      )}
                      {selectedSupplier.email && (
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>
                          <span className="ml-2 text-gray-600">{selectedSupplier.email}</span>
                        </div>
                      )}
                      {selectedSupplier.routeDays && selectedSupplier.routeDays.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Route Days:</span>
                          <div className="ml-2 inline-flex flex-wrap gap-1">
                            {selectedSupplier.routeDays.map((day, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                {day}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Bank Information */}
                      {selectedSupplier.bankAccounts && selectedSupplier.bankAccounts.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Primary Bank:</span>
                          <div className="ml-2 text-gray-600">
                            <span>{selectedSupplier.bankAccounts[0].bankName}</span>
                            <span className="mx-2">•</span>
                            <span>{selectedSupplier.bankAccounts[0].accountNumber}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Mobile Payment Information */}
                      {selectedSupplier.mobilePayments && selectedSupplier.mobilePayments.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-700">Mobile Payment:</span>
                          <div className="ml-2 text-gray-600">
                            <span>{selectedSupplier.mobilePayments[0].provider}</span>
                            <span className="mx-2">•</span>
                            <span>{selectedSupplier.mobilePayments[0].phoneNumber}</span>
                            {selectedSupplier.mobilePayments[0].merchantCode && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Code: {selectedSupplier.mobilePayments[0].merchantCode}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Additional Contact Person */}
                      {selectedSupplier.contactPerson && (
                        <div>
                          <span className="font-medium text-gray-700">Contact Person:</span>
                          <span className="ml-2 text-gray-600">{selectedSupplier.contactPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FDN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fdn"
                  value={formData.fdn}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.fdn ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.fdn && (
                  <p className="mt-1 text-sm text-red-600">{errors.fdn}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description of Goods <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.quantity ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (UGX) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Goods Verification */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Check className="w-5 h-5 mr-2 text-purple-600" />
              Goods Verification
            </h2>
            
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                name="goodsReceivedAsInvoiced"
                checked={formData.goodsReceivedAsInvoiced}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Goods received match the supplier invoice
              </label>
            </div>

            {!formData.goodsReceivedAsInvoiced && (
              <div className="space-y-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What items are missing? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="missingItems"
                    value={formData.missingItems}
                    onChange={handleInputChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.missingItems ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.missingItems && (
                    <p className="mt-1 text-sm text-red-600">{errors.missingItems}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for missing items <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="missingReason"
                    value={formData.missingReason}
                    onChange={handleInputChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.missingReason ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.missingReason && (
                    <p className="mt-1 text-sm text-red-600">{errors.missingReason}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transport Payment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-purple-600" />
              Transport Payment
            </h2>
            
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                name="hasTransportPayment"
                checked={formData.hasTransportPayment}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Transport payment required
              </label>
            </div>

            {formData.hasTransportPayment && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Amount (UGX) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="transportAmount"
                  value={formData.transportAmount}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.transportAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.transportAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.transportAmount}</p>
                )}
                <p className="mt-2 text-sm text-blue-600">
                  This amount will be recorded in the expenditure table.
                </p>
              </div>
            )}
          </div>

          {/* Damages */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-purple-600" />
              Damages
            </h2>
            
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                name="hasDamages"
                checked={formData.hasDamages}
                onChange={handleInputChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-sm font-medium text-gray-700">
                Damaged items found
              </label>
            </div>

            {formData.hasDamages && (
              <div className="space-y-4 bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Damage Reports</h3>
                  <button
                    type="button"
                    onClick={addDamage}
                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg flex items-center text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Damage
                  </button>
                </div>

                {formData.damages.map((damage, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Damage {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeDamage(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Item Description
                        </label>
                        <input
                          type="text"
                          value={damage.itemDescription}
                          onChange={(e) => updateDamage(index, 'itemDescription', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity Damaged
                        </label>
                        <input
                          type="number"
                          value={damage.quantityDamaged}
                          onChange={(e) => updateDamage(index, 'quantityDamaged', Number(e.target.value))}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Value (UGX)
                        </label>
                        <input
                          type="number"
                          value={damage.estimatedValue}
                          onChange={(e) => updateDamage(index, 'estimatedValue', Number(e.target.value))}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Damage Reason
                        </label>
                        <input
                          type="text"
                          value={damage.damageReason}
                          onChange={(e) => updateDamage(index, 'damageReason', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {errors.damages && (
                  <p className="text-sm text-red-600">{errors.damages}</p>
                )}
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
              Payment Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount in Words
                </label>
                <textarea
                  name="amountInWords"
                  value={formData.amountInWords}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount in Digits (UGX)
                </label>
                <input
                  type="number"
                  name="amountInDigits"
                  value={formData.amountInDigits}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Payment Plan - Available to all users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                Payment Plan
              </h2>
              <button
                type="button"
                onClick={addPaymentInstallment}
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Installment
              </button>
            </div>

            <div className="space-y-4">
              {formData.paymentPlan.map((installment, index) => {
                // Calculate running total up to this installment
                const runningTotal = formData.paymentPlan
                  .slice(0, index + 1)
                  .reduce((sum, inst) => sum + (inst.amount || 0), 0);
                
                // Calculate remaining balance after this installment
                const remainingBalance = Math.max(0, formData.amount - runningTotal);
                
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Installment {installment.installmentNumber}</h4>
                      {formData.paymentPlan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentInstallment(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={installment.dueDate}
                          onChange={(e) => updatePaymentInstallment(index, 'dueDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount (UGX)
                        </label>
                        <input
                          type="number"
                          value={installment.amount}
                          onChange={(e) => updatePaymentInstallment(index, 'amount', Number(e.target.value))}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Balance After Payment
                        </label>
                        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-mono">
                          {new Intl.NumberFormat('en-UG', {
                            style: 'currency',
                            currency: 'UGX',
                            minimumFractionDigits: 0
                          }).format(remainingBalance)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={installment.status}
                          onChange={(e) => updatePaymentInstallment(index, 'status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Plan Summary */}
            {formData.paymentPlan.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Payment Plan Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Total Invoice Amount:</span>
                    <div className="font-medium text-blue-900">
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(formData.amount)}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Total Planned Payments:</span>
                    <div className="font-medium text-blue-900">
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(formData.paymentPlan.reduce((sum, inst) => sum + (inst.amount || 0), 0))}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700">Difference:</span>
                    <div className={`font-medium ${
                      Math.abs(formData.amount - formData.paymentPlan.reduce((sum, inst) => sum + (inst.amount || 0), 0)) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('en-UG', {
                        style: 'currency',
                        currency: 'UGX',
                        minimumFractionDigits: 0
                      }).format(formData.amount - formData.paymentPlan.reduce((sum, inst) => sum + (inst.amount || 0), 0))}
                    </div>
                  </div>
                </div>
                {Math.abs(formData.amount - formData.paymentPlan.reduce((sum, inst) => sum + (inst.amount || 0), 0)) >= 0.01 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Warning: Payment plan total does not match invoice amount. Please adjust installment amounts.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Additional Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Address
                </label>
                <textarea
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Delivery address..."
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Date
                  </label>
                  <input
                    type="date"
                    name="shippingDate"
                    value={formData.shippingDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Additional notes or comments..."
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push(returnPath)}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 