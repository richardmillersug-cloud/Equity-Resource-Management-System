'use client';

import { useState, useEffect } from 'react';
import { subscribeToInvoicePayments, subscribeToInvoices } from '@/lib/firebase/purchasing-manager-service';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function PaymentsDebugPage() {
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [oldPayments, setOldPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkData = async () => {
      try {
        // Check new invoice payments
        const unsubscribePayments = subscribeToInvoicePayments((payments) => {
          console.log('Invoice Payments from subscription:', payments);
          setInvoicePayments(payments);
        });

        // Check invoices
        const unsubscribeInvoices = subscribeToInvoices((invoices) => {
          console.log('Invoices from subscription:', invoices);
          setInvoices(invoices);
        });

        // Check old payments collection
        try {
          const oldPaymentsQuery = query(
            collection(db, 'payments'),
            orderBy('createdAt', 'desc')
          );
          const oldPaymentsSnapshot = await getDocs(oldPaymentsQuery);
          const oldPaymentsData = oldPaymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Old payments collection:', oldPaymentsData);
          setOldPayments(oldPaymentsData);
        } catch (error) {
          console.log('No old payments collection or error:', error);
        }

        setLoading(false);

        return () => {
          unsubscribePayments();
          unsubscribeInvoices();
        };
      } catch (error) {
        console.error('Error checking data:', error);
        setLoading(false);
      }
    };

    checkData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Loading Firestore Data...</h1>
      </div>
    );
  }

  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const partialInvoices = invoices.filter(inv => inv.status === 'partial');

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Firestore Payment Data Debug</h1>
      
      {/* Invoice Payments Collection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-green-600 mb-4">
          📊 invoicePayments Collection (New System)
        </h2>
        <p className="text-gray-600 mb-4">Records: {invoicePayments.length}</p>
        
        {invoicePayments.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-700">❌ No payment records found in invoicePayments collection</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoicePayments.map((payment, index) => (
              <div key={payment.id} className="border rounded p-4 bg-gray-50">
                <h3 className="font-semibold text-blue-600">Payment {index + 1}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div><strong>ID:</strong> {payment.id}</div>
                  <div><strong>Payment Reference:</strong> {payment.paymentReference || 'N/A'}</div>
                  <div><strong>Invoice Number:</strong> {payment.invoiceNumber || 'N/A'}</div>
                  <div><strong>Supplier:</strong> {payment.supplierName || 'N/A'}</div>
                  <div><strong>Amount:</strong> UGX {payment.amount?.toLocaleString() || 'N/A'}</div>
                  <div><strong>Payment Method:</strong> {payment.paymentMethod?.type || 'N/A'}</div>
                  <div><strong>Installment:</strong> #{payment.installmentNumber || 'N/A'}</div>
                  <div><strong>Paid By:</strong> {payment.paidByName ? `${payment.paidByName} (${payment.paidBy})` : payment.paidBy || 'N/A'}</div>
                  <div><strong>Payment Date:</strong> {payment.paymentDate?.toLocaleDateString() || 'N/A'}</div>
                  <div><strong>Status:</strong> {payment.paymentStatus || 'N/A'}</div>
                  <div><strong>Running Total:</strong> UGX {payment.runningTotal?.toLocaleString() || 'N/A'}</div>
                  <div><strong>Remaining:</strong> UGX {payment.remainingAfterPayment?.toLocaleString() || 'N/A'}</div>
                </div>
                {payment.notes && (
                  <div className="mt-2 text-sm"><strong>Notes:</strong> {payment.notes}</div>
                )}
                
                {/* Show raw data structure */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-blue-600 text-sm">Show Raw Data</summary>
                  <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(payment, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Old Payments Collection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-orange-600 mb-4">
          📊 payments Collection (Old System)
        </h2>
        <p className="text-gray-600 mb-4">Records: {oldPayments.length}</p>
        
        {oldPayments.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-green-700">✅ No old payment records found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {oldPayments.map((payment, index) => (
              <div key={payment.id} className="border rounded p-4 bg-orange-50">
                <h3 className="font-semibold text-orange-600">Old Payment {index + 1}</h3>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div><strong>ID:</strong> {payment.id}</div>
                  <div><strong>Reference:</strong> {payment.reference || 'N/A'}</div>
                  <div><strong>Supplier:</strong> {payment.supplierName || 'N/A'}</div>
                  <div><strong>Amount:</strong> {payment.amount || 'N/A'}</div>
                  <div><strong>Method:</strong> {payment.method || 'N/A'}</div>
                  <div><strong>Status:</strong> {payment.status || 'N/A'}</div>
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-orange-600 text-sm">Show Raw Data</summary>
                  <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(payment, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-blue-600 mb-4">
          📊 Invoices Collection Summary
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-600">Paid Invoices</h3>
            <p className="text-2xl font-bold text-green-700">{paidInvoices.length}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded">
            <h3 className="font-semibold text-orange-600">Partial Invoices</h3>
            <p className="text-2xl font-bold text-orange-700">{partialInvoices.length}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-gray-600">Total Invoices</h3>
            <p className="text-2xl font-bold text-gray-700">{invoices.length}</p>
          </div>
        </div>

        {paidInvoices.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-green-600 mb-2">Paid Invoices Details:</h3>
            <div className="space-y-2">
              {paidInvoices.map((invoice) => (
                <div key={invoice.id} className="bg-green-50 p-3 rounded text-sm">
                  <div className="grid grid-cols-4 gap-4">
                    <div><strong>Invoice:</strong> {invoice.invoiceNumber}</div>
                    <div><strong>Supplier:</strong> {invoice.supplierName}</div>
                    <div><strong>Amount:</strong> UGX {invoice.amount?.toLocaleString()}</div>
                    <div><strong>Payments:</strong> {invoice.paymentCount || 0}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-purple-600 mb-4">
          🔍 Data Analysis
        </h2>
        <div className="space-y-2 text-sm">
          <p><strong>Invoice Payments Records:</strong> {invoicePayments.length}</p>
          <p><strong>Old Payment Records:</strong> {oldPayments.length}</p>
          <p><strong>Paid Invoices:</strong> {paidInvoices.length}</p>
          <p><strong>Partial Invoices:</strong> {partialInvoices.length}</p>
          
          {paidInvoices.length > 0 && invoicePayments.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
              <p className="text-yellow-700">
                ⚠️ <strong>Issue Detected:</strong> You have {paidInvoices.length} paid invoices but no payment records in the invoicePayments collection. 
                This suggests payments were made using the old system.
              </p>
            </div>
          )}
          
          {invoicePayments.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
              <p className="text-green-700">
                ✅ <strong>New System Active:</strong> Payment records are being created with reference numbers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 