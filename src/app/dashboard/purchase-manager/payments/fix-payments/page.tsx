'use client';

import { useState, useEffect } from 'react';
import { subscribeToInvoicePayments, subscribeToInvoices, Invoice, InvoicePayment } from '@/lib/firebase/purchasing-manager-service';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface FixResult {
  success: boolean;
  message: string;
  error?: string;
  count?: number;
}

export default function FixPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState<FixResult | null>(null);

  useEffect(() => {
    const unsubscribeInvoices = subscribeToInvoices((invoices) => {
      setInvoices(invoices);
    });

    const unsubscribePayments = subscribeToInvoicePayments((payments) => {
      setInvoicePayments(payments);
    });

    setLoading(false);

    return () => {
      unsubscribeInvoices();
      unsubscribePayments();
    };
  }, []);

  // Find invoices that are marked as 'paid' but have no payment records
  const problematicInvoices = invoices.filter(invoice => {
    const isPaid = invoice.status === 'paid';
    const hasPaymentRecords = invoicePayments.some(payment => 
      payment.invoiceId === invoice.id || payment.invoiceNumber === invoice.invoiceNumber
    );
    return isPaid && !hasPaymentRecords;
  });

  const fixInvoices = async () => {
    if (problematicInvoices.length === 0) return;

    setFixing(true);
    try {
      const batch = writeBatch(db);
      
      problematicInvoices.forEach(invoice => {
        const invoiceRef = doc(db, 'invoices', invoice.id);
        batch.update(invoiceRef, {
          status: 'approved',
          paidAmount: 0,
          remainingAmount: invoice.amount,
          paymentCount: 0,
          paidAt: null,
          lastPaymentDate: null
        });
      });

      await batch.commit();
      
      setFixResults({
        success: true,
        count: problematicInvoices.length,
        message: `Successfully reset ${problematicInvoices.length} invoices to 'approved' status`
      });
    } catch (error) {
      console.error('Error fixing invoices:', error);
      setFixResults({
        success: false,
        error: (error as Error).message,
        message: 'Failed to fix invoices'
      });
    } finally {
      setFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Fix Payment System Issues</h1>
        <p className="text-gray-600 mb-6">
          This tool identifies and fixes invoices that were marked as 'paid' by the old payment system 
          but have no corresponding payment records with reference numbers.
        </p>

        {/* Analysis */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-600">Total Invoices</h3>
            <p className="text-2xl font-bold text-blue-700">{invoices.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-600">Payment Records</h3>
            <p className="text-2xl font-bold text-green-700">{invoicePayments.length}</p>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <h3 className="font-semibold text-red-600">Problematic Invoices</h3>
            <p className="text-2xl font-bold text-red-700">{problematicInvoices.length}</p>
          </div>
        </div>

        {/* Problematic Invoices */}
        {problematicInvoices.length > 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-4">
              ⚠️ Found {problematicInvoices.length} invoices marked as 'paid' without payment records:
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {problematicInvoices.map(invoice => (
                <div key={invoice.id} className="bg-white p-3 rounded border text-sm">
                  <div className="grid grid-cols-4 gap-4">
                    <div><strong>Invoice:</strong> {invoice.invoiceNumber}</div>
                    <div><strong>Supplier:</strong> {invoice.supplierName}</div>
                    <div><strong>Amount:</strong> UGX {invoice.amount?.toLocaleString()}</div>
                    <div><strong>Paid At:</strong> {invoice.paidAt?.toLocaleDateString() || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-white rounded border">
              <h4 className="font-semibold text-gray-800 mb-2">What this fix will do:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Reset invoice status from 'paid' to 'approved'</li>
                <li>Clear paidAmount, set to 0</li>
                <li>Reset remainingAmount to full invoice amount</li>
                <li>Clear paymentCount, set to 0</li>
                <li>Remove paidAt and lastPaymentDate timestamps</li>
                <li>Allow proper payments with reference numbers to be made</li>
              </ul>
            </div>

            <button
              onClick={fixInvoices}
              disabled={fixing}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fixing ? 'Fixing...' : `Fix ${problematicInvoices.length} Invoices`}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-green-700">
              ✅ No problematic invoices found. All paid invoices have corresponding payment records.
            </p>
          </div>
        )}

        {/* Fix Results */}
        {fixResults && (
          <div className={`border rounded p-4 ${
            fixResults.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <p className={fixResults.success ? 'text-green-700' : 'text-red-700'}>
              {fixResults.success ? '✅' : '❌'} {fixResults.message}
            </p>
            {fixResults.error && (
              <p className="text-red-600 text-sm mt-2">Error: {fixResults.error}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">After fixing:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Go to the Invoices page</li>
            <li>Find the invoices that were reset to 'approved' status</li>
            <li>Use the "Make Payment" button to create proper payments with reference numbers</li>
            <li>Each payment will generate a unique reference like "CSH-2412201430-INV1-01"</li>
            <li>The invoice will be properly tracked with payment history</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 