'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Eye, 
  Database, 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  RefreshCw,
  Download,
  Search
} from 'lucide-react';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

// Allocation status types
type AllocationStatus = 
  | 'pending'
  | 'sending_to_pm' 
  | 'awaiting_pm_approval'
  | 'approved_by_pm'
  | 'active_for_use'
  | 'completed'
  | 'rejected';

interface AllocationRecord {
  id: string;
  amount: number;
  description: string;
  allocatedTo: string;
  allocatedBy: string;
  allocatedToName?: string;
  allocatedByName?: string;
  status: AllocationStatus;
  createdAt: any;
  updatedAt: any;
  approvedAt?: any;
  activatedAt?: any;
  pmNotes?: string;
}

export default function CashAllocationDataViewer() {
  const [allocations, setAllocations] = useState<AllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    byStatus: {} as {[key: string]: number},
    byPM: {} as {[key: string]: {count: number, amount: number}}
  });
  const [expandedRecord, setExpandedRecord] = useState<string>('');

  useEffect(() => {
    const loadAllocations = async () => {
      try {
        console.log('📊 Loading cash allocation data...');
        
        const allocationsQuery = query(
          collection(db, 'cash_allocations'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(allocationsQuery, async (snapshot) => {
          console.log('📊 Found', snapshot.docs.length, 'allocation records');
          
          const allocationData = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const data = docSnapshot.data();
              
              // Get user names for allocatedTo and allocatedBy
              let allocatedToName = 'Unknown';
              let allocatedByName = 'Unknown';
              
              try {
                // Get allocatedTo user name
                if (data.allocatedTo) {
                  const toUserDoc = await getDoc(doc(db, 'users', data.allocatedTo));
                  if (toUserDoc.exists()) {
                    const userData = toUserDoc.data();
                    allocatedToName = userData.name || userData.email || 'Unknown';
                  }
                }

                // Get allocatedBy user name  
                if (data.allocatedBy) {
                  const byUserDoc = await getDoc(doc(db, 'users', data.allocatedBy));
                  if (byUserDoc.exists()) {
                    const userData = byUserDoc.data();
                    allocatedByName = userData.name || userData.email || 'Unknown';
                  }
                }
              } catch (error) {
                console.error('Error fetching user data:', error);
              }

              return {
                id: docSnapshot.id,
                ...data,
                allocatedToName,
                allocatedByName
              } as AllocationRecord;
            })
          );
          
          setAllocations(allocationData);
          
          // Calculate statistics
          const totalAmount = allocationData.reduce((sum, alloc) => sum + alloc.amount, 0);
          const byStatus: {[key: string]: number} = {};
          const byPM: {[key: string]: {count: number, amount: number}} = {};
          
          allocationData.forEach(alloc => {
            // Count by status
            byStatus[alloc.status] = (byStatus[alloc.status] || 0) + 1;
            
            // Count by PM
            const pmName = alloc.allocatedToName || 'Unknown';
            if (!byPM[pmName]) {
              byPM[pmName] = { count: 0, amount: 0 };
            }
            byPM[pmName].count += 1;
            byPM[pmName].amount += alloc.amount;
          });
          
          setStats({
            total: allocationData.length,
            totalAmount,
            byStatus,
            byPM
          });
          
          setLoading(false);
          console.log('✅ Allocation data loaded successfully');
        });

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error loading allocation data:', error);
        setLoading(false);
      }
    };

    loadAllocations();
  }, []);

  const getStatusColor = (status: AllocationStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sending_to_pm': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'awaiting_pm_approval': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'approved_by_pm': return 'bg-green-100 text-green-800 border-green-200';
      case 'active_for_use': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: AllocationStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'sending_to_pm': return 'Sending to PM';
      case 'awaiting_pm_approval': return 'Awaiting PM Approval';
      case 'approved_by_pm': return 'Approved by PM';
      case 'active_for_use': return 'Active for Use';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Amount', 'Description', 'From', 'To', 'Status', 'Created', 'Updated', 'PM Notes'].join(','),
      ...allocations.map(alloc => [
        alloc.id,
        alloc.amount,
        `"${alloc.description}"`,
        `"${alloc.allocatedByName}"`,
        `"${alloc.allocatedToName}"`,
        alloc.status,
        alloc.createdAt?.toDate?.()?.toLocaleString() || 'N/A',
        alloc.updatedAt?.toDate?.()?.toLocaleString() || 'N/A',
        `"${alloc.pmNotes || 'N/A'}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash_allocations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <HydrationSafeLoader />
        <div className="ml-4 text-lg text-gray-600">Loading allocation data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cash Allocation Data</h1>
          <p className="text-gray-600 mt-2">View all allocation records from the database</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">UGX {stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <User className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Purchase Managers</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byPM).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Active Allocations</p>
                <p className="text-2xl font-bold">
                  {(stats.byStatus['approved_by_pm'] || 0) + (stats.byStatus['active_for_use'] || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="text-center p-4 rounded-lg border">
                <Badge className={getStatusColor(status as AllocationStatus)}>
                  {getStatusText(status as AllocationStatus)}
                </Badge>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PM Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Allocations by Purchase Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.byPM).map(([pmName, data]) => (
              <div key={pmName} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{pmName}</h4>
                  <p className="text-sm text-gray-600">{data.count} allocations</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    UGX {data.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Allocation Records */}
      <Card>
        <CardHeader>
          <CardTitle>All Allocation Records ({stats.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No allocation records found</p>
              <p className="text-gray-400 text-sm mt-2">
                Allocation records will appear here after cash is allocated to Purchase Managers
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg overflow-hidden">
                  <div 
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedRecord(
                      expandedRecord === allocation.id ? '' : allocation.id
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-lg text-green-600">
                            UGX {allocation.amount.toLocaleString()}
                          </h4>
                          <Badge className={getStatusColor(allocation.status)}>
                            {getStatusText(allocation.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-700 mb-2">{allocation.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">From:</span> {allocation.allocatedByName}
                          </div>
                          <div>
                            <span className="font-medium">To:</span> {allocation.allocatedToName}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {
                              allocation.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span> {
                              allocation.updatedAt?.toDate?.()?.toLocaleDateString() || 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRecord(expandedRecord === allocation.id ? '' : allocation.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {expandedRecord === allocation.id && (
                    <div className="border-t bg-gray-50 p-4">
                      <h5 className="font-medium mb-3">Full Record Details</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Document ID:</strong> {allocation.id}
                        </div>
                        <div>
                          <strong>Amount:</strong> UGX {allocation.amount.toLocaleString()}
                        </div>
                        <div>
                          <strong>Status:</strong> {allocation.status}
                        </div>
                        <div>
                          <strong>Allocated By (ID):</strong> {allocation.allocatedBy}
                        </div>
                        <div>
                          <strong>Allocated To (ID):</strong> {allocation.allocatedTo}
                        </div>
                        <div>
                          <strong>Created:</strong> {
                            allocation.createdAt?.toDate?.()?.toLocaleString() || 'N/A'
                          }
                        </div>
                        <div>
                          <strong>Updated:</strong> {
                            allocation.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'
                          }
                        </div>
                        {allocation.approvedAt && (
                          <div>
                            <strong>Approved:</strong> {
                              allocation.approvedAt?.toDate?.()?.toLocaleString()
                            }
                          </div>
                        )}
                        {allocation.activatedAt && (
                          <div>
                            <strong>Activated:</strong> {
                              allocation.activatedAt?.toDate?.()?.toLocaleString()
                            }
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <strong>Description:</strong>
                        <p className="mt-1 p-2 bg-white rounded border">{allocation.description}</p>
                      </div>
                      
                      {allocation.pmNotes && (
                        <div className="mt-4">
                          <strong>PM Notes:</strong>
                          <p className="mt-1 p-2 bg-white rounded border">{allocation.pmNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



