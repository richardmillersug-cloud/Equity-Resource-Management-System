'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  User,
  Calendar,
  Target
} from 'lucide-react';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

// Cash Allocation interface
interface CashAllocation {
  id: string;
  amount: number;
  description: string;
  allocatedTo: string;
  allocatedBy: string;
  allocatedByName?: string;
  status: 'sending_to_pm' | 'awaiting_pm_approval' | 'approved_by_pm' | 'active_for_use' | 'completed' | 'rejected';
  createdAt: any;
  updatedAt: any;
  approvedAt?: any;
  activatedAt?: any;
  pmNotes?: string;
}

export default function ActiveAllocationsDashboard() {
  const [allocations, setAllocations] = useState<CashAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;

    console.log('📊 Loading active allocations for PM:', user.uid);
    
    // Query cash_allocations collection for this PM
    const allocationsQuery = query(
      collection(db, 'cash_allocations'),
      where('allocatedTo', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(allocationsQuery, async (snapshot) => {
      try {
        const allocationsData = await Promise.all(
          snapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            
            // Get allocator name
            let allocatedByName = 'Unknown';
            try {
              const userDoc = await getDoc(doc(db, 'users', data.allocatedBy));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                allocatedByName = userData.name || userData.email || 'Unknown';
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }

            return {
              id: docSnapshot.id,
              ...data,
              allocatedByName
            } as CashAllocation;
          })
        );
        
        setAllocations(allocationsData);
        setLoading(false);
        
        console.log('✅ Active allocations loaded:', {
          total: allocationsData.length,
          pending: allocationsData.filter(a => a.status === 'awaiting_pm_approval').length,
          approved: allocationsData.filter(a => a.status === 'approved_by_pm').length,
          active: allocationsData.filter(a => a.status === 'active_for_use').length
        });
        
      } catch (error) {
        console.error('Error loading allocations:', error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []); // Run once on mount

  const approveAllocation = async (allocation: CashAllocation) => {
    setProcessingIds(prev => new Set([...prev, allocation.id]));
    
    try {
      const allocationRef = doc(db, 'cash_allocations', allocation.id);
      
      await updateDoc(allocationRef, {
        status: 'approved_by_pm',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Allocation approved:', allocation.id);
      
    } catch (error) {
      console.error('Error approving allocation:', error);
      alert('Error approving allocation. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(allocation.id);
        return newSet;
      });
    }
  };

  const activateAllocation = async (allocation: CashAllocation) => {
    setProcessingIds(prev => new Set([...prev, allocation.id]));
    
    try {
      const allocationRef = doc(db, 'cash_allocations', allocation.id);
      
      await updateDoc(allocationRef, {
        status: 'active_for_use',
        activatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Allocation activated for daily use:', allocation.id);
      
    } catch (error) {
      console.error('Error activating allocation:', error);
      alert('Error activating allocation. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(allocation.id);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sending_to_pm': return 'bg-blue-100 text-blue-800';
      case 'awaiting_pm_approval': return 'bg-yellow-100 text-yellow-800';
      case 'approved_by_pm': return 'bg-green-100 text-green-800';
      case 'active_for_use': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sending_to_pm': return 'Sending to PM';
      case 'awaiting_pm_approval': return 'Awaiting Your Approval';
      case 'approved_by_pm': return 'Ready to Activate';
      case 'active_for_use': return 'Active for Daily Use';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <HydrationSafeLoader />
        <div className="ml-4 text-lg text-gray-600">Loading your allocations...</div>
      </div>
    );
  }

  // Group allocations by status
  const pendingApproval = allocations.filter(a => 
    a.status === 'sending_to_pm' || a.status === 'awaiting_pm_approval'
  );
  const readyToActivate = allocations.filter(a => a.status === 'approved_by_pm');
  const activeAllocations = allocations.filter(a => a.status === 'active_for_use');
  const completedAllocations = allocations.filter(a => 
    a.status === 'completed' || a.status === 'rejected'
  );

  // Calculate totals
  const totalPending = pendingApproval.reduce((sum, a) => sum + a.amount, 0);
  const totalReady = readyToActivate.reduce((sum, a) => sum + a.amount, 0);
  const totalActive = activeAllocations.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Cash Allocations</h1>
        <p className="text-gray-600 mt-2">Manage allocations from Accountants - Real data from cash_allocations table</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingApproval.length}</p>
                <p className="text-sm text-yellow-600">UGX {totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Ready to Activate</p>
                <p className="text-2xl font-bold">{readyToActivate.length}</p>
                <p className="text-sm text-green-600">UGX {totalReady.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Active for Use</p>
                <p className="text-2xl font-bold">{activeAllocations.length}</p>
                <p className="text-sm text-purple-600">UGX {totalActive.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Target className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold">{allocations.length}</p>
                <p className="text-sm text-gray-600">All time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingApproval.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">⏳ Pending Your Approval ({pendingApproval.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApproval.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-xl text-green-600">
                        UGX {allocation.amount.toLocaleString()}
                      </h4>
                      <p className="text-gray-700">{allocation.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span><User className="w-4 h-4 inline mr-1" />From: {allocation.allocatedByName}</span>
                        <span><Calendar className="w-4 h-4 inline mr-1" />
                          {allocation.createdAt?.toDate?.()?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(allocation.status)}>
                      {getStatusText(allocation.status)}
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={() => approveAllocation(allocation)}
                    disabled={processingIds.has(allocation.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {processingIds.has(allocation.id) ? 'Approving...' : 'Approve Allocation'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Activate */}
      {readyToActivate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ Ready to Activate ({readyToActivate.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {readyToActivate.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-xl text-green-600">
                        UGX {allocation.amount.toLocaleString()}
                      </h4>
                      <p className="text-gray-700">{allocation.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span><User className="w-4 h-4 inline mr-1" />From: {allocation.allocatedByName}</span>
                        <span><CheckCircle className="w-4 h-4 inline mr-1" />
                          Approved: {allocation.approvedAt?.toDate?.()?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => activateAllocation(allocation)}
                    disabled={processingIds.has(allocation.id)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    {processingIds.has(allocation.id) ? 'Activating...' : 'Activate for Daily Use'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Allocations */}
      {activeAllocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-600">💰 Active for Daily Use ({activeAllocations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeAllocations.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg p-4 bg-purple-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-xl text-purple-600">
                        UGX {allocation.amount.toLocaleString()}
                      </h4>
                      <p className="text-gray-700">{allocation.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <span><User className="w-4 h-4 inline mr-1" />From: {allocation.allocatedByName}</span>
                        <span><DollarSign className="w-4 h-4 inline mr-1" />
                          Activated: {allocation.activatedAt?.toDate?.()?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(allocation.status)}>
                      {getStatusText(allocation.status)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-purple-700 bg-white p-3 rounded-md">
                    <strong>💡 Ready for use:</strong> This allocation is now active and available for your daily purchasing operations.
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {allocations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Allocations Found</h3>
            <p className="text-gray-500">
              You haven't received any cash allocations yet.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This data comes directly from the cash_allocations table in Firebase.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-600">🔍 Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Your User ID:</strong> {authService.getCurrentUser()?.uid || 'Not logged in'}</p>
            <p><strong>Data Source:</strong> cash_allocations collection</p>
            <p><strong>Query:</strong> where('allocatedTo', '==', 'your_user_id')</p>
            <p><strong>Total Records Found:</strong> {allocations.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
