'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { Database, User, AlertCircle, Plus, CheckCircle } from 'lucide-react';

export default function AllocationDebugPage() {
  const [debugResults, setDebugResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const runFullDiagnostics = async () => {
    setLoading(true);
    console.log('🔍 Running comprehensive allocation diagnostics...');
    
    try {
      // Get current user
      const user = authService.getCurrentUser();
      
      // 1. Check total allocations in database
      const allAllocationsSnapshot = await getDocs(collection(db, 'cash_allocations'));
      const allAllocations = allAllocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 2. Check users collection to find all purchase managers
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const purchaseManagers = users.filter(u => 
        (u.role === 'purchase-manager') || 
        (u.employee?.roles?.[0]?.jobTitle === 'purchase-manager')
      );

      // 3. Check allocations for current user specifically
      let userAllocations = [];
      if (user) {
        const userAllocationQuery = query(
          collection(db, 'cash_allocations'),
          where('allocatedTo', '==', user.uid)
        );
        const userSnapshot = await getDocs(userAllocationQuery);
        userAllocations = userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      // 4. Check allocations by status
      const allocatedStatus = allAllocations.filter(a => a.status === 'allocated');
      const moneyReceivedStatus = allAllocations.filter(a => a.status === 'money_received');

      setDebugResults({
        currentUser: user ? {
          uid: user.uid,
          email: user.email,
          role: user.employee?.roles?.[0]?.jobTitle || user.role || 'unknown'
        } : null,
        totalAllocations: allAllocations.length,
        userAllocations: userAllocations.length,
        purchaseManagers: purchaseManagers.length,
        statusBreakdown: {
          allocated: allocatedStatus.length,
          money_received: moneyReceivedStatus.length,
          other: allAllocations.length - allocatedStatus.length - moneyReceivedStatus.length
        },
        sampleAllocations: allAllocations.slice(0, 3),
        userSpecificAllocations: userAllocations,
        allUsers: users.map(u => ({
          id: u.id,
          name: u.name || u.email,
          role: u.role || u.employee?.roles?.[0]?.jobTitle || 'unknown'
        }))
      });

    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      setDebugResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const createTestAllocation = async () => {
    setCreating(true);
    
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        alert('❌ No user logged in');
        return;
      }

      // Find any other user to allocate from (simulate accountant)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const otherUser = usersSnapshot.docs.find(doc => doc.id !== user.uid);
      
      if (!otherUser) {
        alert('❌ No other users found to simulate allocation from');
        return;
      }

      // Create test allocation
      await addDoc(collection(db, 'cash_allocations'), {
        amount: 500000,
        description: 'Test allocation for debugging',
        allocatedTo: user.uid,
        allocatedBy: otherUser.id,
        status: 'allocated',
        cashCloseId: `test-${Date.now()}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert('✅ Test allocation created successfully!');
      await runFullDiagnostics(); // Refresh data
      
    } catch (error) {
      console.error('❌ Error creating test allocation:', error);
      alert('❌ Failed to create test allocation');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    runFullDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold text-gray-700">Running Diagnostics...</h2>
          <p className="text-gray-500">Checking allocation data...</p>
        </div>
      </div>
    );
  }

  if (debugResults?.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700">Diagnostic Error</h2>
          <p className="text-red-600 text-sm">{debugResults.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Allocation System Diagnostics
          </h1>
          <p className="text-gray-600">
            Complete analysis of why allocation data might not be showing
          </p>
        </div>

        {/* Current User Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              Current User
            </h2>
            {debugResults?.currentUser ? (
              <div className="space-y-2 text-sm">
                <p><strong>User ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{debugResults.currentUser.uid}</code></p>
                <p><strong>Email:</strong> {debugResults.currentUser.email}</p>
                <p><strong>Role:</strong> {debugResults.currentUser.role}</p>
              </div>
            ) : (
              <p className="text-red-600">❌ No user logged in</p>
            )}
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-green-600" />
              Database Overview
            </h2>
            <div className="space-y-2 text-sm">
              <p><strong>Total Allocations:</strong> {debugResults?.totalAllocations || 0}</p>
              <p><strong>Your Allocations:</strong> {debugResults?.userAllocations || 0}</p>
              <p><strong>Purchase Managers:</strong> {debugResults?.purchaseManagers || 0}</p>
              <p><strong>Status - Allocated:</strong> {debugResults?.statusBreakdown?.allocated || 0}</p>
              <p><strong>Status - Money Received:</strong> {debugResults?.statusBreakdown?.money_received || 0}</p>
            </div>
          </div>
        </div>

        {/* Main Issue Diagnosis */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🎯 Main Issue Diagnosis
            </h2>
            
            {debugResults?.totalAllocations === 0 ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">❌ No Data in Database</h3>
                <p className="text-red-700 text-sm mb-3">
                  The cash_allocations collection is completely empty.
                </p>
                <div className="mb-3">
                  <strong className="text-red-800">Solution:</strong>
                  <ol className="text-red-700 text-sm mt-1 list-decimal list-inside space-y-1">
                    <li>Go to Accountant Dashboard: <code>/dashboard/accountant</code></li>
                    <li>Find a cash close card with "💰 Allocate Funds" button</li>
                    <li>Click the button and complete allocation</li>
                    <li>Return here to see the data appear</li>
                  </ol>
                </div>
                <button
                  onClick={createTestAllocation}
                  disabled={creating || !debugResults?.currentUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {creating ? 'Creating...' : 'Create Test Allocation'}
                </button>
              </div>
            ) : debugResults?.userAllocations === 0 ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">⚠️ No Allocations for Your User</h3>
                <p className="text-orange-700 text-sm mb-3">
                  Allocations exist in database but none are assigned to your user ID: 
                  <code className="bg-white px-2 py-1 rounded ml-1">{debugResults?.currentUser?.uid}</code>
                </p>
                <strong className="text-orange-800">Solution:</strong>
                <p className="text-orange-700 text-sm mt-1">
                  The accountant needs to allocate funds to YOU specifically as the Purchase Manager.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">✅ Data Found - Check Statuses</h3>
                <p className="text-green-700 text-sm">
                  You have {debugResults?.userAllocations} allocations. They might have different statuses.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Your Specific Allocations */}
        {debugResults?.userSpecificAllocations && debugResults.userSpecificAllocations.length > 0 && (
          <div className="bg-white rounded-lg border mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                📋 Your Allocations ({debugResults.userSpecificAllocations.length})
              </h2>
              <div className="space-y-3">
                {debugResults.userSpecificAllocations.map((allocation: any) => (
                  <div key={allocation.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-green-600">
                          UGX {(allocation.amount || 0).toLocaleString()}
                        </h4>
                        <p className="text-sm text-gray-600">{allocation.description}</p>
                        <p className="text-xs text-gray-500">
                          Created: {allocation.createdAt?.toDate?.()?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          allocation.status === 'allocated' ? 'bg-blue-100 text-blue-800' :
                          allocation.status === 'money_received' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {allocation.status}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">ID: {allocation.id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sample Database Records */}
        {debugResults?.sampleAllocations && debugResults.sampleAllocations.length > 0 && (
          <div className="bg-white rounded-lg border mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                🗃️ Sample Database Records
              </h2>
              <div className="space-y-3">
                {debugResults.sampleAllocations.map((allocation: any, index: number) => (
                  <div key={allocation.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Record {index + 1}:</strong> {allocation.id.substring(0, 8)}</p>
                        <p><strong>Amount:</strong> UGX {(allocation.amount || 0).toLocaleString()}</p>
                        <p><strong>Status:</strong> {allocation.status}</p>
                        <p><strong>Description:</strong> {allocation.description || 'N/A'}</p>
                      </div>
                      <div>
                        <p><strong>Allocated To:</strong> {allocation.allocatedTo}</p>
                        <p><strong>Allocated By:</strong> {allocation.allocatedBy}</p>
                        <p><strong>Created:</strong> {allocation.createdAt?.toDate?.()?.toLocaleDateString()}</p>
                        {allocation.allocatedTo === user?.uid && (
                          <p className="text-green-600 font-semibold">🎯 This is for YOU!</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Purchase Managers */}
        {debugResults?.allUsers && debugResults.allUsers.length > 0 && (
          <div className="bg-white rounded-lg border mb-6">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                👥 All Users in System ({debugResults.allUsers.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {debugResults.allUsers.map((user: any) => (
                  <div key={user.id} className={`p-3 border rounded text-sm ${
                    user.id === debugResults?.currentUser?.uid ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>ID:</strong> {user.id.substring(0, 8)}...</p>
                    {user.id === debugResults?.currentUser?.uid && (
                      <p className="text-blue-600 font-semibold">← You are here</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={runFullDiagnostics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Database className="w-4 h-4 mr-2" />
            Re-run Diagnostics
          </button>
          
          {debugResults?.totalAllocations === 0 && (
            <button
              onClick={createTestAllocation}
              disabled={creating || !debugResults?.currentUser}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Create Test Allocation'}
            </button>
          )}

          <button
            onClick={() => window.location.href = '/dashboard/purchase-manager/daily-allocation'}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Go to PM Page
          </button>

          <button
            onClick={() => window.location.href = '/dashboard/accountant'}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
          >
            <User className="w-4 h-4 mr-2" />
            Go to Accountant
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">📝 How to Create Allocation Data:</h3>
          <ol className="text-yellow-700 text-sm space-y-2 list-decimal list-inside">
            <li>Go to <strong>Accountant Dashboard</strong>: <code>/dashboard/accountant</code></li>
            <li>Look for cards showing cash closes with <strong>"💰 Allocate Funds"</strong> button</li>
            <li>Click <strong>"💰 Allocate Funds"</strong> on any card</li>
            <li>Complete the allocation form and submit</li>
            <li>The allocation will then appear in <strong>PM Daily Allocation</strong> page</li>
            <li>PM can then click <strong>"Yes - Money Received"</strong> to confirm</li>
          </ol>
        </div>
      </div>
    </div>
  );
}


