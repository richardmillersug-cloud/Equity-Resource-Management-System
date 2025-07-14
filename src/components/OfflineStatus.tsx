'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from 'lucide-react';
import { OfflineUtils } from '../lib/firebase/offline-queries';

interface OfflineStatusProps {
  className?: string;
  showDetails?: boolean;
}

export default function OfflineStatus({ className = '', showDetails = false }: OfflineStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState({ syncing: false, pending: 0, failed: 0 });
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Initial status
    setIsOnline(OfflineUtils.isOnline());
    setSyncStatus(OfflineUtils.getSyncStatus());

    // Set up network status listeners
    const unsubscribeOnline = OfflineUtils.onOnline(() => {
      setIsOnline(true);
      setLastSyncTime(new Date());
      // Update sync status after a brief delay to allow sync to start
      setTimeout(() => {
        setSyncStatus(OfflineUtils.getSyncStatus());
      }, 500);
    });

    const unsubscribeOffline = OfflineUtils.onOffline(() => {
      setIsOnline(false);
    });

    // Periodic sync status updates
    const statusInterval = setInterval(() => {
      setSyncStatus(OfflineUtils.getSyncStatus());
    }, 2000);

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      clearInterval(statusInterval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsManualSyncing(true);
    try {
      await OfflineUtils.forceSync();
      setLastSyncTime(new Date());
      setSyncStatus(OfflineUtils.getSyncStatus());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }
    
    if (syncStatus.syncing || isManualSyncing) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    
    if (syncStatus.pending > 0) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    
    if (syncStatus.failed > 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline Mode';
    }
    
    if (syncStatus.syncing || isManualSyncing) {
      return 'Syncing...';
    }
    
    if (syncStatus.pending > 0) {
      return `${syncStatus.pending} pending`;
    }
    
    if (syncStatus.failed > 0) {
      return `${syncStatus.failed} failed`;
    }
    
    return 'All synced';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600 bg-red-50 border-red-200';
    if (syncStatus.syncing || isManualSyncing) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (syncStatus.pending > 0) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (syncStatus.failed > 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  if (!showDetails) {
    // Compact status indicator
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    );
  }

  // Detailed status panel
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <h3 className="font-medium text-gray-900">
            {isOnline ? 'Online' : 'Offline'}
          </h3>
        </div>
        
        <button
          onClick={() => setShowSyncDetails(!showSyncDetails)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showSyncDetails ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Status Summary */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        {isOnline && (
          <button
            onClick={handleManualSync}
            disabled={syncStatus.syncing || isManualSyncing}
            className="text-sm px-3 py-1 bg-white border border-current rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${(syncStatus.syncing || isManualSyncing) ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        )}
      </div>

      {/* Detailed Information */}
      {showSyncDetails && (
        <div className="mt-4 space-y-3">
          {/* Sync Statistics */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">{syncStatus.pending}</div>
              <div className="text-gray-500">Pending</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">{syncStatus.failed}</div>
              <div className="text-gray-500">Failed</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="font-medium text-gray-900">
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-gray-500">Status</div>
            </div>
          </div>

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Last sync:</span>
              <span>{lastSyncTime.toLocaleTimeString()}</span>
            </div>
          )}

          {/* Offline Mode Info */}
          {!isOnline && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Database className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 mb-1">
                    Working Offline
                  </div>
                  <div className="text-yellow-700">
                    Your changes are being saved locally and will sync automatically when you're back online.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Errors */}
          {syncStatus.failed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-red-800 mb-1">
                    Sync Issues
                  </div>
                  <div className="text-red-700">
                    {syncStatus.failed} action{syncStatus.failed !== 1 ? 's' : ''} failed to sync. 
                    They will be retried automatically.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-200">
            {isOnline && (
              <button
                onClick={handleManualSync}
                disabled={syncStatus.syncing || isManualSyncing}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${(syncStatus.syncing || isManualSyncing) ? 'animate-spin' : ''}`} />
                <span>Force Sync</span>
              </button>
            )}
            
            <button
              onClick={() => {
                if (confirm('This will clear all offline data. Are you sure?')) {
                  OfflineUtils.clearOfflineData();
                  setSyncStatus({ syncing: false, pending: 0, failed: 0 });
                }
              }}
              className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 