'use client';

import React, { useState, useEffect } from 'react';
import { OfflineReceiverQueries, OfflineUtils } from '../../../lib/firebase/offline-queries';
import OfflineStatus from '../../../components/OfflineStatus';
import { 
  Wifi, 
  WifiOff, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Database,
  TestTube,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package
} from 'lucide-react';

export default function OfflineTestPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    supplierId: 'test-supplier',
    receiverId: 'test-receiver',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    status: 'pending',
    priority: 'medium',
    totalValue: 1000,
    itemCount: 5,
    contactPerson: 'Test Contact',
    contactPhone: '+256700000000',
    notes: 'Test delivery created offline'
  });

  useEffect(() => {
    setIsOnline(OfflineUtils.isOnline());
    
    const unsubscribeOnline = OfflineUtils.onOnline(() => {
      setIsOnline(true);
      addTestResult('Network', 'Back online', 'success');
    });

    const unsubscribeOffline = OfflineUtils.onOffline(() => {
      setIsOnline(false);
      addTestResult('Network', 'Gone offline', 'warning');
    });

    loadTestData();

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, []);

  const addTestResult = (category: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const result = {
      id: Date.now(),
      category,
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
      online: OfflineUtils.isOnline()
    };
    setTestResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  const loadTestData = async () => {
    setLoading(true);
    try {
      const [deliveriesData, inventoryData] = await Promise.all([
        OfflineReceiverQueries.getDeliveries({ limit: 10 }),
        OfflineReceiverQueries.getInventoryItems({ limit: 10 })
      ]);
      
      setDeliveries(deliveriesData);
      setInventory(inventoryData);
      addTestResult('Data', `Loaded ${deliveriesData.length} deliveries, ${inventoryData.length} inventory items`, 'success');
    } catch (error: any) {
      addTestResult('Data', `Failed to load data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testCreateDelivery = async () => {
    try {
      const deliveryId = await OfflineReceiverQueries.createDelivery(newDelivery);
      addTestResult('Create', `Created delivery: ${deliveryId}`, 'success');
      await loadTestData();
    } catch (error: any) {
      addTestResult('Create', `Failed to create delivery: ${error.message}`, 'error');
    }
  };

  const testUpdateDelivery = async () => {
    if (deliveries.length === 0) {
      addTestResult('Update', 'No deliveries to update', 'warning');
      return;
    }

    try {
      const delivery = deliveries[0];
      await OfflineReceiverQueries.updateDelivery(delivery.id, {
        status: 'in-transit',
        notes: `Updated offline at ${new Date().toLocaleTimeString()}`
      });
      addTestResult('Update', `Updated delivery: ${delivery.id}`, 'success');
      await loadTestData();
    } catch (error: any) {
      addTestResult('Update', `Failed to update delivery: ${error.message}`, 'error');
    }
  };

  const testUpdateInventory = async () => {
    if (inventory.length === 0) {
      addTestResult('Inventory', 'No inventory items to update', 'warning');
      return;
    }

    try {
      const item = inventory[0];
      const newStock = Math.floor(Math.random() * 100) + 1;
      await OfflineReceiverQueries.updateInventoryStock(item.id, newStock, 'Test update offline');
      addTestResult('Inventory', `Updated stock for ${item.itemName}: ${newStock}`, 'success');
      await loadTestData();
    } catch (error: any) {
      addTestResult('Inventory', `Failed to update inventory: ${error.message}`, 'error');
    }
  };

  const testForceSync = async () => {
    try {
      await OfflineUtils.forceSync();
      addTestResult('Sync', 'Force sync completed', 'success');
    } catch (error: any) {
      addTestResult('Sync', `Force sync failed: ${error.message}`, 'error');
    }
  };

  const clearTestResults = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all test results?\n\n' +
      `This will remove ${testResults.length} test result entries.`
    );

    if (!confirmed) return;

    setTestResults([]);
    addTestResult('System', 'Test results cleared', 'info');
  };

  const simulateOffline = () => {
    if ('serviceWorker' in navigator) {
      // This is a simulation - in real scenarios, users would disconnect their network
      addTestResult('Simulation', 'To test offline mode, disconnect your internet connection', 'info');
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const syncStatus = OfflineUtils.getSyncStatus();

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <TestTube className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offline Mode Testing</h1>
            <p className="text-gray-600">Test offline functionality and synchronization</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isOnline ? (
            <div className="flex items-center space-x-2 text-green-600">
              <Wifi className="h-5 w-5" />
              <span className="font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Status Panel */}
      <OfflineStatus showDetails={true} />

      {/* Test Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={loadTestData}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Load Data</span>
          </button>

          <button
            onClick={testCreateDelivery}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Delivery</span>
          </button>

          <button
            onClick={testUpdateDelivery}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Update Delivery</span>
          </button>

          <button
            onClick={testUpdateInventory}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Package className="h-4 w-4" />
            <span>Update Inventory</span>
          </button>

          <button
            onClick={testForceSync}
            disabled={!isOnline}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Force Sync</span>
          </button>

          <button
            onClick={simulateOffline}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <WifiOff className="h-4 w-4" />
            <span>Simulate Offline</span>
          </button>

          <button
            onClick={clearTestResults}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Results</span>
          </button>

          <button
            onClick={() => {
              const confirmed = window.confirm(
                'Are you sure you want to clear all offline cache data?\n\n' +
                'This will remove:\n' +
                '- Cached deliveries and inventory data\n' +
                '- Pending offline operations\n' +
                '- Local storage data\n\n' +
                'This action cannot be undone.'
              );
              
              if (confirmed) {
                OfflineUtils.clearOfflineData();
                addTestResult('System', 'Offline cache data cleared', 'warning');
              }
            }}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Database className="h-4 w-4" />
            <span>Clear Cache</span>
          </button>
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{syncStatus.pending}</div>
            <div className="text-sm text-blue-800">Pending Actions</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{syncStatus.failed}</div>
            <div className="text-sm text-red-800">Failed Actions</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {syncStatus.syncing ? 'Syncing...' : 'Ready'}
            </div>
            <div className="text-sm text-green-800">Sync Status</div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
          <span className="text-sm text-gray-500">{testResults.length} results</span>
        </div>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No test results yet. Run some tests to see results here.</p>
            </div>
          ) : (
            testResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                {getStatusIcon(result.type)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{result.category}</span>
                    <span className="text-sm text-gray-500">{result.timestamp}</span>
                    {result.online ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deliveries */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Deliveries ({deliveries.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{delivery.id}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    delivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    delivery.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {delivery.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{delivery.notes || 'No notes'}</p>
                {delivery._offline && (
                  <span className="text-xs text-orange-600 font-medium">📴 Offline</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Inventory ({inventory.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inventory.map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.itemName || item.id}</span>
                  <span className="text-sm text-gray-600">
                    Stock: {item.currentStock || 0}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{item.category || 'No category'}</p>
                {item._offline && (
                  <span className="text-xs text-orange-600 font-medium">📴 Offline</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Test Offline Mode</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>1. <strong>Load some data</strong> while online using the "Load Data" button</p>
          <p>2. <strong>Disconnect your internet</strong> (turn off WiFi or unplug ethernet)</p>
          <p>3. <strong>Try creating/updating</strong> deliveries and inventory items</p>
          <p>4. <strong>Reconnect to internet</strong> and watch automatic synchronization</p>
          <p>5. <strong>Use "Force Sync"</strong> to manually trigger synchronization</p>
          <p>6. <strong>Monitor the status</strong> indicators and test results</p>
        </div>
      </div>
    </div>
  );
} 