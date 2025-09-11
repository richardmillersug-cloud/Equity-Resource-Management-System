'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';

export default function PopulateTestDataPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Generate sample cash close data
  function generateSampleCashClose(date: Date, shift: 'day' | 'night') {
    const baseAmount = 5000000 + Math.floor(Math.random() * 3000000); // 5M to 8M UGX
    const networkAmount = Math.floor(baseAmount * 0.2); // 20% network payments
    const cashAmount = baseAmount - networkAmount;
    const expenses = Math.floor(Math.random() * 500000); // Up to 500k expenses

    return {
      // Date fields - using multiple formats for compatibility
      cashCloseDate: Timestamp.fromDate(date),
      date: date.toISOString(),
      businessDate: date.toISOString().split('T')[0],

      // Core financial data
      totalRevenue: baseAmount,
      totalCashInTill: cashAmount,
      totalNetworkPayments: networkAmount,
      totalExpenses: expenses,

      // Shift data
      shifts: [{
        shift: shift,
        shiftTotalRevenue: baseAmount,
        shiftTotalCash: cashAmount,
        shiftTotalNetwork: networkAmount,
        tills: [
          {
            tillNumber: 1,
            totalCashInTill: Math.floor(cashAmount * 0.6),
            cashAmount: Math.floor(cashAmount * 0.6),
            totalNetworkPayments: Math.floor(networkAmount * 0.6),
            expenses: Math.floor(expenses * 0.6)
          },
          {
            tillNumber: 2,
            totalCashInTill: Math.floor(cashAmount * 0.4),
            cashAmount: Math.floor(cashAmount * 0.4),
            totalNetworkPayments: Math.floor(networkAmount * 0.4),
            expenses: Math.floor(expenses * 0.4)
          }
        ]
      }],

      // Additional metadata
      branchId: 'branch_001',
      createdBy: 'test_pm_001', // Test PM ID
      status: 'submitted',

      // Tax and allocations (following business rules)
      taxRate: 0.18,
      taxAmount: Math.floor(baseAmount * 0.18),
      afterTaxAmount: Math.floor(baseAmount * 0.82),
      profitPercentage: 0.12,
      profitAmount: Math.floor(baseAmount * 0.12),

      // Allocation calculations (after 12% profit)
      cashAfterProfit: Math.floor(cashAmount * 0.88),
      m_expenseFund: Math.floor(cashAmount * 0.88 * 0.30), // 30% of remaining
      purchasingManager: Math.floor(cashAmount * 0.88 * 0.70), // 70% of remaining

      // Variance
      totalShortage: Math.floor(Math.random() * 50000),
      totalExcess: Math.floor(Math.random() * 30000),

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  async function createTestPMUsers() {
    setMessage('👥 Creating test PM users...\n');

    const testPMUsers = [
      {
        uid: 'test_pm_001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        roles: [{ jobTitle: 'Purchase Manager', department: 'Purchasing' }],
        branchId: 'branch_001',
        status: 'active',
        createdAt: serverTimestamp()
      },
      {
        uid: 'test_pm_002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@test.com',
        roles: [{ jobTitle: 'Purchase Manager', department: 'Purchasing' }],
        branchId: 'branch_001',
        status: 'active',
        createdAt: serverTimestamp()
      }
    ];

    for (const user of testPMUsers) {
      try {
        await addDoc(collection(db, 'employees'), user);
        setMessage(prev => prev + `   ✅ Created PM: ${user.firstName} ${user.lastName} (${user.uid})\n`);
      } catch (error: any) {
        setMessage(prev => prev + `   ⚠️  PM ${user.firstName} ${user.lastName} may already exist\n`);
      }
    }
  }

  async function populateSampleData() {
    setLoading(true);
    setMessage('🚀 Starting to populate test data...\n');

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('You must be logged in to populate test data');
      }

      // Create test PM users first
      await createTestPMUsers();
      setMessage(prev => prev + '\n💰 Creating sample cash close data...\n\n');

      const today = new Date();
      const records = [];

      // Generate data for the last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

        // Create both day and night shift records
        for (const shift of ['day', 'night'] as const) {
          const cashClose = generateSampleCashClose(date, shift);

          setMessage(prev => prev + `📝 Creating cash close for ${date.toISOString().split('T')[0]} - ${shift} shift\n`);
          setMessage(prev => prev + `   💰 Total Revenue: UGX ${cashClose.totalRevenue.toLocaleString()}\n`);
          setMessage(prev => prev + `   💵 Cash: UGX ${cashClose.totalCashInTill.toLocaleString()}\n`);
          setMessage(prev => prev + `   📱 Network: UGX ${cashClose.totalNetworkPayments.toLocaleString()}\n`);

          const docRef = await addDoc(collection(db, 'cashCloses'), cashClose);
          setMessage(prev => prev + `   ✅ Created with ID: ${docRef.id}\n\n`);

          records.push({
            id: docRef.id,
            date: date.toISOString().split('T')[0],
            shift: shift,
            revenue: cashClose.totalRevenue
          });
        }
      }

      setMessage(prev => prev + '='.repeat(50) + '\n');
      setMessage(prev => prev + '✅ SUCCESSFULLY CREATED SAMPLE DATA\n');
      setMessage(prev => prev + '='.repeat(50) + '\n');
      setMessage(prev => prev + '\n📊 Summary of created records:\n\n');

      records.forEach(record => {
        setMessage(prev => prev + `  • ${record.date} - ${record.shift}: UGX ${record.revenue.toLocaleString()} (ID: ${record.id})\n`);
      });

      setMessage(prev => prev + '\n💡 You can now test the automated allocation system with these dates!\n');
      setMessage(prev => prev + '🎯 Navigate to: Dashboard → Accountant → Allocations\n');

    } catch (error: any) {
      console.error('❌ Error populating sample data:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Populate Test Data for Cash Close Allocations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This will create sample PM users and cash close records with status "submitted" for testing the PM allocation functionality.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-800">What gets created:</h3>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
              <li>2 test PM users (John Doe, Jane Smith)</li>
              <li>14 cash close records (7 days × 2 shifts each)</li>
              <li>All records have status: "submitted"</li>
              <li>All records have createdBy: "test_pm_001" (John Doe)</li>
              <li>Revenue ranges from 5M to 8M UGX per record</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-800">How to test:</h3>
            <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside">
              <li>Click "Populate Sample Data" below</li>
              <li>Navigate to Dashboard → Accountant → Allocations</li>
              <li>Select "John Doe" from the PM dropdown</li>
              <li>You should see suggested allocations from his submitted cash closes</li>
            </ol>
          </div>

          <Button
            onClick={populateSampleData}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Sample Data...' : 'Populate Sample Cash Closes'}
          </Button>

          {message && (
            <div className="bg-gray-50 border rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{message}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
