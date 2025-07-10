'use client';

import { useState } from 'react';
import { DatabaseInitialization } from '@/lib/firebase/database-initialization';

export default function InitializeDatabasePage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setStatus('Initializing database...');
    setLogs([]);
    
    try {
      addLog('🚀 Starting database initialization...');
      
      // Override console.log to capture logs
      const originalConsoleLog = console.log;
      console.log = (message: any) => {
        addLog(String(message));
        originalConsoleLog(message);
      };

      await DatabaseInitialization.initializeAllCollections();
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      addLog('✅ Database initialization completed successfully!');
      setStatus('✅ Complete! All HR collections have been created.');
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStatus('❌ Initialization failed. Check logs for details.');
    } finally {
      setIsInitializing(false);
    }
  };

  const checkStatus = async () => {
    try {
      setStatus('Checking database status...');
      const dbStatus = await DatabaseInitialization.getAllCollectionStatus();
      
      const hrCollections = ['employees', 'attendance', 'payroll', 'leaveRequests', 'barcodes'];
      const hrStatus = hrCollections.map(collection => ({
        name: collection,
        exists: dbStatus[collection]?.exists || false,
        count: dbStatus[collection]?.count || 0
      }));

      setLogs([
        'Database Status:',
        ...hrStatus.map(s => `${s.name}: ${s.exists ? '✅' : '❌'} (${s.count} records)`)
      ]);
      
      setStatus('Status check complete');
    } catch (error: any) {
      setStatus(`Error checking status: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🗄️ Database Initialization
          </h1>
          
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 mb-2">Current Status</h2>
              <p className="text-blue-800">{status || 'Ready to initialize'}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={initializeDatabase}
                disabled={isInitializing}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isInitializing ? '🔄 Initializing...' : '🚀 Initialize All Collections'}
              </button>
              
              <button
                onClick={checkStatus}
                disabled={isInitializing}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                📊 Check Status
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">What This Does:</h3>
              <ul className="text-yellow-800 space-y-1">
                <li>✅ Creates <strong>attendance</strong> collection with sample data</li>
                <li>✅ Creates <strong>payroll</strong> collection with sample data</li>
                <li>✅ Creates <strong>leaveRequests</strong> collection with sample data</li>
                <li>✅ Creates <strong>barcodes</strong> collection with sample data</li>
                <li>✅ Creates all other system collections</li>
                <li>✅ Adds sample employee with HR role</li>
              </ul>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Logs</h3>
                <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* HR Collections Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">HR Collections That Will Be Created:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-800">
                <div>
                  <strong>📋 attendance</strong>
                  <p className="text-sm">Employee check-in/out records</p>
                </div>
                <div>
                  <strong>💰 payroll</strong>
                  <p className="text-sm">Salary and payment records</p>
                </div>
                <div>
                  <strong>🏖️ leaveRequests</strong>
                  <p className="text-sm">Leave request management</p>
                </div>
                <div>
                  <strong>🏷️ barcodes</strong>
                  <p className="text-sm">Employee ID barcodes</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="border-t pt-4">
              <p className="text-gray-600">
                After initialization, you can access the HR dashboard at:{' '}
                <a href="/dashboard/hr" className="text-blue-600 hover:underline">
                  /dashboard/hr
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 