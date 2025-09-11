'use client';

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { CheckCircle, DollarSign, User, Calendar, Clock } from 'lucide-react';

export default function AllocationDataFeed() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('🔍 Querying cash_allocations for user:', user.uid);

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
      
      console.log('✅ Found allocated funds:', allocationsData.length);
      setAllocations(allocationsData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Query error:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-blue-300 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Loading...</h3>
          <p className="text-gray-500">Checking for allocated funds...</p>
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No allocated funds are waiting for your confirmation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          {allocations.length} Allocation{allocations.length !== 1 ? 's' : ''} Found
        </h3>
        
        {allocations.map((allocation) => (
          <div key={allocation.id} className="border rounded-lg p-4 bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-green-600 mb-1">
                  UGX {(allocation.amount || 0).toLocaleString()}
                </h4>
                <p className="text-gray-700 mb-2">{allocation.description || 'No description'}</p>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    From: Accountant
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {allocation.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Allocated
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button 
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                onClick={() => {
                  // Update status to money_received
                  console.log('Confirming money received for:', allocation.id);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Yes - Money Received
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center"
                onClick={() => {
                  // Decline allocation
                  console.log('Declining allocation:', allocation.id);
                }}
              >
                No - Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


