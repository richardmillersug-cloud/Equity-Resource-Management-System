'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Filter,
  Search,
  Download,
  Eye,
  Plus,
  Banknote,
  Smartphone,
  University,
  CreditCard,
  RefreshCw,
  Sun,
  Moon,
  Building,
  Wifi,
  AlertCircle,
  BarChart3,
  PieChart,
  Target,
  Zap,
  X
} from 'lucide-react';
import { CashClose, subscribeToCashCloses, calculateProfitMetrics } from '../../lib/firebase/purchasing-manager-service';

interface CashTrackingInterfaceProps {
  className?: string;
}

interface CashFilters {
  shift: 'all' | 'day' | 'night';
  dateRange: 'all' | 'today' | 'week' | 'month';
  branch: 'all' | 'kyengera';
  search: string;
}

interface CashMetrics {
  totalDayCash: number;
  totalNightCash: number;
  totalNetworkMoney: number;
  totalShortage: number;
  totalExcess: number;
  profitMargin: number;
  estimatedProfit: number;
  averageDayClose: number;
  averageNightClose: number;
  shortagePercentage: number;
  excessPercentage: number;
}

export const CashTrackingInterface: React.FC<CashTrackingInterfaceProps> = ({ className = '' }) => {
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [filteredCashCloses, setFilteredCashCloses] = useState<CashClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CashFilters>({
    shift: 'all',
    dateRange: 'week',
    branch: 'all',
    search: ''
  });
  const [metrics, setMetrics] = useState<CashMetrics>({
    totalDayCash: 0,
    totalNightCash: 0,
    totalNetworkMoney: 0,
    totalShortage: 0,
    totalExcess: 0,
    profitMargin: 0.12,
    estimatedProfit: 0,
    averageDayClose: 0,
    averageNightClose: 0,
    shortagePercentage: 0,
    excessPercentage: 0
  });
  const [selectedCashClose, setSelectedCashClose] = useState<CashClose | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCashCloses((cashCloseData) => {
      setCashCloses(cashCloseData);
      setLoading(false);
      calculateMetrics(cashCloseData);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [cashCloses, filters]);

  const calculateMetrics = (cashCloseData: CashClose[]) => {
    const profitMetrics = calculateProfitMetrics(cashCloseData);
    const dayCloses = cashCloseData.filter(c => c.shift === 'day');
    const nightCloses = cashCloseData.filter(c => c.shift === 'night');
    
    const totalCash = profitMetrics.totalRevenue;
    const shortagePercentage = totalCash > 0 ? (profitMetrics.totalShortage / totalCash) * 100 : 0;
    const excessPercentage = totalCash > 0 ? (profitMetrics.totalExcess / totalCash) * 100 : 0;

    setMetrics({
      totalDayCash: profitMetrics.dayCash,
      totalNightCash: profitMetrics.nightCash,
      totalNetworkMoney: profitMetrics.networkMoney,
      totalShortage: profitMetrics.totalShortage,
      totalExcess: profitMetrics.totalExcess,
      profitMargin: profitMetrics.profitMargin,
      estimatedProfit: profitMetrics.estimatedProfit,
      averageDayClose: dayCloses.length > 0 ? profitMetrics.dayCash / dayCloses.length : 0,
      averageNightClose: nightCloses.length > 0 ? profitMetrics.nightCash / nightCloses.length : 0,
      shortagePercentage,
      excessPercentage
    });
  };

  const applyFilters = () => {
    let filtered = [...cashCloses];

    // Shift filter
    if (filters.shift !== 'all') {
      filtered = filtered.filter(cashClose => cashClose.shift === filters.shift);
    }

    // Branch filter
    if (filters.branch !== 'all') {
      filtered = filtered.filter(cashClose => cashClose.branchId === filters.branch);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(cashClose => {
        const closeDate = new Date(cashClose.date);
        switch (filters.dateRange) {
          case 'today':
            return closeDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return closeDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return closeDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cashClose =>
        cashClose.employeeId.toLowerCase().includes(searchLower) ||
        cashClose.branchId.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCashCloses(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getShiftIcon = (shift: string) => {
    return shift === 'day' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />;
  };

  const getShiftColor = (shift: string) => {
    return shift === 'day' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getVarianceColor = (shortage: number, excess: number) => {
    if (shortage > 0) return 'text-red-600';
    if (excess > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const handleViewDetails = (cashClose: CashClose) => {
    setSelectedCashClose(cashClose);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading cash tracking data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cash Close Tracking</h2>
              <p className="text-sm text-gray-600">Monitor day/night cash closes and network money</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Day Cash</p>
                <p className="text-lg font-bold text-yellow-900">{formatCurrency(metrics.totalDayCash)}</p>
              </div>
              <Sun className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Night Cash</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(metrics.totalNightCash)}</p>
              </div>
              <Moon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Network Money</p>
                <p className="text-lg font-bold text-purple-900">{formatCurrency(metrics.totalNetworkMoney)}</p>
              </div>
              <Smartphone className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Total Shortage</p>
                <p className="text-lg font-bold text-red-900">{formatCurrency(metrics.totalShortage)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Total Excess</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(metrics.totalExcess)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">Profit (12%)</p>
                <p className="text-lg font-bold text-indigo-900">{formatCurrency(metrics.estimatedProfit)}</p>
              </div>
              <Target className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by employee or branch..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Shift Filter */}
          <select
            value={filters.shift}
            onChange={(e) => setFilters({ ...filters, shift: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Shifts</option>
            <option value="day">Day Shift</option>
            <option value="night">Night Shift</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Branch Filter */}
          <select
            value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value as any })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Branches</option>
            <option value="kyengera">Kyengera</option>
          </select>
        </div>
      </div>

      {/* Cash Close List */}
      <div className="p-6">
        {filteredCashCloses.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cash closes found</h3>
            <p className="text-gray-600">No cash closes match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCashCloses.map((cashClose) => {
              const variance = cashClose.excess - cashClose.shortage;
              const networkTotal = cashClose.airtel + cashClose.mtn + cashClose.stanbicBank + 
                                 cashClose.equityBank + cashClose.absaBank + cashClose.pesaPal;
              
              return (
                <div
                  key={cashClose.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Shift Indicator */}
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getShiftColor(cashClose.shift)}`}>
                        {getShiftIcon(cashClose.shift)}
                        <span className="text-sm font-medium capitalize">{cashClose.shift}</span>
                      </div>
                      
                      {/* Cash Close Info */}
                      <div>
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatCurrency(cashClose.closeCash)}
                          </h3>
                          <span className="text-sm text-gray-600">
                            {formatDate(cashClose.date)} at {cashClose.time}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Building className="w-4 h-4" />
                            <span>{cashClose.branchId}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Banknote className="w-4 h-4" />
                            <span>Cash: {formatCurrency(cashClose.cashPresent)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Smartphone className="w-4 h-4" />
                            <span>Network: {formatCurrency(networkTotal)}</span>
                          </div>
                          {variance !== 0 && (
                            <div className={`flex items-center space-x-1 ${getVarianceColor(cashClose.shortage, cashClose.excess)}`}>
                              {variance > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              <span>
                                {variance > 0 ? 'Excess' : 'Shortage'}: {formatCurrency(Math.abs(variance))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(cashClose)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>

                  {/* Network Money Breakdown */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Network Money Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Airtel:</span>
                        <span className="font-medium">{formatCurrency(cashClose.airtel)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">MTN:</span>
                        <span className="font-medium">{formatCurrency(cashClose.mtn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stanbic:</span>
                        <span className="font-medium">{formatCurrency(cashClose.stanbicBank)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Equity:</span>
                        <span className="font-medium">{formatCurrency(cashClose.equityBank)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Absa:</span>
                        <span className="font-medium">{formatCurrency(cashClose.absaBank)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">PesaPal:</span>
                        <span className="font-medium">{formatCurrency(cashClose.pesaPal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedCashClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cash Close Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee ID:</span>
                      <span className="font-medium">{selectedCashClose.employeeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Branch:</span>
                      <span className="font-medium">{selectedCashClose.branchId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shift:</span>
                      <span className="font-medium capitalize">{selectedCashClose.shift}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(selectedCashClose.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{selectedCashClose.time}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Cash Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Close Cash:</span>
                      <span className="font-medium">{formatCurrency(selectedCashClose.closeCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedCashClose.expectedAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedCashClose.actualAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Present:</span>
                      <span className="font-medium">{formatCurrency(selectedCashClose.cashPresent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shortage:</span>
                      <span className="font-medium text-red-600">{formatCurrency(selectedCashClose.shortage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excess:</span>
                      <span className="font-medium text-green-600">{formatCurrency(selectedCashClose.excess)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Network Money Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Airtel Money:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.airtel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MTN Mobile Money:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.mtn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stanbic Bank:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.stanbicBank)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Equity Bank:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.equityBank)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Absa Bank:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.absaBank)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PesaPal:</span>
                    <span className="font-medium">{formatCurrency(selectedCashClose.pesaPal)}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total Network Money:</span>
                    <span>{formatCurrency(
                      selectedCashClose.airtel + selectedCashClose.mtn + selectedCashClose.stanbicBank + 
                      selectedCashClose.equityBank + selectedCashClose.absaBank + selectedCashClose.pesaPal
                    )}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashTrackingInterface; 