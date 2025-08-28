'use client';

import React, { useState, useEffect } from 'react';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { authService } from '@/lib/firebase/auth';
import { RefreshCw, Database, DollarSign, Calendar } from 'lucide-react';

export default function DataDisplayPage() {
  const [cashCloseData, setCashCloseData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCashCloseData();
  }, []);

  const loadCashCloseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading cash close data...');
      
      let data: any[] = [];
      
      // Try simple service first to avoid index issues
      try {
        const simpleCashCloseService = new SimpleCashCloseService();
        data = await simpleCashCloseService.getAllCashClosesSimple();
        console.log(`📊 Loaded ${data.length} cash closes using simple query`);
      } catch (error) {
        console.warn('⚠️ Simple query failed, trying regular service...', error);
        
        // Fallback to regular service
        const cashCloseService = new CashCloseService();
        const currentUser = authService.getCurrentUser();
        
        if (currentUser?.employee?.branchId) {
          // Get cash closes for the user's branch
          data = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
          console.log(`📊 Loaded ${data.length} cash closes for branch ${currentUser.employee.branchId}`);
        } else {
          // Get all cash closes if no specific branch
          data = await cashCloseService.getAll();
          console.log(`📊 Loaded ${data.length} total cash closes`);
        }
      }
      
      setCashCloseData(data);
      
      if (data.length > 0) {
        console.log('✅ Sample data:', data[0]);
      } else {
        console.log('⚠️ No cash close data found');
      }
      
    } catch (err: any) {
      console.error('❌ Error loading cash close data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number') return 'UGX 0';
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date instanceof Date) return date.toLocaleDateString();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate().toLocaleDateString();
    if (typeof date === 'string') return new Date(date).toLocaleDateString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString();
    return 'Invalid Date';
  };

  const getNetworkPaymentsSummary = (cashClose: any) => {
    let totalNetworkPayments = 0;
    let paymentCount = 0;

    if (cashClose.shifts && Array.isArray(cashClose.shifts)) {
      cashClose.shifts.forEach((shift: any) => {
        if (shift.tills && Array.isArray(shift.tills)) {
          shift.tills.forEach((till: any) => {
            if (till.networkPayments && Array.isArray(till.networkPayments)) {
              till.networkPayments.forEach((payment: any) => {
                totalNetworkPayments += payment.amount || 0;
                paymentCount++;
              });
            }
          });
        }
      });
    }

    return { totalNetworkPayments, paymentCount };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cash close data...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Cash Close Data Table</h1>
          <p className="text-gray-600 mt-1">Direct data from cashCloses collection</p>
        </div>
        <button
          onClick={loadCashCloseData}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Data</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-gray-600">Total Records</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{cashCloseData.length}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-gray-600">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(cashCloseData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0))}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm text-gray-600">Date Range</span>
          </div>
          <p className="text-sm text-gray-900 mt-1">
            {cashCloseData.length > 0 ? 
              `${formatDate(cashCloseData[cashCloseData.length - 1]?.cashCloseDate)} - ${formatDate(cashCloseData[0]?.cashCloseDate)}` : 
              'No data'
            }
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cash Close Records</h3>
          <p className="text-sm text-gray-600 mt-1">All data from cashCloses collection</p>
        </div>

        {cashCloseData.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Found</h3>
            <p className="mt-1 text-sm text-gray-500">
              The cashCloses collection appears to be empty. Create some cash close entries to see data here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Network Money</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Special Funds</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cashCloseData.map((record, index) => {
                  const networkSummary = getNetworkPaymentsSummary(record);
                  
                  return (
                    <tr key={record.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-900">
                        {record.id ? record.id.substring(0, 8) + '...' : `Row ${index + 1}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(record.cashCloseDate || record.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(record.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{formatCurrency(record.totalNetworkPayments || networkSummary.totalNetworkPayments)}</div>
                          {networkSummary.paymentCount > 0 && (
                            <div className="text-xs text-gray-500">{networkSummary.paymentCount} payments</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.taxAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.profitAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(record.specialFunds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === 'approved' || record.status === 'completed' 
                            ? 'text-green-600 bg-green-100'
                            : record.status === 'pending' || record.status === 'draft'
                            ? 'text-yellow-600 bg-yellow-100'
                            : record.status === 'rejected'
                            ? 'text-red-600 bg-red-100'
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          {record.status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(record.totalShortage || 0) > 0 && (
                          <span className="text-red-600">-{formatCurrency(record.totalShortage)}</span>
                        )}
                        {(record.totalExcess || 0) > 0 && (
                          <span className="text-green-600">+{formatCurrency(record.totalExcess)}</span>
                        )}
                        {(record.totalShortage || 0) === 0 && (record.totalExcess || 0) === 0 && (
                          <span className="text-gray-500">Balanced</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Data Preview */}
      {cashCloseData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Raw Data Preview</h3>
            <p className="text-sm text-gray-600 mt-1">First record structure</p>
          </div>
          <div className="p-6">
            <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
              {JSON.stringify(cashCloseData[0], null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
