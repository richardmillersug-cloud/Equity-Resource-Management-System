'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc,
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';

export default function QuickAllocationCheck() {
  const [results, setResults] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const checkData = async () => {
    const user = authService.getCurrentUser();
    console.log('👤 Current user:', user);

    // Check all allocations
    const allSnapshot = await getDocs(collection(db, 'cash_allocations'));
    const all = allSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Check user-specific allocations
    let userAllocations = [];
    if (user) {
      const userQuery = query(
        collection(db, 'cash_allocations'),
        where('allocatedTo', '==', user.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      userAllocations = userSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Check allocated status specifically
    const allocatedQuery = query(
      collection(db, 'cash_allocations'),
      where('status', '==', 'allocated')
    );
    const allocatedSnapshot = await getDocs(allocatedQuery);
    const allocated = allocatedSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    setResults({
      user: user ? { uid: user.uid, email: user.email, role: user.employee?.roles?.[0]?.jobTitle } : null,
      totalAllocations: all.length,
      userAllocations: userAllocations.length,
      allocatedStatus: allocated.length,
      allRecords: all,
      userRecords: userAllocations,
      allocatedRecords: allocated
    });
  };

  const createTestAllocation = async () => {
    setCreating(true);
    const user = authService.getCurrentUser();
    
    if (!user) {
      alert('❌ No user logged in');
      setCreating(false);
      return;
    }

    try {
      // Create a test allocation for current user
      const testAllocation = {
        amount: 500000,
        description: 'Test allocation for PM confirmation',
        allocatedTo: user.uid,
        allocatedBy: user.uid, // Self-allocated for testing
        status: 'allocated',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cashCloseId: `test-${Date.now()}`
      };

      const docRef = await addDoc(collection(db, 'cash_allocations'), testAllocation);
      console.log('✅ Test allocation created:', docRef.id);
      
      alert('✅ Test allocation created! Check the PM page now.');
      await checkData(); // Refresh
      
    } catch (error) {
      console.error('❌ Error creating test allocation:', error);
      alert('❌ Failed to create test allocation');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    checkData();
  }, []);

  if (!results) {
    return <div className="p-8">Loading diagnostics...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Quick Allocation Check</h1>
      
      {/* Current User */}
      <div className="bg-blue-50 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-800 mb-2">Current User</h2>
        {results.user ? (
          <div className="text-sm">
            <p><strong>ID:</strong> {results.user.uid}</p>
            <p><strong>Email:</strong> {results.user.email}</p>
            <p><strong>Role:</strong> {results.user.role}</p>
          </div>
        ) : (
          <p className="text-red-600">❌ Not logged in</p>
        )}
      </div>

      {/* Database Stats */}
      <div className="bg-white border rounded p-4 mb-6">
        <h2 className="font-semibold mb-3">Database Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className="text-2xl font-bold">{results.totalAllocations}</div>
            <div className="text-gray-600">Total Records</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-2xl font-bold">{results.userAllocations}</div>
            <div className="text-blue-600">Your Allocations</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded">
            <div className="text-2xl font-bold">{results.allocatedStatus}</div>
            <div className="text-orange-600">Status = 'allocated'</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-2xl font-bold">
              {results.userRecords.filter((a: any) => a.status === 'allocated').length}
            </div>
            <div className="text-green-600">Your 'allocated'</div>
          </div>
        </div>
      </div>

      {/* Issue Diagnosis */}
      <div className="mb-6">
        {results.totalAllocations === 0 ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <h3 className="font-semibold text-red-800 mb-2">❌ No Data in Database</h3>
            <p className="text-red-700 text-sm mb-3">
              The cash_allocations collection is empty. No allocations have been created yet.
            </p>
            <button
              onClick={createTestAllocation}
              disabled={creating || !results.user}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : '✅ Create Test Allocation'}
            </button>
          </div>
        ) : results.userAllocations === 0 ? (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded">
            <h3 className="font-semibold text-orange-800 mb-2">⚠️ No Allocations for Your User</h3>
            <p className="text-orange-700 text-sm mb-2">
              Database has {results.totalAllocations} allocations, but none for your user ID.
            </p>
            <p className="text-orange-700 text-sm">
              <strong>Your ID:</strong> {results.user?.uid}
            </p>
          </div>
        ) : results.userRecords.filter((a: any) => a.status === 'allocated').length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">ℹ️ No 'allocated' Status</h3>
            <p className="text-blue-700 text-sm">
              You have {results.userAllocations} allocations, but none with status 'allocated'.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <h3 className="font-semibold text-green-800 mb-2">✅ Data Found!</h3>
            <p className="text-green-700 text-sm">
              You have {results.userRecords.filter((a: any) => a.status === 'allocated').length} allocations 
              with 'allocated' status. They should show in the PM interface.
            </p>
          </div>
        )}
      </div>

      {/* Your Records */}
      {results.userRecords && results.userRecords.length > 0 && (
        <div className="bg-white border rounded p-4 mb-6">
          <h2 className="font-semibold mb-3">Your Allocation Records ({results.userRecords.length})</h2>
          <div className="space-y-3">
            {results.userRecords.map((record: any) => (
              <div key={record.id} className="p-3 border rounded bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <p><strong>UGX {(record.amount || 0).toLocaleString()}</strong></p>
                    <p className="text-sm text-gray-600">{record.description}</p>
                    <p className="text-xs text-gray-500">ID: {record.id}</p>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs ${
                      record.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                      record.status === 'money_received' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </div>
                    <p className="text-xs text-gray-500">
                      {record.createdAt?.toDate?.()?.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser Console Commands */}
      <div className="bg-gray-50 p-4 rounded">
        <h3 className="font-semibold mb-2">🖥️ Browser Console Commands</h3>
        <p className="text-sm text-gray-600 mb-2">Copy and paste these in browser console (F12):</p>
        
        <div className="bg-white p-3 rounded border text-xs font-mono">
          <p className="mb-2">// Check all allocations</p>
          <p className="mb-2">import &#123; collection, getDocs &#125; from 'firebase/firestore';</p>
          <p className="mb-2">import &#123; db &#125; from '@/lib/firebase/config';</p>
          <p className="mb-4">const s = await getDocs(collection(db, 'cash_allocations')); console.log('Total:', s.docs.length, s.docs.map(d =&gt; d.data()));</p>
          
          <p className="mb-2">// Check for your user specifically</p>
          <p>const u = await getDocs(query(collection(db, 'cash_allocations'), where('allocatedTo', '==', '{results.user?.uid || 'YOUR_USER_ID'}'))); console.log('Your allocations:', u.docs.length, u.docs.map(d =&gt; d.data()));</p>
        </div>
      </div>
    </div>
  );
}


