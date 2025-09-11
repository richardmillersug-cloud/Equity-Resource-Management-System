'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Database,
  Calendar,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  FileText
} from 'lucide-react';

interface DebugInfo {
  collectionName: string;
  documentCount: number;
  dateFields: string[];
  sampleDates: string[];
  sampleData: any[];
  error?: string;
}

export default function CashCloseDebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    // Set current date for reference
    const now = new Date();
    setCurrentDate(now.toISOString());
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: DebugInfo[] = [];
    
    // Collections to check
    const collectionsToCheck = [
      'cashCloses',
      'cashClose', 
      'comprehensiveCashClose',
      'allocation_PM',
      'withdrawals',
      'special_funds'
    ];

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`🔍 Checking collection: ${collectionName}`);
        
        // Get all documents (limited to avoid performance issues)
        const q = query(collection(db, collectionName), limit(10));
        const snapshot = await getDocs(q);
        
        const info: DebugInfo = {
          collectionName,
          documentCount: snapshot.size,
          dateFields: [],
          sampleDates: [],
          sampleData: []
        };

        // Analyze documents
        const dateFieldsSet = new Set<string>();
        const sampleDatesSet = new Set<string>();
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          info.sampleData.push({
            id: doc.id,
            ...data
          });
          
          // Find all date-like fields
          Object.keys(data).forEach(key => {
            const value = data[key];
            
            // Check if field contains date-related keywords
            if (key.toLowerCase().includes('date') || 
                key.toLowerCase().includes('time') ||
                key.toLowerCase().includes('created') ||
                key.toLowerCase().includes('updated')) {
              dateFieldsSet.add(key);
              
              // Try to extract date value
              if (value) {
                let dateStr = '';
                
                // Handle different date formats
                if (typeof value === 'string') {
                  dateStr = value;
                } else if (value?.toDate && typeof value.toDate === 'function') {
                  // Firestore Timestamp
                  dateStr = value.toDate().toISOString();
                } else if (value?.seconds) {
                  // Timestamp-like object
                  dateStr = new Date(value.seconds * 1000).toISOString();
                } else if (value instanceof Date) {
                  dateStr = value.toISOString();
                }
                
                if (dateStr) {
                  sampleDatesSet.add(`${key}: ${dateStr}`);
                }
              }
            }
            
            // Check for shift field
            if (key === 'shift' || key === 'shiftType') {
              info.dateFields.push(`${key}: ${value}`);
            }
          });
        });
        
        info.dateFields = Array.from(dateFieldsSet);
        info.sampleDates = Array.from(sampleDatesSet).slice(0, 5); // Limit to 5 samples
        
        // Try to get total count
        try {
          const allDocs = await getDocs(collection(db, collectionName));
          info.documentCount = allDocs.size;
        } catch (err) {
          console.log('Could not get total count');
        }
        
        results.push(info);
        
      } catch (error: any) {
        console.error(`Error checking ${collectionName}:`, error);
        results.push({
          collectionName,
          documentCount: 0,
          dateFields: [],
          sampleDates: [],
          sampleData: [],
          error: error.message
        });
      }
    }
    
    setDebugInfo(results);
    setLoading(false);
  };

  const checkSpecificDate = async (dateStr: string, shift: string) => {
    console.log(`🔍 Checking for cash close: ${dateStr} - ${shift}`);
    
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateStr);
    endDate.setHours(23, 59, 59, 999);
    
    const results: any[] = [];
    
    // Try different query approaches
    const queryApproaches = [
      {
        collection: 'cashCloses',
        field: 'businessDate',
        value: dateStr
      },
      {
        collection: 'cashCloses',
        field: 'date',
        value: dateStr
      },
      {
        collection: 'cashClose',
        field: 'date',
        value: dateStr
      },
      {
        collection: 'cashClose',
        field: 'businessDate', 
        value: dateStr
      }
    ];
    
    for (const approach of queryApproaches) {
      try {
        const snapshot = await getDocs(collection(db, approach.collection));
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Check if date matches (with various formats)
          let dateMatch = false;
          const fieldValue = data[approach.field];
          
          if (fieldValue) {
            if (typeof fieldValue === 'string') {
              dateMatch = fieldValue.includes(dateStr);
            } else if (fieldValue?.toDate) {
              const date = fieldValue.toDate();
              const dateString = date.toISOString().split('T')[0];
              dateMatch = dateString === dateStr;
            }
          }
          
          // Check shift match
          const shiftMatch = !shift || data.shift === shift || data.shiftType === shift ||
                           (data.shifts && data.shifts.some((s: any) => s.shift === shift));
          
          if (dateMatch || shiftMatch) {
            results.push({
              collection: approach.collection,
              field: approach.field,
              id: doc.id,
              dateMatch,
              shiftMatch,
              data
            });
          }
        });
        
      } catch (error) {
        console.error(`Error with approach ${approach.collection}.${approach.field}:`, error);
      }
    }
    
    return results;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-red-600" />
            Cash Close Debug Tool
          </h1>
          <p className="text-gray-600 mt-2">Diagnose cash close data issues</p>
        </div>
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {/* Current System Info */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Info className="w-5 h-5 mr-2" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Current Date & Time</p>
              <p className="font-mono text-lg">{currentDate}</p>
              <p className="text-sm text-gray-500">ISO Format: {new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected Date Format</p>
              <p className="font-mono text-lg">YYYY-MM-DD</p>
              <p className="text-sm text-gray-500">Example: {new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Note:</strong> The date "2025-09-07" is in the future. Current date is {new Date().toISOString().split('T')[0]}.
              Make sure you're selecting dates that have actual cash close data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Specific Date Check */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center text-purple-800">
            <Calendar className="w-5 h-5 mr-2" />
            Check Specific Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="date"
              id="checkDate"
              className="px-3 py-2 border border-gray-300 rounded-lg"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
            <select id="checkShift" className="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Any Shift</option>
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
            <Button
              onClick={async () => {
                const dateInput = document.getElementById('checkDate') as HTMLInputElement;
                const shiftInput = document.getElementById('checkShift') as HTMLSelectElement;
                const results = await checkSpecificDate(dateInput.value, shiftInput.value);
                console.log('Specific date check results:', results);
                alert(`Found ${results.length} potential matches. Check console for details.`);
              }}
            >
              Check Date
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      {debugInfo.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Diagnostic Results</h2>
          
          {debugInfo.map((info, idx) => (
            <Card key={idx} className={info.error ? 'border-red-200' : info.documentCount > 0 ? 'border-green-200' : 'border-yellow-200'}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    {info.collectionName}
                  </span>
                  <span className="text-sm font-normal">
                    {info.error ? (
                      <span className="text-red-600">Error</span>
                    ) : info.documentCount > 0 ? (
                      <span className="text-green-600">{info.documentCount} documents</span>
                    ) : (
                      <span className="text-yellow-600">Empty</span>
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {info.error ? (
                  <div className="text-red-600">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {info.error}
                  </div>
                ) : info.documentCount === 0 ? (
                  <div className="text-yellow-600">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    No documents found in this collection
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Date Fields Found:</p>
                      <div className="flex flex-wrap gap-2">
                        {info.dateFields.length > 0 ? (
                          info.dateFields.map((field, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {field}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No date fields found</span>
                        )}
                      </div>
                    </div>
                    
                    {info.sampleDates.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Sample Dates:</p>
                        <div className="space-y-1">
                          {info.sampleDates.map((date, i) => (
                            <div key={i} className="font-mono text-xs text-gray-600">
                              {date}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <details className="cursor-pointer">
                      <summary className="text-sm font-semibold text-gray-700">
                        Sample Data (First Document)
                      </summary>
                      {info.sampleData.length > 0 && (
                        <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(info.sampleData[0], null, 2)}
                        </pre>
                      )}
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Troubleshooting Guide */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-800">
            <AlertCircle className="w-5 h-5 mr-2" />
            Common Issues & Solutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="font-semibold text-orange-900">Issue: No cash close found for future date</p>
              <p className="text-sm text-orange-700 mt-1">
                Solution: Ensure you're selecting dates that have actual cash close data. 
                The date "2025-09-07" is in the future. Try selecting dates from the past week.
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="font-semibold text-orange-900">Issue: Date format mismatch</p>
              <p className="text-sm text-orange-700 mt-1">
                Solution: The system expects dates in YYYY-MM-DD format. 
                Check that your cash close data uses consistent date formatting.
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="font-semibold text-orange-900">Issue: Empty collections</p>
              <p className="text-sm text-orange-700 mt-1">
                Solution: If collections are empty, you need to create cash close records first. 
                Go to the cash close page and submit some test data.
              </p>
            </div>
            
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="font-semibold text-orange-900">Issue: Shift field mismatch</p>
              <p className="text-sm text-orange-700 mt-1">
                Solution: Ensure shift values are exactly "day" or "night" (lowercase). 
                Check that the shift field name is consistent (shift vs shiftType).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}









