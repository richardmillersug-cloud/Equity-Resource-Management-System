'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { CheckCircle, DollarSign, User, Calendar, Clock, XCircle } from 'lucide-react';

export default function TestAllocationFeed() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('🔍 Testing query for cash_allocations where allocatedTo =', user.uid);

    // Query for allocated funds needing confirmation
    const allocationsQuery = query(
      collection(db, 'cash_allocations'),
      where('allocatedTo', '==', user.uid),
      where('status', '==', 'allocated')
    );

    const unsubscribe = onSnapshot(allocationsQuery, (snapshot) => {
      const allocationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('✅ Query results:', allocationsData);
      setAllocations(allocationsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Query error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const confirmMoneyReceived = async (allocationId: string, amount: number) => {
    setProcessingIds(prev => new Set([...prev, allocationId]));
    
    try {
      await updateDoc(doc(db, 'cash_allocations', allocationId), {
        status: 'money_received',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      alert(`✅ Confirmed: UGX ${amount.toLocaleString()} money received!`);
      
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Error confirming receipt. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(allocationId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Allocation Data Feed Test
        </h1>
        
        {/* Replace the original div content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Loading...</h3>
              <p className="text-gray-500">Checking for allocated funds...</p>
            </div>
          ) : allocations.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check-big w-16 h-16 text-green-300 mx-auto mb-4" aria-hidden="true">
                <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                <path d="m9 11 3 3L22 4"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No allocated funds are waiting for your confirmation.</p>
              
              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-left">
                <p><strong>Debug:</strong></p>
                <p>User ID: {authService.getCurrentUser()?.uid}</p>
                <p>Query: cash_allocations where allocatedTo == user.uid AND status == 'allocated'</p>
                <p>Results: {allocations.length} records found</p>
              </div>
            </div>
          ) : (
            /* Show actual allocation data */
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700 mb-4">
                🎯 {allocations.length} Allocation{allocations.length !== 1 ? 's' : ''} Waiting for Confirmation
              </h3>
              
              {allocations.map((allocation) => (
                <div key={allocation.id} className="border rounded-lg p-4 bg-blue-50 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-2xl font-bold text-green-600 mb-1">
                        UGX {(allocation.amount || 0).toLocaleString()}
                      </h4>
                      <p className="text-gray-700 mb-2">{allocation.description || 'Daily operations fund'}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          From: Accountant
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {allocation.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Allocated
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => confirmMoneyReceived(allocation.id, allocation.amount)}
                      disabled={processingIds.has(allocation.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {processingIds.has(allocation.id) ? 'Confirming...' : 'Yes - Money Received'}
                    </button>
                    
                    <button 
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                      onClick={() => alert('Decline functionality - to be implemented')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      No - Decline
                    </button>
                  </div>
                  
                  {/* Debug info for each allocation */}
                  <div className="mt-3 p-2 bg-white rounded text-xs text-gray-500">
                    <p><strong>Debug:</strong> ID: {allocation.id}</p>
                    <p>Status: {allocation.status}</p>
                    <p>Cash Close ID: {allocation.cashCloseId}</p>
                    <p>Created: {allocation.createdAt?.toDate?.()?.toISOString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


