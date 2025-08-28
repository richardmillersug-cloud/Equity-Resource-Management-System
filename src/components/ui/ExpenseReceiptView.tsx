import React, { useState, useEffect } from 'react';
import { authService } from '../../lib/firebase/auth';

interface ExpenseReceiptViewProps {
  expense: any;
  onClose: () => void;
}

export default function ExpenseReceiptView({ expense, onClose }: ExpenseReceiptViewProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-UG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const convertAmountToWords = (amount: number): string => {
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

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_PAID': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-100';
      case 'UNPAID': return 'text-red-600 bg-red-100';
      case 'OVERDUE': return 'text-red-700 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-4xl w-full max-h-screen overflow-auto">
        {/* Print Controls - Hidden in print */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">Expense Receipt Preview</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Expense Receipt Content */}
        <div id="printable-expense-receipt" className="p-6 bg-white">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white border border-gray-300 flex items-center justify-center overflow-hidden">
                <img 
                  src="/equity-logo.png" 
                  alt="Equity Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = img.nextElementSibling as HTMLElement;
                    img.style.display = 'none';
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
                <div className="hidden text-xs font-bold text-gray-600">EQUITY</div>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  UNISON TECHNOLOGIES AND INNOVATION LTD
                </h1>
                <p className="text-xs text-gray-600">EQUITY SHOPPERS SUPERMARKET</p>
                <p className="text-xs text-gray-600">KYENGERA, KAMPALA-MASAKA</p>
                <p className="text-xs text-blue-600 underline">unisontechnologiesaninnovation@gmail.com</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-900">EXPENSE RECEIPT</h2>
              <p className="text-xs text-gray-600">Receipt #{expense.id?.slice(-8) || 'N/A'}</p>
              <p className="text-xs text-gray-600">Date: {formatDate(expense.expenseDate)}</p>
            </div>
          </div>

          {/* Expense Information */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Expense Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Description:</span> {expense.description}</p>
                <p><span className="font-medium">Category:</span> {expense.category}</p>
                <p><span className="font-medium">Department:</span> {expense.department}</p>
                <p><span className="font-medium">Receipt No:</span> {expense.receiptNumber || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 border-b border-gray-200 pb-1">Vendor Information</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Vendor:</span> {expense.vendor || 'N/A'}</p>
                <p><span className="font-medium">Source:</span> 
                  <span className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    expense.source === 'expenses_table' ? 'bg-blue-100 text-blue-800' :
                    expense.source === 'expenses_collection' ? 'bg-purple-100 text-purple-800' :
                    expense.source === 'cash_close' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {expense.source === 'expenses_table' ? 'Table' :
                     expense.source === 'expenses_collection' ? 'Collection' :
                     expense.source === 'cash_close' ? 'Till' :
                     'Mock'}
                  </span>
                </p>
                <p><span className="font-medium">Details:</span> {expense.sourceDetails || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Amount and Status Information */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Financial Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-bold">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Amount Paid:</span>
                    <span className="text-sm">{formatCurrency(expense.amountPaid || expense.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Balance:</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency((expense.amount || 0) - (expense.amountPaid || expense.paidAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Status Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Approval Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(expense.status)}`}>
                      {expense.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Payment Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(expense.paymentStatus)}`}>
                      {expense.paymentStatus?.replace('_', ' ') || 'UNPAID'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Due Date:</span>
                    <span className="text-sm">{expense.dueDate ? formatDate(expense.dueDate) : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm font-medium text-gray-700 mb-1">Amount in Words:</p>
            <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {convertAmountToWords(Math.floor(expense.amount || 0))}
            </p>
          </div>

          {/* Additional Information */}
          {(expense.notes || expense.tags?.length > 0) && (
            <div className="border-t pt-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
              {expense.notes && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-600">Notes:</p>
                  <p className="text-sm text-gray-900">{expense.notes}</p>
                </div>
              )}
              {expense.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {expense.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-4 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Processed By:</h4>
                <div className="text-sm space-y-1">
                  <p>{currentUser?.employee ? 
                      `${currentUser.employee.firstName} ${currentUser.employee.lastName}` : 
                      (currentUser?.displayName || 'System User')}
                  </p>
                  <p className="text-gray-600">{currentUser?.employee?.department || 'Accounting Department'}</p>
                  <p className="text-xs text-gray-500">
                    Printed on: {formatDate(new Date())}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Approval:</h4>
                <div className="text-sm space-y-1">
                  <p>{expense.approvedBy || 'Pending Approval'}</p>
                  <div className="border-t border-gray-300 w-32 mt-4 pt-1">
                    <p className="text-xs text-gray-500">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This is a computer-generated receipt and does not require a signature.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              For any queries, please contact the Accounting Department.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
