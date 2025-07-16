'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enhancedSupplierService, CreateSupplierInput } from '../../../../../lib/firebase/enhanced-supplier';
import { 
  Save, 
  ArrowLeft, 
  Building, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  CreditCard,
  Hash,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Smartphone
} from 'lucide-react';

interface BankAccount {
  id: string;
  BankName: string;
  AccountNumber: string;
  BankNumber: string;
}

interface MobilePayment {
  id: string;
  provider: 'MTN' | 'Airtel';
  merchantCode: string;
  phoneNumber: string;
}

interface SupplierFormData {
  SupplierName: string;
  TinNumber: string;
  DateOfRegistration: string;
  Address: string;
  EmailAddress: string;
  PhoneNumbers: string[];
  BankAccounts: BankAccount[];
  MobilePayments: MobilePayment[];
  EmployeeID: string;
  RouteDays: string[];
}

interface FormErrors {
  [key: string]: string;
}

export default function AddSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<SupplierFormData>({
    SupplierName: '',
    TinNumber: '',
    DateOfRegistration: new Date().toISOString().split('T')[0],
    Address: '',
    EmailAddress: '',
    PhoneNumbers: [''],
    BankAccounts: [],
    MobilePayments: [],
    EmployeeID: '',
    RouteDays: []
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.SupplierName.trim()) {
      newErrors.SupplierName = 'Supplier name is required';
    }

    if (!formData.TinNumber.trim()) {
      newErrors.TinNumber = 'TIN number is required';
    } else if (!/^\d{9,15}$/.test(formData.TinNumber)) {
      newErrors.TinNumber = 'TIN number must be 9-15 digits';
    }

    if (!formData.DateOfRegistration) {
      newErrors.DateOfRegistration = 'Registration date is required';
    }

    if (!formData.Address.trim()) {
      newErrors.Address = 'Address is required';
    }

    if (!formData.PhoneNumbers[0] || !formData.PhoneNumbers[0].trim()) {
      newErrors.PhoneNumbers = 'At least one phone number is required';
    } else {
      // Validate all phone numbers
      const invalidPhones = formData.PhoneNumbers.filter((phone, index) => 
        phone.trim() && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phone)
      );
      if (invalidPhones.length > 0) {
        newErrors.PhoneNumbers = 'Please enter valid phone numbers';
      }
    }

    if (!formData.EmployeeID.trim()) {
      newErrors.EmployeeID = 'Managing employee is required';
    }

    // Optional fields validation (if provided)
    if (formData.EmailAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.EmailAddress)) {
      newErrors.EmailAddress = 'Please enter a valid email address';
    }

    // Validate bank accounts
    formData.BankAccounts.forEach((account, index) => {
      if (account.BankName && !account.AccountNumber) {
        newErrors[`BankAccounts_${index}_AccountNumber`] = 'Account number is required when bank name is provided';
      }
      if (account.AccountNumber && account.AccountNumber.length < 8) {
        newErrors[`BankAccounts_${index}_AccountNumber`] = 'Account number must be at least 8 digits';
      }
      if (account.BankNumber && account.BankNumber.length < 3) {
        newErrors[`BankAccounts_${index}_BankNumber`] = 'Bank number must be at least 3 digits';
      }
    });

    // Validate mobile payments
    formData.MobilePayments.forEach((payment, index) => {
      if (!payment.merchantCode.trim()) {
        newErrors[`MobilePayments_${index}_merchantCode`] = 'Merchant code is required';
      }
      if (!payment.phoneNumber.trim()) {
        newErrors[`MobilePayments_${index}_phoneNumber`] = 'Phone number is required';
      } else if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(payment.phoneNumber)) {
        newErrors[`MobilePayments_${index}_phoneNumber`] = 'Please enter a valid phone number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for Firebase
      const supplierInput: CreateSupplierInput = {
        supplierName: formData.SupplierName,
        tinNumber: formData.TinNumber,
        dateOfRegistration: new Date(formData.DateOfRegistration),
        address: formData.Address,
        emailAddress: formData.EmailAddress || undefined,
        phoneNumbers: formData.PhoneNumbers.filter(phone => phone.trim() !== ''),
        bankAccounts: formData.BankAccounts.map(account => ({
          bankName: account.BankName,
          accountNumber: account.AccountNumber,
          bankNumber: account.BankNumber
        })),
        mobilePayments: formData.MobilePayments.map(payment => ({
          provider: payment.provider,
          merchantCode: payment.merchantCode,
          phoneNumber: payment.phoneNumber
        })),
        employeeId: formData.EmployeeID,
        routeDays: formData.RouteDays.length > 0 ? formData.RouteDays : undefined
      };

      // Create supplier in Firebase
      const supplierId = await enhancedSupplierService.createSupplier(supplierInput);
      
      console.log('Supplier created successfully with ID:', supplierId);
      
      // Show success message
      setShowSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard/purchase-manager/suppliers');
      }, 2000);

    } catch (error) {
      console.error('Error creating supplier:', error);
      // Handle error - show error message
      alert('Error creating supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/purchase-manager/suppliers');
  };

  // Helper functions for dynamic arrays
  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      PhoneNumbers: [...prev.PhoneNumbers, '']
    }));
  };

  const removePhoneNumber = (index: number) => {
    if (formData.PhoneNumbers.length > 1) {
      setFormData(prev => ({
        ...prev,
        PhoneNumbers: prev.PhoneNumbers.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePhoneNumber = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      PhoneNumbers: prev.PhoneNumbers.map((phone, i) => i === index ? value : phone)
    }));
  };

  const addBankAccount = () => {
    const newAccount: BankAccount = {
      id: Math.random().toString(36).substr(2, 9),
      BankName: '',
      AccountNumber: '',
      BankNumber: ''
    };
    setFormData(prev => ({
      ...prev,
      BankAccounts: [...prev.BankAccounts, newAccount]
    }));
  };

  const removeBankAccount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      BankAccounts: prev.BankAccounts.filter((_, i) => i !== index)
    }));
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    setFormData(prev => ({
      ...prev,
      BankAccounts: prev.BankAccounts.map((account, i) => 
        i === index ? { ...account, [field]: value } : account
      )
    }));
  };

  const addMobilePayment = () => {
    const newPayment: MobilePayment = {
      id: Math.random().toString(36).substr(2, 9),
      provider: 'MTN',
      merchantCode: '',
      phoneNumber: ''
    };
    setFormData(prev => ({
      ...prev,
      MobilePayments: [...prev.MobilePayments, newPayment]
    }));
  };

  const removeMobilePayment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      MobilePayments: prev.MobilePayments.filter((_, i) => i !== index)
    }));
  };

  const updateMobilePayment = (index: number, field: keyof MobilePayment, value: string) => {
    setFormData(prev => ({
      ...prev,
      MobilePayments: prev.MobilePayments.map((payment, i) => 
        i === index ? { ...payment, [field]: value } : payment
      )
    }));
  };

  const handleRouteDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      RouteDays: checked
        ? [...prev.RouteDays, day]
        : prev.RouteDays.filter(d => d !== day)
    }));
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Created Successfully!</h2>
          <p className="text-gray-600 mb-4">The supplier has been added to your system.</p>
          <div className="text-sm text-gray-500">Redirecting to suppliers list...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Suppliers
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Supplier</h1>
              <p className="text-gray-600">Create a new supplier record in your system</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Building className="w-5 h-5 mr-2 text-purple-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="SupplierName"
                  value={formData.SupplierName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.SupplierName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter supplier legal name"
                />
                {errors.SupplierName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.SupplierName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TIN Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="TinNumber"
                    value={formData.TinNumber}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.TinNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Tax identification number"
                  />
                </div>
                {errors.TinNumber && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.TinNumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    name="DateOfRegistration"
                    value={formData.DateOfRegistration}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.DateOfRegistration ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.DateOfRegistration && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.DateOfRegistration}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Managing Employee ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    name="EmployeeID"
                    value={formData.EmployeeID}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.EmployeeID ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Employee ID"
                  />
                </div>
                {errors.EmployeeID && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.EmployeeID}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Route Days <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <label key={day} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-purple-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.RouteDays.includes(day)}
                        onChange={(e) => handleRouteDayChange(day, e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Select the days when this supplier typically delivers
                </p>
                {formData.RouteDays.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.RouteDays.map((day) => (
                      <span key={day} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {day}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <textarea
                  name="Address"
                  value={formData.Address}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.Address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter complete address"
                />
              </div>
              {errors.Address && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.Address}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-purple-600" />
              Contact Information
            </h2>
            
            <div className="space-y-6">
              {/* Phone Numbers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Numbers <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="text-purple-600 hover:text-purple-700 flex items-center text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Phone
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.PhoneNumbers.map((phone, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => updatePhoneNumber(index, e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="+1234567890"
                        />
                      </div>
                      {formData.PhoneNumbers.length > 1 && (
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
                </div>
                {errors.PhoneNumbers && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.PhoneNumbers}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    name="EmailAddress"
                    value={formData.EmailAddress}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.EmailAddress ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="supplier@example.com"
                  />
                </div>
                {errors.EmailAddress && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.EmailAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
              Payment Information <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </h2>
            
            <div className="space-y-8">
              {/* Bank Accounts */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Bank Accounts</h3>
                  <button
                    type="button"
                    onClick={addBankAccount}
                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bank Account
                  </button>
                </div>
                
                {formData.BankAccounts.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <CreditCard className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No bank accounts added</p>
                    <button
                      type="button"
                      onClick={addBankAccount}
                      className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
                    >
                      Add your first bank account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.BankAccounts.map((account, index) => (
                      <div key={account.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Bank Account {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeBankAccount(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={account.BankName}
                              onChange={(e) => updateBankAccount(index, 'BankName', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="Bank name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Account Number
                            </label>
                            <input
                              type="text"
                              value={account.AccountNumber}
                              onChange={(e) => updateBankAccount(index, 'AccountNumber', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`BankAccounts_${index}_AccountNumber`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Account number"
                            />
                            {errors[`BankAccounts_${index}_AccountNumber`] && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors[`BankAccounts_${index}_AccountNumber`]}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bank Number
                            </label>
                            <input
                              type="text"
                              value={account.BankNumber}
                              onChange={(e) => updateBankAccount(index, 'BankNumber', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`BankAccounts_${index}_BankNumber`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Bank number"
                            />
                            {errors[`BankAccounts_${index}_BankNumber`] && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors[`BankAccounts_${index}_BankNumber`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Payments */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Mobile Payment Options</h3>
                  <button
                    type="button"
                    onClick={addMobilePayment}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mobile Payment
                  </button>
                </div>
                
                {formData.MobilePayments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No mobile payment options added</p>
                    <button
                      type="button"
                      onClick={addMobilePayment}
                      className="mt-2 text-green-600 hover:text-green-700 text-sm"
                    >
                      Add MTN or Airtel merchant account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.MobilePayments.map((payment, index) => (
                      <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Mobile Payment {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeMobilePayment(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Provider
                            </label>
                            <select
                              value={payment.provider}
                              onChange={(e) => updateMobilePayment(index, 'provider', e.target.value as 'MTN' | 'Airtel')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="MTN">MTN Mobile Money</option>
                              <option value="Airtel">Airtel Money</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Merchant Code
                            </label>
                            <input
                              type="text"
                              value={payment.merchantCode}
                              onChange={(e) => updateMobilePayment(index, 'merchantCode', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`MobilePayments_${index}_merchantCode`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="Merchant code"
                            />
                            {errors[`MobilePayments_${index}_merchantCode`] && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors[`MobilePayments_${index}_merchantCode`]}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <div className="relative">
                              <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <input
                                type="tel"
                                value={payment.phoneNumber}
                                onChange={(e) => updateMobilePayment(index, 'phoneNumber', e.target.value)}
                                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                  errors[`MobilePayments_${index}_phoneNumber`] ? 'border-red-300' : 'border-gray-300'
                                }`}
                                placeholder="+1234567890"
                              />
                            </div>
                            {errors[`MobilePayments_${index}_phoneNumber`] && (
                              <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors[`MobilePayments_${index}_phoneNumber`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-8 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Create Supplier</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 