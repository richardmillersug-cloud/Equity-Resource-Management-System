'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
// import {
//   subscribeToInvoices,
//   subscribeToInvoicePayments,
//   subscribeToCashCloses,
//   Invoice,
//   InvoicePayment,
//   CashClose,
//   Expense,
// } from '../../../../lib/firebase/purchasing-manager-service';
import { authService } from '../../../../lib/firebase/auth';

export default function SyncCheckPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Subscribe to all collections
    const unsubscribeInvoices = subscribeToInvoices((data) => {
      setInvoices(data);
      console.log('Invoices from Firestore:', data);
    });

    const unsubscribePayments = subscribeToInvoicePayments((data) => {
      setPayments(data);
      console.log('Payments from Firestore:', data);
    });

    const unsubscribeCashCloses = subscribeToCashCloses((data) => {
      setCashCloses(data);
      console.log('Cash Closes from Firestore:', data);
    });

    // Expense approvals removed
    setLoading(false);

    return () => {
      unsubscribeInvoices();
      unsubscribePayments();
      unsubscribeCashCloses();

    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: unknown) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Date ? date : 
                     date.toDate ? date.toDate() : 
                     new Date(date);
      return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Loading Firestore data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Firestore Sync Check</h1>
              <p className="text-gray-600">Current data in Firestore collections</p>
            </div>
          </div>
        </div>

        {/* Current User Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Current User
          </h2>
          {currentUser ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>UID:</strong> {currentUser.uid}</div>
              <div><strong>Email:</strong> {currentUser.email}</div>
              <div><strong>Name:</strong> {currentUser.displayName || 'N/A'}</div>
              <div><strong>Role:</strong> {currentUser.employee?.roles?.[0]?.jobTitle || 'N/A'}</div>
            </div>
          ) : (
            <p className="text-red-600">No user logged in</p>
          )}
        </div>

        {/* Collection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payments</p>
                <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Closes</p>
                <p className="text-2xl font-bold text-gray-900">{cashCloses.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Detailed Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoices */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            </div>
            <div className="p-4">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">{invoice.supplierName}</p>
                      <p className="text-sm text-gray-500">Status: {invoice.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                      <p className="text-sm text-gray-600">Paid: {formatCurrency(invoice.paidAmount || 0)}</p>
                      <p className="text-sm text-gray-500">Payments: {invoice.paymentCount || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <p className="text-gray-500 text-center py-4">No invoices found</p>
              )}
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
            </div>
            <div className="p-4">
              {payments.slice(0, 5).map((payment) => (
                <div key={payment.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{payment.paymentReference}</p>
                      <p className="text-sm text-gray-600">{payment.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">Method: {payment.paymentMethod.type}</p>
                    </div>
                                         <div className="text-right">
                       <p className="font-medium">{formatCurrency(payment.amount)}</p>
                       <p className="text-sm text-gray-600">Installment: {payment.installmentNumber}</p>
                       <p className="text-sm text-gray-500">By: {payment.paidByName || payment.paidBy}</p>
                       <p className="text-sm text-gray-500">{formatDate(payment.paymentDate)}</p>
                     </div>
                  </div>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-gray-500 text-center py-4">No payments found</p>
              )}
            </div>
          </div>

          {/* Cash Closes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Cash Closes</h3>
            </div>
            <div className="p-4">
              {cashCloses.slice(0, 5).map((cashClose) => (
                <div key={cashClose.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{cashClose.shift} Shift</p>
                      <p className="text-sm text-gray-600">{cashClose.branchId}</p>
                      <p className="text-sm text-gray-500">{formatDate(cashClose.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(cashClose.closeCash)}</p>
                      <p className="text-sm text-gray-600">Cash: {formatCurrency(cashClose.cashPresent)}</p>
                      <p className="text-sm text-gray-500">Variance: {formatCurrency(cashClose.excess - cashClose.shortage)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {cashCloses.length === 0 && (
                <p className="text-gray-500 text-center py-4">No cash closes found</p>
              )}
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
            </div>
            <div className="p-4">
              {expenses.slice(0, 5).map((expense) => (
                <div key={expense.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{expense.name}</p>
                      <p className="text-sm text-gray-600">{expense.employeeName}</p>
                      <p className="text-sm text-gray-500">Type: {expense.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(expense.amount)}</p>
                      <p className="text-sm text-gray-600">Status: {expense.status}</p>
                      <p className="text-sm text-gray-500">{formatDate(expense.requestDate)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-gray-500 text-center py-4">No expenses found</p>
              )}
            </div>
          </div>
        </div>

        {/* Raw Data (for debugging) */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Raw Data (Check Console)</h3>
          </div>
          <div className="p-4">
            <p className="text-gray-600 mb-4">
              All data has been logged to the browser console. Press F12 → Console to see detailed Firestore data.
            </p>
            <button
              onClick={() => {
                console.log('=== FIRESTORE SYNC CHECK ===');
                console.log('Invoices:', invoices);
                console.log('Payments:', payments);
                console.log('Cash Closes:', cashCloses);
                console.log('Expenses:', expenses);
                console.log('Current User:', currentUser);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Log All Data to Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 