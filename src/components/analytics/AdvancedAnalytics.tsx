'use client';

import React, { useState, useMemo } from 'react';
import {
  Filter,
  Download,
  Calendar,
  Building2,
  Package,
  TrendingUp,
  BarChart3,
  PieChart,
  Eye,
  RefreshCw,
  Search,
  X,
  ChevronDown
} from 'lucide-react';

interface AdvancedAnalyticsProps {
  analyticsData: any;
  analysisResults: any[];
  onExport: (type: 'pdf' | 'excel' | 'csv') => void;
  onRefresh: () => void;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({
  analyticsData,
  analysisResults,
  onExport,
  onRefresh
}) => {
  // Filter states
  const [activeFilters, setActiveFilters] = useState({
    dateRange: 'all',
    branch: 'all',
    productSearch: '',
    revenueMin: '',
    revenueMax: '',
    showTopN: 10
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedChart, setSelectedChart] = useState('revenue');

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!analyticsData) return null;

    let filteredProducts = [...analyticsData.topProductsOverall];
    let filteredMonthly = [...analyticsData.monthlyChart];

    // Product search filter
    if (activeFilters.productSearch) {
      filteredProducts = filteredProducts.filter(product =>
        product.description.toLowerCase().includes(activeFilters.productSearch.toLowerCase()) ||
        product.ref.includes(activeFilters.productSearch)
      );
    }

    // Revenue range filter
    if (activeFilters.revenueMin) {
      const minRevenue = parseFloat(activeFilters.revenueMin);
      filteredProducts = filteredProducts.filter(product => product.totalRevenue >= minRevenue);
    }

    if (activeFilters.revenueMax) {
      const maxRevenue = parseFloat(activeFilters.revenueMax);
      filteredProducts = filteredProducts.filter(product => product.totalRevenue <= maxRevenue);
    }

    // Show top N filter
    filteredProducts = filteredProducts.slice(0, activeFilters.showTopN);

    return {
      ...analyticsData,
      topProductsOverall: filteredProducts,
      monthlyChart: filteredMonthly
    };
  }, [analyticsData, activeFilters]);

  // Advanced insights calculations
  const advancedInsights = useMemo(() => {
    if (!analyticsData || !analysisResults.length) return [];

    const insights = [];

    // Revenue trend analysis
    if (analyticsData.growthAnalysis.length > 0) {
      const avgGrowth = analyticsData.growthAnalysis.reduce((sum: number, g: any) => sum + parseFloat(g.revenueGrowth), 0) / analyticsData.growthAnalysis.length;
      insights.push({
        type: 'trend',
        title: 'Revenue Trend Analysis',
        value: `${avgGrowth.toFixed(1)}%`,
        description: `Average month-over-month growth`,
        status: avgGrowth > 0 ? 'positive' : 'negative',
        icon: TrendingUp
      });
    }

    // Product diversity
    const totalProducts = analyticsData.topProductsOverall.length;
    const top5Revenue = analyticsData.topProductsOverall.slice(0, 5).reduce((sum: number, p: any) => sum + p.totalRevenue, 0);
    const totalRevenue = analyticsData.summary.totalRevenue;
    const top5Percentage = (top5Revenue / totalRevenue) * 100;

    insights.push({
      type: 'diversity',
      title: 'Product Concentration',
      value: `${top5Percentage.toFixed(1)}%`,
      description: `Top 5 products account for ${top5Percentage.toFixed(1)}% of revenue`,
      status: top5Percentage > 80 ? 'warning' : 'good',
      icon: Package
    });

    // Transaction efficiency
    const avgTransactionValue = analyticsData.summary.totalRevenue / analyticsData.summary.totalTransactions;
    insights.push({
      type: 'efficiency',
      title: 'Average Transaction Value',
      value: `${avgTransactionValue.toLocaleString()} UGX`,
      description: 'Revenue per transaction',
      status: 'neutral',
      icon: BarChart3
    });

    // Monthly performance variance
    const monthlyRevenues = analyticsData.monthlyChart.map((m: any) => m.revenue);
    const avgMonthlyRevenue = monthlyRevenues.reduce((sum: number, r: number) => sum + r, 0) / monthlyRevenues.length;
    const variance = monthlyRevenues.reduce((sum: number, r: number) => sum + Math.pow(r - avgMonthlyRevenue, 2), 0) / monthlyRevenues.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = (standardDeviation / avgMonthlyRevenue) * 100;

    insights.push({
      type: 'stability',
      title: 'Revenue Stability',
      value: `${coefficientOfVariation.toFixed(1)}%`,
      description: 'Coefficient of variation (lower is more stable)',
      status: coefficientOfVariation < 20 ? 'good' : coefficientOfVariation < 40 ? 'warning' : 'poor',
      icon: PieChart
    });

    return insights;
  }, [analyticsData, analysisResults]);

  const resetFilters = () => {
    setActiveFilters({
      dateRange: 'all',
      branch: 'all',
      productSearch: '',
      revenueMin: '',
      revenueMax: '',
      showTopN: 10
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'positive':
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'negative':
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (!analyticsData) return null;

  return (
    <div className="space-y-8">
      {/* Advanced Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <Filter className="w-6 h-6 text-purple-600" />
            🔧 Advanced Analytics Controls
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onExport('pdf')}
            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            PDF Report
          </button>
          <button
            onClick={() => onExport('excel')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Excel Data
          </button>
          <button
            onClick={() => onExport('csv')}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            CSV Export
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🔍 Product Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={activeFilters.productSearch}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, productSearch: e.target.value }))}
                    placeholder="Search by name or ID..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Revenue Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💰 Revenue Range (UGX)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={activeFilters.revenueMin}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, revenueMin: e.target.value }))}
                    placeholder="Min"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <input
                    type="number"
                    value={activeFilters.revenueMax}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, revenueMax: e.target.value }))}
                    placeholder="Max"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Show Top N */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏆 Show Top Products
                </label>
                <select
                  value={activeFilters.showTopN}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, showTopN: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                  <option value={100}>Top 100</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📅 Date Range
                </label>
                <select
                  value={activeFilters.dateRange}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Months</option>
                  <option value="last3">Last 3 Months</option>
                  <option value="last6">Last 6 Months</option>
                  <option value="last12">Last 12 Months</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏪 Branch
                </label>
                <select
                  value={activeFilters.branch}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, branch: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Branches</option>
                  <option value="MAINSHOP">MAINSHOP</option>
                  <option value="SHOP2">SHOP2</option>
                </select>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(activeFilters.productSearch || activeFilters.revenueMin || activeFilters.revenueMax || activeFilters.showTopN !== 10) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Active Filters:</h4>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.productSearch && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Search: {activeFilters.productSearch}
                    </span>
                  )}
                  {activeFilters.revenueMin && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Min Revenue: {activeFilters.revenueMin} UGX
                    </span>
                  )}
                  {activeFilters.revenueMax && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Max Revenue: {activeFilters.revenueMax} UGX
                    </span>
                  )}
                  {activeFilters.showTopN !== 10 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Showing: Top {activeFilters.showTopN}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {advancedInsights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-lg p-6 border-2 shadow-sm ${getStatusColor(insight.status)}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <IconComponent className="w-6 h-6" />
                <h3 className="font-bold text-sm">{insight.title}</h3>
              </div>
              <p className="text-2xl font-bold mb-1">{insight.value}</p>
              <p className="text-xs opacity-75">{insight.description}</p>
            </div>
          );
        })}
      </div>

      {/* Chart Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">📊 Interactive Chart View</h3>
          <div className="flex gap-2">
            {[
              { id: 'revenue', label: '📈 Revenue Trends', icon: TrendingUp },
              { id: 'products', label: '🏆 Top Products', icon: Package },
              { id: 'growth', label: '📊 Growth Analysis', icon: BarChart3 },
              { id: 'branches', label: '🏪 Branch Comparison', icon: Building2 }
            ].map(chart => (
              <button
                key={chart.id}
                onClick={() => setSelectedChart(chart.id)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
                  selectedChart === chart.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <chart.icon className="w-4 h-4" />
                {chart.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="bg-gray-50 rounded-lg p-4 min-h-96">
          <div className="text-center text-gray-500 flex items-center justify-center h-full">
            <div>
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Interactive Chart: {selectedChart.toUpperCase()}</p>
              <p className="text-sm">Chart component will be rendered here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Results Summary */}
      {filteredData && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Filtered Results Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">📈 Total Revenue (Filtered)</h4>
              <p className="text-2xl font-bold text-green-900">
                {filteredData.topProductsOverall.reduce((sum: number, p: any) => sum + p.totalRevenue, 0).toLocaleString()} UGX
              </p>
              <p className="text-sm text-green-700">
                From {filteredData.topProductsOverall.length} products
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">📦 Products Shown</h4>
              <p className="text-2xl font-bold text-blue-900">
                {filteredData.topProductsOverall.length}
              </p>
              <p className="text-sm text-blue-700">
                Out of {analyticsData.topProductsOverall.length} total
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">⚡ Average Product Revenue</h4>
              <p className="text-2xl font-bold text-purple-900">
                {filteredData.topProductsOverall.length > 0
                  ? Math.round(filteredData.topProductsOverall.reduce((sum: number, p: any) => sum + p.totalRevenue, 0) / filteredData.topProductsOverall.length).toLocaleString()
                  : 0} UGX
              </p>
              <p className="text-sm text-purple-700">
                Per product
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};