'use client';

import { useState, useEffect } from 'react';
import { subscribeToInvoicePayments, subscribeToInvoices } from '@/lib/firebase/purchasing-manager-service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function InvoiceDebugPage() {
  const [targetInvoice, setTargetInvoice] = useState(null);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('INV-2025-06-11-6927');

  const searchInvoice = async (invoiceNumber) => {
    setLoading(true);
    try {
      // Get all invoices first
      const unsubscribeInvoices = subscribeToInvoices((invoices) => {
        setAllInvoices(invoices);
        
        // Find the specific invoice
        const foundInvoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
        setTargetInvoice(foundInvoice);
        
        if (foundInvoice) {
          console.log('Found invoice:', foundInvoice);
        } else {
          console.log('Invoice not found:', invoiceNumber);
        }
      });

      // Get payment records for this invoice
      const unsubscribePayments = subscribeToInvoicePayments((payments) => {
        const invoiceSpecificPayments = payments.filter(payment => 
          payment.invoiceNumber === invoiceNumber || payment.invoiceId === invoiceNumber
        );
        setInvoicePayments(invoiceSpecificPayments);
        console.log('Payments for invoice:', invoiceSpecificPayments);
      });

      setLoading(false);

      return () => {
        unsubscribeInvoices();
        unsubscribePayments();
      };
    } catch (error) {
      console.error('Error searching invoice:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    searchInvoice(searchInvoiceNumber);
  }, [searchInvoiceNumber]);

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const invoiceNum = formData.get('invoiceNumber');
    setSearchInvoiceNumber(invoiceNum);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Loading Invoice Data...</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Invoice Payment Status Debug</h1>
      
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Search Invoice</h2>
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            name="invoiceNumber"
            defaultValue={searchInvoiceNumber}
            placeholder="Enter invoice number (e.g., INV-2025-06-11-6927)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Invoice: {searchInvoiceNumber}
        </h2>
        
        {!targetInvoice ? (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-700">❌ Invoice not found in database</p>
            <p className="text-sm text-red-600 mt-2">
              Available invoices: {allInvoices.length} total
            </p>
            {allInvoices.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-red-600">Show all invoice numbers</summary>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {allInvoices.map(inv => (
                    <div key={inv.id} className="text-sm py-1">
                      {inv.invoiceNumber} - {inv.status} - UGX {inv.amount?.toLocaleString()}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Invoice Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div><strong>Invoice Number:</strong> {targetInvoice.invoiceNumber}</div>
                <div><strong>Supplier:</strong> {targetInvoice.supplierName}</div>
                <div><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    targetInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    targetInvoice.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {targetInvoice.status}
                  </span>
                </div>
                <div><strong>Created:</strong> {targetInvoice.createdAt?.toLocaleDateString()}</div>
                <div><strong>Due Date:</strong> {targetInvoice.dueDate?.toLocaleDateString()}</div>
              </div>
              <div className="space-y-3">
                <div><strong>Total Amount:</strong> UGX {targetInvoice.amount?.toLocaleString()}</div>
                <div><strong>Paid Amount:</strong> UGX {targetInvoice.paidAmount?.toLocaleString() || '0'}</div>
                <div><strong>Remaining:</strong> UGX {targetInvoice.remainingAmount?.toLocaleString() || targetInvoice.amount?.toLocaleString()}</div>
                <div><strong>Payment Count:</strong> {targetInvoice.paymentCount || 0}</div>
                <div><strong>Paid At:</strong> {targetInvoice.paidAt?.toLocaleDateString() || 'N/A'}</div>
              </div>
            </div>

            {/* Payment Status Analysis */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Payment Status Analysis</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Why is this showing as paid?</strong></div>
                
                {targetInvoice.status === 'paid' && (
                  <div className="space-y-1">
                    <div>✅ Invoice status field is set to "paid"</div>
                    {targetInvoice.paidAt && (
                      <div>✅ Has paidAt timestamp: {targetInvoice.paidAt.toLocaleString()}</div>
                    )}
                    {targetInvoice.paidAmount >= targetInvoice.amount && (
                      <div>✅ Paid amount ({targetInvoice.paidAmount?.toLocaleString()}) {'>='} Total amount ({targetInvoice.amount?.toLocaleString()})</div>
                    )}
                    {(!targetInvoice.paidAmount || targetInvoice.paidAmount < targetInvoice.amount) && (
                      <div className="text-orange-600">⚠️ Paid amount ({targetInvoice.paidAmount?.toLocaleString() || '0'}) is less than total amount ({targetInvoice.amount?.toLocaleString()})</div>
                    )}
                  </div>
                )}
                
                {targetInvoice.paymentCount === 0 && (
                  <div className="text-red-600">⚠️ No payment records found (paymentCount = 0)</div>
                )}
                
                {invoicePayments.length === 0 && (
                  <div className="text-red-600">⚠️ No payment records in invoicePayments collection</div>
                )}
              </div>
            </div>

            {/* Payment Records */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <h3 className="font-semibold text-gray-800 mb-2">Payment Records ({invoicePayments.length})</h3>
              
              {invoicePayments.length === 0 ? (
                <div className="text-red-600">
                  ❌ No payment records found in invoicePayments collection for this invoice.
                  <br />
                  <span className="text-sm">This suggests the invoice was marked as paid using the old system.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoicePayments.map((payment, index) => (
                    <div key={payment.id} className="bg-white p-3 rounded border">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><strong>Payment #{index + 1}</strong></div>
                        <div><strong>Reference:</strong> {payment.paymentReference}</div>
                        <div><strong>Amount:</strong> UGX {payment.amount?.toLocaleString()}</div>
                        <div><strong>Method:</strong> {payment.paymentMethod?.type}</div>
                        <div><strong>Date:</strong> {payment.paymentDate?.toLocaleDateString()}</div>
                        <div><strong>Status:</strong> {payment.paymentStatus}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raw Data */}
            <details className="bg-gray-50 border border-gray-200 rounded p-4">
              <summary className="cursor-pointer font-semibold text-gray-800">Show Raw Invoice Data</summary>
              <pre className="mt-4 bg-white p-4 rounded text-xs overflow-auto border">
                {JSON.stringify(targetInvoice, null, 2)}
              </pre>
            </details>

            {/* Recommendations */}
            {targetInvoice.status === 'paid' && invoicePayments.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">🔧 Recommendations</h3>
                <div className="text-sm text-yellow-700 space-y-2">
                  <div>This invoice appears to have been paid using the old payment system.</div>
                  <div><strong>Options:</strong></div>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Create a payment record to match this paid invoice</li>
                    <li>Reset the invoice status to 'approved' and make a new payment with reference</li>
                    <li>Leave as-is if this represents a legacy payment</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 