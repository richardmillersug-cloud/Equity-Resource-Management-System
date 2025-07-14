'use client';

import { useState } from 'react';
import { makeInvoicePayment, PaymentMethod } from '@/lib/firebase/purchasing-manager-service';

interface TestPaymentProps {
  invoiceId: string;
  invoiceNumber: string;
  remainingAmount: number;
}

export default function TestPayment({ invoiceId, invoiceNumber, remainingAmount }: TestPaymentProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'cheque' | 'bank_deposit'>('cash');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  const handleTestPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const paymentMethod: PaymentMethod = {
        type: method,
        details: {},
        amount: parseFloat(amount),
        status: 'cleared'
      };

      await makeInvoicePayment(
        invoiceId,
        parseFloat(amount),
        paymentMethod,
        'test-user',
        `Test payment for ${invoiceNumber}`
      );

      setMessage(`✅ Payment of UGX ${parseFloat(amount).toLocaleString()} processed successfully!`);
      setAmount('');
    } catch (error) {
      console.error('Payment error:', error);
      setMessage(`❌ Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h4 className="font-medium text-blue-900 mb-3">Test Payment System</h4>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={remainingAmount}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_deposit">Bank Deposit</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleTestPayment}
          disabled={processing || !amount}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Make Test Payment'}
        </button>
        
        {message && (
          <div className={`text-sm p-2 rounded ${
            message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}
        
        <div className="text-xs text-blue-600">
          <p>Remaining: UGX {remainingAmount.toLocaleString()}</p>
          <p>This will create a payment record with a unique reference number</p>
        </div>
      </div>
    </div>
  );
} 