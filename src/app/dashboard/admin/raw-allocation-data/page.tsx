'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Database, 
  Copy, 
  RefreshCw,
  Code,
  Eye
} from 'lucide-react';
import HydrationSafeLoader from '@/components/ui/HydrationSafeLoader';

export default function RawAllocationDataPage() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'json' | 'table'>('table');

  const loadRawData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Querying cash_allocations collection...');
      
      const allocationsQuery = query(
        collection(db, 'cash_allocations'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(allocationsQuery);
      
      console.log(`📊 Found ${snapshot.docs.length} documents`);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps to readable format
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
        approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString() || doc.data().approvedAt,
        activatedAt: doc.data().activatedAt?.toDate?.()?.toISOString() || doc.data().activatedAt,
      }));

      setRawData(data);
      console.log('✅ Raw data loaded:', data);
      
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRawData();
  }, []);

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('Data copied to clipboard!');
  };

  const copyAllData = () => {
    navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
    alert('All data copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <HydrationSafeLoader />
          <div className="ml-4 text-lg text-gray-600">Loading raw allocation data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            Raw Allocation Data
          </h1>
          <p className="text-gray-600 mt-2">Direct database query results from cash_allocations collection</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setViewMode(viewMode === 'table' ? 'json' : 'table')}
            variant="outline"
          >
            {viewMode === 'table' ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {viewMode === 'table' ? 'JSON View' : 'Table View'}
          </Button>
          <Button onClick={loadRawData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={copyAllData} variant="outline">
            <Copy className="w-4 h-4 mr-2" />
            Copy All
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-800">
              <strong>Error loading data:</strong> {error}
              <div className="mt-2 text-sm">
                <p>Possible causes:</p>
                <ul className="list-disc ml-4">
                  <li>Collection "cash_allocations" doesn't exist yet</li>
                  <li>No allocation records have been created</li>
                  <li>Permission issues</li>
                  <li>Firebase connection problems</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Database Query Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{rawData.length}</div>
              <div className="text-sm text-blue-800">Total Records</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {rawData.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-green-800">Total Amount (UGX)</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(rawData.map(item => item.allocatedTo)).size}
              </div>
              <div className="text-sm text-purple-800">Unique PMs</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {rawData.filter(item => item.status === 'active_for_use').length}
              </div>
              <div className="text-sm text-orange-800">Active Allocations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {rawData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Found</h3>
            <p className="text-gray-500">
              The cash_allocations collection is empty or doesn't exist yet.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Try creating an allocation from the accountant dashboard first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'json' ? (
            /* JSON View */
            <Card>
              <CardHeader>
                <CardTitle>Raw JSON Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rawData.map((record, index) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Record {index + 1}: {record.id}</h4>
                        <Button 
                          onClick={() => copyToClipboard(record)}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                        {JSON.stringify(record, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Table View */
            <Card>
              <CardHeader>
                <CardTitle>Allocation Records Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">From (ID)</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">To (ID)</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Created</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-xs font-mono">
                            {record.id.substring(0, 8)}...
                          </td>
                          <td className="border border-gray-300 px-4 py-2 font-semibold text-green-600">
                            UGX {(record.amount || 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 max-w-xs truncate">
                            {record.description || 'N/A'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              record.status === 'active_for_use' ? 'bg-green-100 text-green-800' :
                              record.status === 'approved_by_pm' ? 'bg-blue-100 text-blue-800' :
                              record.status === 'sent_to_pm' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs font-mono">
                            {record.allocatedBy?.substring(0, 8)}...
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-xs font-mono">
                            {record.allocatedTo?.substring(0, 8)}...
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            <Button 
                              onClick={() => copyToClipboard(record)}
                              size="sm"
                              variant="outline"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Console Commands */}
      <Card>
        <CardHeader>
          <CardTitle>Console Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Run this in your browser console to query directly:</p>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

async function checkAllocations() {
  const q = query(collection(db, 'cash_allocations'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  console.log('Total:', snapshot.docs.length);
  snapshot.docs.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Data:', doc.data());
  });
}

checkAllocations();`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



