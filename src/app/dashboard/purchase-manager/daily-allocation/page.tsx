'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import {
  DollarSign,
  Calendar,
  Building,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Receipt,
  Banknote,
  Eye,
  Check,
  X
} from 'lucide-react';

interface CashAllocation {
  id: string;
  allocatedBy: string;
  allocatedTo: string;
  allocationDate: any;
  allocatorName: string;
  amount: number;
  branchId: string;
  createdAt: any;
  recipientName: string;
  status: 'pending' | 'accepted' | 'rejected';
  cashCloseId: string;
  businessDate: string;
  shiftType: 'day' | 'night';
  description: string;
  monthlyExpenseFund: number;
  profitDeduction: number;
  totalDeductions: number;
  cashCloseData?: {
    variance: number;
    note: string;
    totalRevenue: number;
    createdBy: string;
  };
}

export default function PurchaseManagerDailyAllocationPage() {
  const [allocations, setAllocations] = useState<CashAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [usingFallbackQuery, setUsingFallbackQuery] = useState(false);
  const [showIndexSuccess, setShowIndexSuccess] = useState(false);

  useEffect(() => {
    loadAllocations();
  }, []);

  const loadAllocations = async () => {
    setLoading(true);
    setError('');

    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        setError('You must be logged in to view allocations');
        return;
      }

      console.log('🔍 Loading pending allocations for PM:', currentUser.uid);

      let allocationsData: CashAllocation[] = [];
      let snapshot;

      try {
        // Primary query with composite index (requires Firebase Console setup)
        // Index needed: allocatedTo (ASC), status (ASC), createdAt (DESC)
        console.log('🔄 Attempting optimized query with composite index...');
        const allocationsQuery = query(
          collection(db, 'cashAllocations'),
          where('allocatedTo', '==', currentUser.uid),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );

        snapshot = await getDocs(allocationsQuery);
        console.log(`✅ Optimized query successful - Found ${snapshot.docs.length} pending allocations`);
        console.log('🎉 Composite index is working properly!');

        // Check if we were previously using fallback query
        if (usingFallbackQuery) {
          setShowIndexSuccess(true);
          // Hide success message after 5 seconds
          setTimeout(() => setShowIndexSuccess(false), 5000);
        }

        setUsingFallbackQuery(false); // Reset fallback flag since optimized query works

      } catch (indexError: any) {
        // Fallback: If composite index doesn't exist, use a simpler query and filter/sort in memory
        console.warn('⚠️ Composite index not found, using fallback query...');
        setUsingFallbackQuery(true);
        console.warn('🔗 To fix permanently, create index at: https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=Cldwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hBbGxvY2F0aW9ucy9pbmRleGVzL18QARoPCgthbGxvY2F0ZWRUbxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI');

        // Fallback query: Get all allocations for this PM, then filter and sort in memory
        const fallbackQuery = query(
          collection(db, 'cashAllocations'),
          where('allocatedTo', '==', currentUser.uid)
        );

        snapshot = await getDocs(fallbackQuery);

        // Filter for pending status and sort by createdAt in memory
        const allAllocations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const pendingAllocations = allAllocations
          .filter((alloc: any) => alloc.status === 'pending')
          .sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          });

        console.log(`📋 Fallback query found ${pendingAllocations.length} pending allocations`);
        console.log('⚡ Using fallback query (slower) - create composite index for better performance');

        // Convert back to snapshot format for compatibility
        snapshot = {
          docs: pendingAllocations.map(alloc => ({
            id: alloc.id,
            data: () => alloc
          }))
        };
      }

      // Process allocations and fetch corresponding cash close data
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const allocation: CashAllocation = {
          id: doc.id,
          allocatedBy: data.allocatedBy || '',
          allocatedTo: data.allocatedTo || '',
          allocationDate: data.allocationDate,
          allocatorName: data.allocatorName || 'Unknown',
          amount: data.amount || 0,
          branchId: data.branchId || '',
          createdAt: data.createdAt,
          recipientName: data.recipientName || 'Unknown',
          status: data.status || 'pending',
          cashCloseId: data.cashCloseId || '',
          businessDate: data.businessDate || '',
          shiftType: data.shiftType || 'day',
          description: data.description || '',
          monthlyExpenseFund: data.monthlyExpenseFund || 0,
          profitDeduction: data.profitDeduction || 0,
          totalDeductions: data.totalDeductions || 0
        };

        // Fetch corresponding cash close data if cashCloseId exists
        if (data.cashCloseId) {
          try {
            console.log(`🔗 Fetching cash close data for: ${data.cashCloseId}`);
            const cashCloseDoc = await getDoc(doc(db, 'cashCloses', data.cashCloseId));

            if (cashCloseDoc.exists()) {
              const cashCloseData = cashCloseDoc.data();
              allocation.cashCloseData = {
                variance: cashCloseData.variance || 0,
                note: cashCloseData.note || '',
                totalRevenue: cashCloseData.totalRevenue || 0,
                createdBy: cashCloseData.createdBy || ''
              };
              console.log(`✅ Cash close data loaded for allocation ${doc.id}`);
            } else {
              console.warn(`⚠️ Cash close document ${data.cashCloseId} not found`);
            }
          } catch (cashCloseError) {
            console.warn(`⚠️ Error fetching cash close data for ${data.cashCloseId}:`, cashCloseError);
            // Continue without cash close data
          }
        }

        allocationsData.push(allocation);
      }

      setAllocations(allocationsData);
      console.log(`✅ Loaded ${allocationsData.length} pending allocations with cash close data`);

    } catch (error: any) {
      console.error('❌ Error loading allocations:', error);
      setError(`Failed to load allocations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationAction = async (allocationId: string, action: 'accepted' | 'rejected') => {
    setProcessing(allocationId);

    try {
      const allocationRef = doc(db, 'cashAllocations', allocationId);
      await updateDoc(allocationRef, {
        status: action,
        actionDate: serverTimestamp(),
        actionBy: authService.getCurrentUser()?.uid
      });

      // Update local state
      setAllocations(prev =>
        prev.map(alloc =>
          alloc.id === allocationId
            ? { ...alloc, status: action }
            : alloc
        )
      );

      console.log(`✅ Allocation ${allocationId} ${action}`);

    } catch (error: any) {
      console.error(`❌ Error ${action} allocation:`, error);
      setError(`Failed to ${action} allocation: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid Time';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            Unknown
          </span>
        );
    }
  };

  // Calculate stats (only showing pending allocations now)
  const stats = {
    totalPending: allocations.length,
    totalAmount: allocations.reduce((sum, a) => sum + a.amount, 0),
    totalMonthlyFunds: allocations.reduce((sum, a) => sum + a.monthlyExpenseFund, 0),
    averageVariance: allocations
      .filter(a => a.cashCloseData?.variance !== undefined)
      .reduce((sum, a, _, arr) => {
        const variance = a.cashCloseData?.variance || 0;
        return arr.length > 0 ? (sum + variance) / arr.length : 0;
      }, 0)
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <div className="ml-4 text-lg text-gray-600">Loading allocations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Banknote className="w-8 h-8 mr-3 text-green-500" />
            Pending Allocation Requests
          </h1>
          <p className="text-gray-600 mt-2">Review and accept allocated funds from cash closes with variance and notes</p>
        </div>
        <Button onClick={loadAllocations} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {showIndexSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              <strong>Performance Optimized!</strong>
            </div>
            <div className="mt-2 text-green-700 text-sm">
              Composite index detected and working properly. Query performance has been improved.
            </div>
          </CardContent>
        </Card>
      )}

      {usingFallbackQuery && !error && !showIndexSuccess && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center text-yellow-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <strong>Performance Notice:</strong> Using fallback query method.
            </div>
            <div className="mt-2 text-yellow-700 text-sm">
              For better performance, please create the required composite index in Firebase Console.
            </div>
            <div className="mt-3">
              <a
                href="https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=Cldwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hBbGxvY2F0aW9ucy9pbmRleGVzL18QARoPCgthbGxvY2F0ZWRUbxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Create Index Now
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <strong>{error}</strong>
            </div>
            {error.includes('index') && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-blue-800 text-sm mb-2">
                  <strong>🔧 Quick Fix Required:</strong> The database needs an index for optimal performance.
                </div>
                <a
                  href="https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=Cldwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hBbGxvY2F0aW9ucy9pbmRleGVzL18QARoPCgthbGxvY2F0ZWRUbxABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Create Index in Firebase Console
                </a>
                <div className="text-blue-700 text-xs mt-2">
                  This will improve query performance and is required for production use.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats.totalPending}</div>
                <div className="text-sm text-gray-600">Pending Allocations</div>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  UGX {stats.totalAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Allocated</div>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  UGX {stats.totalMonthlyFunds.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Monthly Funds</div>
              </div>
              <Banknote className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.averageVariance >= 0 ? '+' : ''}
                  UGX {stats.averageVariance.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Avg Variance</div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allocations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Allocation Requests ({allocations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">You have no pending allocation requests. All allocations have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            {formatDate(allocation.businessDate)} - {allocation.shiftType} shift
                          </span>
                        </div>
                        {getStatusBadge(allocation.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm text-gray-600 mb-1">Allocated Amount</div>
                          <div className="text-lg font-bold text-green-600">
                            UGX {allocation.amount.toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                          <div className="text-sm text-gray-600 mb-1">Monthly Expense Fund</div>
                          <div className="text-lg font-bold text-orange-600">
                            UGX {allocation.monthlyExpenseFund.toLocaleString()}
                          </div>
                        </div>

                        {allocation.cashCloseData && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="text-sm text-blue-600 mb-1">Total Revenue</div>
                            <div className="text-lg font-bold text-blue-700">
                              UGX {allocation.cashCloseData.totalRevenue.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cash Close Information */}
                      {allocation.cashCloseData && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                          <div className="flex items-center mb-3">
                            <Building className="w-4 h-4 mr-2 text-gray-500" />
                            <span className="font-medium text-gray-700">Cash Close Details</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Variance</div>
                              <div className={`text-lg font-bold ${
                                allocation.cashCloseData.variance >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {allocation.cashCloseData.variance >= 0 ? '+' : ''}
                                UGX {allocation.cashCloseData.variance.toLocaleString()}
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-gray-600 mb-1">Created By</div>
                              <div className="text-sm font-medium text-gray-800">
                                {allocation.cashCloseData.createdBy || 'Unknown'}
                              </div>
                            </div>
                          </div>

                          {allocation.cashCloseData.note && (
                            <div className="mt-3">
                              <div className="text-sm text-gray-600 mb-1">Note</div>
                              <div className="text-sm text-gray-800 bg-white p-2 rounded border">
                                {allocation.cashCloseData.note}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-sm text-gray-600 mb-2">
                        {allocation.description}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          <span>By: {allocation.allocatorName}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{formatTime(allocation.createdAt)}</span>
                        </div>
                      </div>

                      {allocation.cashCloseId && (
                        <div className="mt-2 text-xs text-gray-500">
                          Cash Close ID: {allocation.cashCloseId.slice(-8)}
                        </div>
                      )}
                    </div>

                    {allocation.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <Button
                          onClick={() => handleAllocationAction(allocation.id, 'accepted')}
                          disabled={processing === allocation.id}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          {processing === allocation.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={() => handleAllocationAction(allocation.id, 'rejected')}
                          disabled={processing === allocation.id}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {processing === allocation.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
