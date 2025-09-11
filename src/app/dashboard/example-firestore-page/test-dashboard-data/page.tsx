'use client';

import React, { useState, useEffect } from 'react';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { Database, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function TestDashboardDataPage() {
  const [testResults, setTestResults] = useState<any>({
    loading: true,
    cashClosesCount: 0,
    cashClosesData: [],
    totalRevenue: 0,
    totalNetworkPayments: 0,
    totalSpecialFunds: 0,
    error: null
  });

  useEffect(() => {
    testDashboardData();
  }, []);

  const testDashboardData = async () => {
    try {
      setTestResults(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('🧪 Testing dashboard data loading...');
      
      const simpleCashCloseService = new SimpleCashCloseService();
      const cashClosesData = await simpleCashCloseService.getAllCashClosesSimple();
      
      console.log('📊 Cash closes loaded:', cashClosesData.length);
      console.log('📋 Sample data:', cashClosesData[0]);
      
      // Calculate totals like dashboard does
      const totalRevenue = cashClosesData.reduce((sum, cashClose) => sum + (Number(cashClose?.totalRevenue) || 0), 0);
      const totalNetworkPayments = cashClosesData.reduce((sum, cashClose) => sum + (Number(cashClose?.totalNetworkPayments) || 0), 0);
      const totalSpecialFunds = cashClosesData.reduce((sum, cashClose) => sum + (Number(cashClose?.specialFunds) || 0), 0);
      
      setTestResults({
        loading: false,
        cashClosesCount: cashClosesData.length,
        cashClosesData: cashClosesData.slice(0, 5), // First 5 for display
        totalRevenue,
        totalNetworkPayments,
        totalSpecialFunds,
        error: null
      });
      
      console.log('✅ Dashboard calculations:', {
        totalRevenue,
        totalNetworkPayments,
        totalSpecialFunds
      });
      
    } catch (error: any) {
      console.error('❌ Dashboard test failed:', error);
      setTestResults(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Data Test</h1>
          <p className="text-gray-600 mt-1">Testing if cash close data loads correctly for dashboard</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={testDashboardData}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-test
          </button>
          <a
            href="/dashboard/accountant"
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Go to Dashboard
          </a>
        </div>
      </div>

      {/* Test Status */}
      <div className={`rounded-lg border-2 p-6 ${
        testResults.loading 
          ? 'bg-blue-50 border-blue-200' 
          : testResults.error
          ? 'bg-red-50 border-red-200'
          : testResults.cashClosesCount > 0
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center">
          {testResults.loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-4"></div>
          ) : testResults.error ? (
            <XCircle className="h-8 w-8 text-red-600 mr-4" />
          ) : testResults.cashClosesCount > 0 ? (
            <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
          ) : (
            <XCircle className="h-8 w-8 text-yellow-600 mr-4" />
          )}
          
          <div>
            <h2 className={`text-xl font-bold ${
              testResults.loading 
                ? 'text-blue-900' 
                : testResults.error
                ? 'text-red-900'
                : testResults.cashClosesCount > 0
                ? 'text-green-900'
                : 'text-yellow-900'
            }`}>
              {testResults.loading 
                ? 'Testing Dashboard Data...' 
                : testResults.error
                ? 'Data Loading Failed'
                : testResults.cashClosesCount > 0
                ? `✅ SUCCESS! Found ${testResults.cashClosesCount} Cash Close Records`
                : 'No Data Found'
              }
            </h2>
            <p className={`mt-1 ${
              testResults.loading 
                ? 'text-blue-700' 
                : testResults.error
                ? 'text-red-700'
                : testResults.cashClosesCount > 0
                ? 'text-green-700'
                : 'text-yellow-700'
            }`}>
              {testResults.loading 
                ? 'Loading cash close data from Firestore...' 
                : testResults.error
                ? testResults.error
                : testResults.cashClosesCount > 0
                ? `Data is ready to display on dashboard including document 8Ee1osab9EGqBETlqV9o`
                : 'The cashCloses collection appears empty'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Summary (if data loaded) */}
      {!testResults.loading && !testResults.error && testResults.cashClosesCount > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Preview (What You'll See)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Database className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(testResults.totalRevenue)}</p>
                <p className="text-xs text-gray-400 mt-1">From {testResults.cashClosesCount} cash closes</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Network Money</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(testResults.totalNetworkPayments)}</p>
                <p className="text-xs text-gray-400 mt-1">All network payments</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Special Funds</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(testResults.totalSpecialFunds)}</p>
                <p className="text-xs text-gray-400 mt-1">User-configured amounts</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Cash Close Records</p>
                <p className="text-2xl font-bold text-gray-900">{testResults.cashClosesCount}</p>
                <p className="text-xs text-gray-400 mt-1">Total documents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Data */}
      {!testResults.loading && testResults.cashClosesData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sample Cash Close Records</h3>
            <p className="text-sm text-gray-600 mt-1">First 5 records that will appear on dashboard</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network Money</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Special Funds</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testResults.cashClosesData.map((record: any, index: number) => (
                  <tr key={record.id || index} className={record.id === '8Ee1osab9EGqBETlqV9o' ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-900">
                      {record.id?.substring(0, 8)}...
                      {record.id === '8Ee1osab9EGqBETlqV9o' && (
                        <span className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs">YOUR DOC</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(record.totalRevenue || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.totalNetworkPayments || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.specialFunds || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.status || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Ready for Dashboard</h3>
        <div className="space-y-2 text-blue-800">
          {testResults.cashClosesCount > 0 ? (
            <>
              <p>✅ Your cash close data is ready to display on the accountant dashboard!</p>
              <p>📊 <a href="/dashboard/accountant" className="underline font-medium">Go to Accountant Dashboard</a> to see your data</p>
              <p>💰 The dashboard will now show your total revenue, network money, and special funds</p>
              <p>📋 Recent cash close records will appear in the table</p>
            </>
          ) : (
            <>
              <p>❌ No cash close data found. The dashboard will show empty.</p>
              <p>🔧 <a href="/dashboard/example-firestore-page/create-sample-data" className="underline">Create sample data</a> to test</p>
              <p>📝 <a href="/dashboard/accountant/cash-close" className="underline">Create a real cash close</a> entry</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



































