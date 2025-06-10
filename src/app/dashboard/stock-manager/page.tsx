'use client';

import React, { useState, useEffect } from 'react';
import { StockManagerQueries } from '../../../lib/firebase/role-based-queries';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Archive
} from 'lucide-react';

export default function StockManagerDashboard() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [damageReports, setDamageReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStockManagerData = async () => {
      try {
        setLoading(true);
        
        // Load inventory overview
        const inventoryData = await StockManagerQueries.getInventoryOverview();
        setInventory(inventoryData);

        // Load damage reports
        const damageData = await StockManagerQueries.getDamageReports();
        setDamageReports(damageData);

        setLoading(false);
      } catch (err) {
        console.error('Error loading stock manager data:', err);
        setError('Failed to load stock manager dashboard data');
        setLoading(false);
      }
    };

    loadStockManagerData();

    // Set up real-time subscription for inventory
    const unsubscribe = StockManagerQueries.subscribeInventoryOverview((data) => {
      setInventory(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK': return 'text-red-600 bg-red-100';
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'LOW': return 'text-yellow-600 bg-yellow-100';
      case 'MEDIUM': return 'text-blue-600 bg-blue-100';
      case 'ADEQUATE': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStockLevelIcon = (level: string) => {
    switch (level) {
      case 'OUT_OF_STOCK': return <XCircle className="h-4 w-4" />;
      case 'CRITICAL': return <AlertTriangle className="h-4 w-4" />;
      case 'LOW': return <TrendingDown className="h-4 w-4" />;
      case 'MEDIUM': return <Clock className="h-4 w-4" />;
      case 'ADEQUATE': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Calculate summary metrics
  const outOfStockItems = inventory.filter(item => item.stockLevel === 'OUT_OF_STOCK').length;
  const criticalItems = inventory.filter(item => item.stockLevel === 'CRITICAL').length;
  const lowStockItems = inventory.filter(item => item.stockLevel === 'LOW').length;
  const totalDamageValue = damageReports.reduce((sum, damage) => sum + (damage.totalDamageValue || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Inventory Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockItems}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Critical Stock</p>
              <p className="text-2xl font-bold text-gray-900">{criticalItems}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Archive className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Damage Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalDamageValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Update Stock Levels</h3>
                <p className="text-sm text-gray-500">Adjust inventory quantities</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Generate Reports</h3>
                <p className="text-sm text-gray-500">Create inventory reports</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Report Damage</h3>
                <p className="text-sm text-gray-500">Log damaged inventory</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Inventory Status Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suggested Reorder
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.slice(0, 20).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.itemName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{item.itemCode || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.restockThreshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStockLevelColor(item.stockLevel)}`}>
                        {getStockLevelIcon(item.stockLevel)}
                        <span className="ml-1">{item.stockLevel.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.suggestedReorder > 0 ? item.suggestedReorder : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Damage Reports */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Damage Reports</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Damaged
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Ago
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {damageReports.slice(0, 15).map((damage) => (
                  <tr key={damage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(damage.damageDate?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {damage.itemName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{damage.itemCode || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {damage.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${damage.totalDamageValue?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        damage.daysAgo <= 7 
                          ? 'text-red-800 bg-red-100' 
                          : damage.daysAgo <= 30 
                          ? 'text-yellow-800 bg-yellow-100'
                          : 'text-gray-800 bg-gray-100'
                      }`}>
                        {damage.daysAgo} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 