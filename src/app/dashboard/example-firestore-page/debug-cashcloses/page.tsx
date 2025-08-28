'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { authService } from '@/lib/firebase/auth';
import { Database, Search, AlertTriangle, CheckCircle, User, Key } from 'lucide-react';

export default function DebugCashClosesPage() {
  const [debugResults, setDebugResults] = useState<any>({
    firebaseConnection: null,
    collectionExists: null,
    documentCount: 0,
    documents: [],
    specificDocument: null,
    serviceTest: null,
    currentUser: null,
    permissions: null,
    error: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDebugTests();
  }, []);

  const runDebugTests = async () => {
    setLoading(true);
    const results: any = {};

    try {
      console.log('🔍 Starting debug tests...');

      // Test 1: Firebase connection
      try {
        results.firebaseConnection = !!db;
        console.log('✅ Firebase connection:', results.firebaseConnection);
      } catch (error) {
        results.firebaseConnection = false;
        results.error = 'Firebase connection failed';
      }

      // Test 2: Current user
      try {
        const currentUser = authService.getCurrentUser();
        results.currentUser = {
          exists: !!currentUser,
          uid: currentUser?.uid,
          email: currentUser?.email,
          branchId: currentUser?.employee?.branchId,
          roles: currentUser?.employee?.roles
        };
        console.log('👤 Current user:', results.currentUser);
      } catch (error) {
        results.currentUser = { exists: false, error: error.message };
      }

      // Test 3: Direct collection access
      try {
        console.log('📊 Testing direct collection access...');
        const collectionRef = collection(db, 'cashCloses');
        const snapshot = await getDocs(collectionRef);
        
        results.collectionExists = true;
        results.documentCount = snapshot.size;
        results.documents = snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data(),
          exists: doc.exists()
        }));
        
        console.log(`✅ Collection accessible: ${results.documentCount} documents found`);
        console.log('📋 Document IDs:', results.documents.map(d => d.id));
      } catch (error: any) {
        results.collectionExists = false;
        results.error = error.message;
        console.error('❌ Collection access failed:', error);
      }

      // Test 4: Specific document test
      try {
        console.log('🎯 Testing specific document: 8Ee1osab9EGqBETlqV9o');
        const docRef = doc(db, 'cashCloses', '8Ee1osab9EGqBETlqV9o');
        const docSnap = await getDoc(docRef);
        
        results.specificDocument = {
          exists: docSnap.exists(),
          id: docSnap.id,
          data: docSnap.exists() ? docSnap.data() : null
        };
        
        console.log('📄 Specific document result:', results.specificDocument);
      } catch (error: any) {
        results.specificDocument = { exists: false, error: error.message };
      }

      // Test 5: CashCloseService test
      try {
        console.log('🔧 Testing CashCloseService...');
        const cashCloseService = new CashCloseService();
        const serviceData = await cashCloseService.getAll();
        
        results.serviceTest = {
          success: true,
          count: serviceData.length,
          documents: serviceData.map(d => ({ id: d.id, totalRevenue: d.totalRevenue }))
        };
        
        console.log('✅ Service test successful:', results.serviceTest.count, 'documents');
      } catch (error: any) {
        results.serviceTest = { success: false, error: error.message };
        console.error('❌ Service test failed:', error);
      }

      // Test 6: Branch-specific query
      if (results.currentUser?.branchId) {
        try {
          console.log('🏢 Testing branch-specific query...');
          const cashCloseService = new CashCloseService();
          const branchData = await cashCloseService.getBranchCashCloses(results.currentUser.branchId);
          
          results.branchQuery = {
            success: true,
            branchId: results.currentUser.branchId,
            count: branchData.length,
            documents: branchData.map(d => ({ id: d.id, totalRevenue: d.totalRevenue }))
          };
          
          console.log('✅ Branch query successful:', results.branchQuery.count, 'documents');
        } catch (error: any) {
          results.branchQuery = { success: false, error: error.message };
        }
      }

      setDebugResults(results);
      
    } catch (error: any) {
      console.error('❌ Debug test failed:', error);
      setDebugResults({ ...results, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Running debug tests...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">CashCloses Collection Debug</h1>
          <p className="text-gray-600 mt-1">Diagnosing why existing data isn't showing up</p>
        </div>
        <button
          onClick={runDebugTests}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Search className="h-4 w-4 mr-2" />
          Re-run Tests
        </button>
      </div>

      {/* Known Issue Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <h3 className="text-yellow-800 font-medium">Known Issue</h3>
            <p className="text-yellow-700 mt-1">
              You can see document <code className="bg-yellow-100 px-1 rounded">8Ee1osab9EGqBETlqV9o</code> in Firebase Console, 
              but the system isn't displaying it. Let's find out why.
            </p>
          </div>
        </div>
      </div>

      {/* Debug Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Firebase Connection */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-medium">Firebase Connection</h3>
          </div>
          <div className="flex items-center">
            {debugResults.firebaseConnection ? (
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            )}
            <span className={debugResults.firebaseConnection ? 'text-green-700' : 'text-red-700'}>
              {debugResults.firebaseConnection ? 'Connected' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Current User */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <User className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-medium">Current User</h3>
          </div>
          {debugResults.currentUser?.exists ? (
            <div className="text-sm space-y-1">
              <p>✅ Authenticated</p>
              <p>📧 {debugResults.currentUser.email}</p>
              <p>🏢 Branch: {debugResults.currentUser.branchId || 'None'}</p>
            </div>
          ) : (
            <p className="text-red-700">❌ Not authenticated</p>
          )}
        </div>

        {/* Collection Access */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <Database className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-medium">Collection Access</h3>
          </div>
          {debugResults.collectionExists ? (
            <div className="text-sm space-y-1">
              <p className="text-green-700">✅ Collection accessible</p>
              <p className="font-medium">📊 {debugResults.documentCount} documents found</p>
              {debugResults.documents.length > 0 && (
                <div>
                  <p className="text-gray-600 mt-2">Document IDs:</p>
                  <div className="bg-gray-50 p-2 rounded text-xs max-h-20 overflow-y-auto">
                    {debugResults.documents.map((doc: any, i: number) => (
                      <div key={i} className={doc.id === '8Ee1osab9EGqBETlqV9o' ? 'font-bold text-blue-600' : ''}>
                        {doc.id} {doc.id === '8Ee1osab9EGqBETlqV9o' && '← YOUR DOCUMENT'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-700">❌ Access failed: {debugResults.error}</p>
          )}
        </div>

        {/* Specific Document Test */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <Key className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="font-medium">Your Document</h3>
          </div>
          {debugResults.specificDocument?.exists ? (
            <div className="text-sm space-y-1">
              <p className="text-green-700">✅ Document found!</p>
              <p>📄 ID: 8Ee1osab9EGqBETlqV9o</p>
              <p>💰 Revenue: {debugResults.specificDocument.data?.totalRevenue || 'N/A'}</p>
              <p>📅 Status: {debugResults.specificDocument.data?.status || 'N/A'}</p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-red-700">❌ Document not accessible</p>
              {debugResults.specificDocument?.error && (
                <p className="text-xs text-red-600 mt-1">{debugResults.specificDocument.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Service Test */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center mb-3">
            <Database className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="font-medium">CashCloseService</h3>
          </div>
          {debugResults.serviceTest?.success ? (
            <div className="text-sm space-y-1">
              <p className="text-green-700">✅ Service working</p>
              <p>📊 {debugResults.serviceTest.count} documents retrieved</p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-red-700">❌ Service failed</p>
              {debugResults.serviceTest?.error && (
                <p className="text-xs text-red-600 mt-1">{debugResults.serviceTest.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Branch Query */}
        {debugResults.branchQuery && (
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center mb-3">
              <Database className="h-5 w-5 text-teal-600 mr-2" />
              <h3 className="font-medium">Branch Query</h3>
            </div>
            {debugResults.branchQuery.success ? (
              <div className="text-sm space-y-1">
                <p className="text-green-700">✅ Branch query working</p>
                <p>🏢 Branch: {debugResults.branchQuery.branchId}</p>
                <p>📊 {debugResults.branchQuery.count} documents for this branch</p>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-red-700">❌ Branch query failed</p>
                <p className="text-xs text-red-600 mt-1">{debugResults.branchQuery.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Document Data */}
      {debugResults.documents.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">All Documents Found</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {debugResults.documents.map((doc: any, index: number) => (
                <div key={index} className={`p-3 rounded border ${
                  doc.id === '8Ee1osab9EGqBETlqV9o' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">
                      {doc.id}
                      {doc.id === '8Ee1osab9EGqBETlqV9o' && (
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs">YOUR DOCUMENT</span>
                      )}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {doc.exists ? 'Exists' : 'Missing'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Revenue: UGX {(doc.data?.totalRevenue || 0).toLocaleString()}</p>
                    <p>Status: {doc.data?.status || 'N/A'}</p>
                    <p>Created: {doc.data?.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                    <p>Branch: {doc.data?.branchId || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Solution */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-900 mb-3">💡 Solution</h3>
        <div className="space-y-2 text-green-800">
          {debugResults.collectionExists && debugResults.documentCount > 0 ? (
            <>
              <p>✅ Great news! I found {debugResults.documentCount} documents in the cashCloses collection.</p>
              <p>🔧 The issue might be with data filtering or user permissions.</p>
              <p>📊 <a href="/dashboard/example-firestore-page/data-display" className="underline">Try the direct data viewer</a></p>
              <p>🏠 <a href="/dashboard/accountant" className="underline">Check the accountant dashboard again</a></p>
            </>
          ) : (
            <>
              <p>❌ The system cannot access the cashCloses collection.</p>
              <p>🔒 This might be a permissions issue or Firebase configuration problem.</p>
              <p>💬 Please check your Firebase security rules and user authentication.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}












