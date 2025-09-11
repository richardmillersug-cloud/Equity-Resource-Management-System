'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AutomatedAllocationService } from '@/lib/firebase/automated-allocation-service';
import { 
  Database,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,
  Moon,
  Sun,
  Search,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';

interface CashCloseRecord {
  id: string;
  businessDate: string;
  shift: 'day' | 'night';
  totalCash: number;
  totalNetworkMoney: number;
  totalRevenue: number;
  source: string;
  allocated?: boolean;
}

export default function CashCloseQueryDashboard() {
  const [selectedDateRange, setSelectedDateRange] = useState<string>('7'); // days
  const [cashCloses, setCashCloses] = useState<CashCloseRecord[]>([]);
  const [allocationHistory, setAllocationHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCashCloses: 0,
    totalAllocated: 0,
    pendingAllocations: 0,
    totalRevenue: 0,
    totalCash: 0,
    totalNetwork: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [selectedDateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    try {
      // Load recent cash closes
      const days = parseInt(selectedDateRange);
      const recentCashCloses = await AutomatedAllocationService.getRecentCashCloses(days);
      
      // Load allocation history for the same period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const allocations = await AutomatedAllocationService.getAllocationHistory(
        startDate.toISOString().split('T')[0]
      );
      
      // Mark allocated cash closes
      const allocatedCashCloseIds = new Set(allocations.map(a => a.cashCloseId));
      const cashClosesWithStatus = recentCashCloses.map(cc => ({
        ...cc,
        allocated: allocatedCashCloseIds.has(cc.id)
      }));
      
      setCashCloses(cashClosesWithStatus);
      setAllocationHistory(allocations);
      
      // Calculate statistics
      const totalRevenue = cashClosesWithStatus.reduce((sum, cc) => sum + cc.totalRevenue, 0);
      const totalCash = cashClosesWithStatus.reduce((sum, cc) => sum + cc.totalCash, 0);
      const totalNetwork = cashClosesWithStatus.reduce((sum, cc) => sum + cc.totalNetworkMoney, 0);
      const allocated = cashClosesWithStatus.filter(cc => cc.allocated).length;
      const pending = cashClosesWithStatus.filter(cc => !cc.allocated).length;
      
      setStats({
        totalCashCloses: cashClosesWithStatus.length,
        totalAllocated: allocated,
        pendingAllocations: pending,
        totalRevenue,
        totalCash,
        totalNetwork
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getShiftIcon = (shift: 'day' | 'night') => {
    return shift === 'day' ? (
      <Sun className="w-4 h-4 text-yellow-500" />
    ) : (
      <Moon className="w-4 h-4 text-indigo-500" />
    );
  };

  const getStatusBadge = (allocated: boolean) => {
    return allocated ? (
      <span className="flex items-center text-green-600 text-xs">
        <CheckCircle className="w-3 h-3 mr-1" />
        Allocated
      </span>
    ) : (
      <span className="flex items-center text-orange-600 text-xs">
        <AlertCircle className="w-3 h-3 mr-1" />
        Pending
      </span>
    );
  };


  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Cash Close Query Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="1">Last 24 hours</option>
                <option value="3">Last 3 days</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </select>
              <Button onClick={loadDashboardData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cash Closes</p>
                <p className="text-2xl font-bold">{stats.totalCashCloses}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Allocated</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalAllocated}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingAllocations}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center mb-2">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                <span className="font-medium text-green-800">Total Cash</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalCash)}</p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                <span className="font-medium text-blue-800">Network Money</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.totalNetwork)}</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                <span className="font-medium text-purple-800">Average per Close</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(stats.totalCashCloses > 0 ? Math.round(stats.totalRevenue / stats.totalCashCloses) : 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Close Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Cash Close Query Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashCloses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No cash closes found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Shift</th>
                    <th className="text-left py-2 px-3">Source</th>
                    <th className="text-right py-2 px-3">Cash</th>
                    <th className="text-right py-2 px-3">Network</th>
                    <th className="text-right py-2 px-3">Total Revenue</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cashCloses.map((cc, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(cc.businessDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          {getShiftIcon(cc.shift)}
                          <span className="ml-2 capitalize">{cc.shift}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-xs text-gray-500">{cc.source}</span>
                      </td>
                      <td className="text-right py-2 px-3 font-medium">
                        {formatCurrency(cc.totalCash)}
                      </td>
                      <td className="text-right py-2 px-3">
                        {formatCurrency(cc.totalNetworkMoney)}
                      </td>
                      <td className="text-right py-2 px-3 font-bold">
                        {formatCurrency(cc.totalRevenue)}
                      </td>
                      <td className="text-center py-2 px-3">
                        {getStatusBadge(cc.allocated || false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={3} className="py-2 px-3">Totals</td>
                    <td className="text-right py-2 px-3">{formatCurrency(stats.totalCash)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(stats.totalNetwork)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(stats.totalRevenue)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation History */}
      {allocationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Allocation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allocationHistory.slice(0, 5).map((allocation, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(allocation.businessDate).toLocaleDateString()} - {allocation.shift} shift
                      </p>
                      <p className="text-xs text-gray-600">
                        PM: {allocation.pmName} | Processed by: {allocation.accountantName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(allocation.totalAllocated)}</p>
                    <p className="text-xs text-gray-600">
                      PM: {formatCurrency(allocation.pmAllocation)} | MEF: {formatCurrency(allocation.m_expenseFund)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


