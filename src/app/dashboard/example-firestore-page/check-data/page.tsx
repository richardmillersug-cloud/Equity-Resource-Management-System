'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Database, CheckCircle, XCircle, Search, AlertTriangle } from 'lucide-react';

export default function CheckDataPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    checkAllCollections();
  }, []);

  const checkAllCollections = async () => {
    setLoading(true);
    
    const collectionsToCheck = [
      'cashCloses',
      'comprehensiveCashClose', 
      'importedCashCloses',
      'cashClose',
      'cashAllocations',
      'expenses',
      'suppliers',
      'invoices',
      'payments'
    ];

    const results = [];
    let total = 0;

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`🔍 Checking collection: ${collectionName}`);
        
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, limit(1)); // Just check if any documents exist
        const querySnapshot = await getDocs(q);
        
        const count = querySnapshot.size;
        total += count;
        
        let sampleData = null;
        if (querySnapshot.docs.length > 0) {
          const doc = querySnapshot.docs[0];
          sampleData = {
            id: doc.id,
            data: doc.data()
          };
        }

        results.push({
          name: collectionName,
          count: count,
          exists: count > 0,
          sampleData,
          error: null
        });

        console.log(`✅ ${collectionName}: ${count} documents`);
        
      } catch (error: any) {
        console.error(`❌ Error checking ${collectionName}:`, error);
        results.push({
          name: collectionName,
          count: 0,
          exists: false,
          sampleData: null,
          error: error.message
        });
      }
    }

    setCollections(results);
    setTotalDocuments(total);
    setLoading(false);
  };

  const mainCollection = collections.find(c => c.name === 'cashCloses');
  const hasMainData = mainCollection?.exists || false;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking collections for data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Collection Check</h1>
          <p className="text-gray-600 mt-1">Verifying if you have data in Firestore collections</p>
        </div>
        <button
          onClick={checkAllCollections}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Search className="h-4 w-4 mr-2" />
          Recheck
        </button>
      </div>

      {/* Main Status */}
      <div className={`rounded-lg border-2 p-6 ${
        hasMainData 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center">
          {hasMainData ? (
            <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600 mr-4" />
          )}
          <div>
            <h2 className={`text-xl font-bold ${hasMainData ? 'text-green-900' : 'text-red-900'}`}>
              {hasMainData ? 'YES - You Have Data!' : 'NO - No Data Found'}
            </h2>
            <p className={`mt-1 ${hasMainData ? 'text-green-700' : 'text-red-700'}`}>
              {hasMainData 
                ? `Found ${mainCollection.count} document(s) in the cashCloses collection`
                : 'The cashCloses collection appears to be empty'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Collection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Collections Checked</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{collections.length}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Collections with Data</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {collections.filter(c => c.exists).length}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Total Documents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalDocuments}</p>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Collection Details</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sample Data</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collections.map((collection) => (
                <tr key={collection.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Database className="h-4 w-4 text-gray-400 mr-2" />
                      <span className={`text-sm font-medium ${
                        collection.name === 'cashCloses' ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {collection.name}
                        {collection.name === 'cashCloses' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            PRIMARY
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {collection.error ? (
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-xs text-yellow-700">Error</span>
                      </div>
                    ) : collection.exists ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-700">Has Data</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-500">Empty</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {collection.error ? 'Error' : collection.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {collection.sampleData ? (
                      <div>
                        <div>ID: {collection.sampleData.id.substring(0, 8)}...</div>
                        {collection.sampleData.data.totalRevenue && (
                          <div>Revenue: UGX {collection.sampleData.data.totalRevenue.toLocaleString()}</div>
                        )}
                        {collection.sampleData.data.cashCloseTotal && (
                          <div>Total: UGX {collection.sampleData.data.cashCloseTotal.toLocaleString()}</div>
                        )}
                      </div>
                    ) : collection.error ? (
                      <span className="text-red-500">{collection.error}</span>
                    ) : (
                      'No data'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Next Steps</h3>
        {hasMainData ? (
          <div className="space-y-2 text-blue-800">
            <p>✅ Great! You have data in the cashCloses collection.</p>
            <p>🔗 <a href="/dashboard/example-firestore-page/data-display" className="underline">View your data table</a></p>
            <p>📊 <a href="/dashboard/accountant" className="underline">Go to accountant dashboard</a></p>
            <p>💰 <a href="/dashboard/accountant/cash-close" className="underline">Manage cash closes</a></p>
          </div>
        ) : (
          <div className="space-y-2 text-blue-800">
            <p>❌ No data found in the cashCloses collection.</p>
            <p>📝 <a href="/dashboard/accountant/cash-close" className="underline">Create your first cash close</a></p>
            <p>🔧 <a href="/dashboard/example-firestore-page" className="underline">Initialize database</a></p>
            <p>📋 Check if you need to create some test data first.</p>
          </div>
        )}
      </div>
    </div>
  );
}












