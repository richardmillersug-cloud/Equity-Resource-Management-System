'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { 
  Database, 
  Search, 
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface DebugInfo {
  currentUser: any;
  totalAllocations: number;
  userAllocations: number;
  allStatuses: string[];
  sampleData: any[];
  queryResults: string;
}

export default function DebugAllocationsPage() {
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [error, setError] = useState<string>('');

  const runDiagnostics = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Starting allocation diagnostics...');
      
      // Get current user
      const user = authService.getCurrentUser();
      console.log('👤 Current user:', user);

      if (!user) {
        setError('No user logged in');
        setLoading(false);
        return;
      }

      // Check total allocations in collection
      console.log('📊 Checking total allocations...');
      const allAllocationsSnapshot = await getDocs(collection(db, 'cash_allocations'));
      const allAllocations = allAllocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Total allocations in database:', allAllocations.length);
      console.log('📊 Sample allocations:', allAllocations.slice(0, 3));

      // Check allocations for this specific user
      console.log('🔍 Checking allocations for user:', user.uid);
      const userAllocationsQuery = query(
        collection(db, 'cash_allocations'),
        where('allocatedTo', '==', user.uid)
      );
      
      const userAllocationsSnapshot = await getDocs(userAllocationsQuery);
      const userAllocations = userAllocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('👤 User allocations found:', userAllocations.length);
      console.log('👤 User allocation data:', userAllocations);

      // Get all unique statuses
      const allStatuses = [...new Set(allAllocations.map(a => a.status))];
      console.log('📋 All statuses found:', allStatuses);

      // Get sample data with user names
      const sampleWithNames = await Promise.all(
        allAllocations.slice(0, 5).map(async (allocation) => {
          let fromName = 'Unknown';
          let toName = 'Unknown';
          
          try {
            if (allocation.allocatedBy) {
              const fromDoc = await getDoc(doc(db, 'users', allocation.allocatedBy));
              if (fromDoc.exists()) {
                const fromData = fromDoc.data();
                fromName = fromData.name || fromData.email || 'Unknown';
              }
            }
            
            if (allocation.allocatedTo) {
              const toDoc = await getDoc(doc(db, 'users', allocation.allocatedTo));
              if (toDoc.exists()) {
                const toData = toDoc.data();
                toName = toData.name || toData.email || 'Unknown';
              }
            }
          } catch (error) {
            console.warn('Error fetching user names:', error);
          }

          return {
            ...allocation,
            fromName,
            toName
          };
        })
      );

      setDebugInfo({
        currentUser: {
          uid: user.uid,
          email: user.email,
          role: user.employee?.roles?.[0]?.jobTitle || 'No role',
          name: user.employee?.firstName + ' ' + user.employee?.lastName || 'No name'
        },
        totalAllocations: allAllocations.length,
        userAllocations: userAllocations.length,
        allStatuses,
        sampleData: sampleWithNames,
        queryResults: `Found ${userAllocations.length} allocations for user ${user.uid}`
      });

      console.log('✅ Diagnostics complete');
      
    } catch (error) {
      console.error('❌ Error running diagnostics:', error);
      setError(String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <HydrationSafeLoader />
            <h3 className="text-lg font-semibold text-gray-700 mt-4 mb-2">
              Running Allocation Diagnostics
            </h3>
            <p className="text-gray-500 text-sm">
              Checking database connections and data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96 border-red-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Diagnostic Error
            </h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button onClick={runDiagnostics} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Diagnostics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Allocation System Diagnostics
          </h1>
          <p className="text-gray-600">
            Debug information to understand why allocation data might not be displaying.
          </p>
        </div>

        {/* Current User Info */}
        <Card className="mb-6">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center text-blue-800">
              <User className="w-5 h-5 mr-2" />
              Current User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-800">User ID:</h4>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">{debugInfo?.currentUser.uid}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Email:</h4>
                <p className="text-sm bg-gray-100 p-2 rounded">{debugInfo?.currentUser.email}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Role:</h4>
                <p className="text-sm bg-gray-100 p-2 rounded">{debugInfo?.currentUser.role}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Name:</h4>
                <p className="text-sm bg-gray-100 p-2 rounded">{debugInfo?.currentUser.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Statistics */}
        <Card className="mb-6">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center text-green-800">
              <Database className="w-5 h-5 mr-2" />
              Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white rounded-lg border">
                <h4 className="text-2xl font-bold text-blue-600">{debugInfo?.totalAllocations || 0}</h4>
                <p className="text-sm text-blue-800">Total Records</p>
                <p className="text-xs text-gray-500">In cash_allocations</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <h4 className="text-2xl font-bold text-green-600">{debugInfo?.userAllocations || 0}</h4>
                <p className="text-sm text-green-800">Your Allocations</p>
                <p className="text-xs text-gray-500">allocatedTo = your ID</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <h4 className="text-2xl font-bold text-purple-600">{debugInfo?.allStatuses.length || 0}</h4>
                <p className="text-sm text-purple-800">Unique Statuses</p>
                <p className="text-xs text-gray-500">Different status values</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <h4 className="text-2xl font-bold text-orange-600">
                  {debugInfo?.totalAllocations === 0 ? '❌' : '✅'}
                </h4>
                <p className="text-sm text-orange-800">Data Status</p>
                <p className="text-xs text-gray-500">
                  {debugInfo?.totalAllocations === 0 ? 'No data found' : 'Data exists'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Query Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Query for your allocations:</h4>
              <code className="text-sm">
                where('allocatedTo', '==', '{debugInfo?.currentUser.uid}')
              </code>
              <p className="text-sm text-gray-600 mt-2">{debugInfo?.queryResults}</p>
            </div>
          </CardContent>
        </Card>

        {/* All Statuses Found */}
        {debugInfo?.allStatuses && debugInfo.allStatuses.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>All Status Values Found</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-2">
                {debugInfo.allStatuses.map((status) => (
                  <span key={status} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                    {status}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sample Data */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sample Database Records</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!debugInfo?.sampleData || debugInfo.sampleData.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">No Data Found</h3>
                <p className="text-red-600">
                  The cash_allocations collection is empty.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  This means no allocations have been created yet by accountants.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Showing {debugInfo.sampleData.length} sample records:
                </p>
                {debugInfo.sampleData.map((record, index) => (
                  <div key={record.id} className="border rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold text-gray-800">Record {index + 1}</h5>
                        <p className="text-sm"><strong>ID:</strong> {record.id}</p>
                        <p className="text-sm"><strong>Amount:</strong> UGX {record.amount?.toLocaleString() || 'N/A'}</p>
                        <p className="text-sm"><strong>Status:</strong> {record.status || 'N/A'}</p>
                        <p className="text-sm"><strong>Description:</strong> {record.description || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm"><strong>From (ID):</strong> {record.allocatedBy || 'N/A'}</p>
                        <p className="text-sm"><strong>From (Name):</strong> {record.fromName}</p>
                        <p className="text-sm"><strong>To (ID):</strong> {record.allocatedTo || 'N/A'}</p>
                        <p className="text-sm"><strong>To (Name):</strong> {record.toName}</p>
                        <p className="text-sm"><strong>Created:</strong> {
                          record.createdAt?.toDate?.()?.toLocaleString() || 'N/A'
                        }</p>
                      </div>
                    </div>
                    
                    {/* Highlight if this is for current user */}
                    {record.allocatedTo === user.uid && (
                      <div className="mt-3 p-2 bg-green-100 rounded-md">
                        <p className="text-sm font-semibold text-green-800">
                          🎯 This allocation is for YOU!
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader className="bg-yellow-50">
            <CardTitle className="text-yellow-800">🛠️ Troubleshooting Guide</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {debugInfo?.totalAllocations === 0 ? (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">❌ No Allocation Data Found</h4>
                  <p className="text-red-700 text-sm mb-3">
                    The cash_allocations collection is empty. Here's how to fix this:
                  </p>
                  <ol className="text-sm text-red-700 list-decimal list-inside space-y-1">
                    <li>Go to the Accountant Dashboard</li>
                    <li>Find a cash close card with "💰 Allocate Funds" button</li>
                    <li>Click the button to create an allocation</li>
                    <li>The allocation will then appear here for PM approval</li>
                  </ol>
                </div>
              ) : debugInfo?.userAllocations === 0 ? (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">⚠️ No Allocations for Your User ID</h4>
                  <p className="text-orange-700 text-sm mb-3">
                    Allocations exist in the database but none are assigned to your user ID.
                  </p>
                  <p className="text-orange-700 text-sm">
                    <strong>Your ID:</strong> {debugInfo.currentUser.uid}
                  </p>
                  <p className="text-orange-700 text-sm mt-2">
                    Check that the accountant is allocating to the correct Purchase Manager.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">✅ Data Found - Query Issue</h4>
                  <p className="text-green-700 text-sm">
                    You have {debugInfo.userAllocations} allocations, but they might not be showing due to status filtering.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">🔧 Next Steps:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>1. Check the sample data above for your allocations</p>
                  <p>2. Verify the status values match expected ones</p>
                  <p>3. Test creating a new allocation from accountant dashboard</p>
                  <p>4. Return to regular daily allocation page once data is confirmed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button onClick={runDiagnostics} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-run Diagnostics
          </Button>
          <Button 
            onClick={() => window.location.href = '/dashboard/purchase-manager/daily-allocation'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Go to Daily Allocation
          </Button>
          <Button 
            onClick={() => window.location.href = '/dashboard/accountant'}
            variant="outline"
          >
            <User className="w-4 h-4 mr-2" />
            Go to Accountant Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}



