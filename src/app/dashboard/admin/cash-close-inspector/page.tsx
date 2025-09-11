'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CashCloseDocument {
  id: string;
  [key: string]: any;
}

export default function CashCloseInspectorPage() {
  const [documents, setDocuments] = useState<CashCloseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<CashCloseDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string>('');

  const loadDocuments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const db = getFirestore(getApp());
      const cashClosesRef = collection(db, 'cashCloses');

      // Get all documents (limit to 100 for performance)
      const q = query(cashClosesRef, orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);

      const docs: CashCloseDocument[] = [];
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDocument(docs[0]);
      }
    } catch (error) {
      setError(`Failed to load documents: ${error}`);
      console.error('Error loading cash close documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toLocaleString();
    if (value && typeof value === 'object' && value.toDate) {
      // Firestore Timestamp
      return value.toDate().toLocaleString();
    }
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      return `{${Object.keys(value).length} properties}`;
    }
    return String(value);
  };

  const getFieldType = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (value instanceof Date) return 'Date';
    if (value && typeof value === 'object' && value.toDate) return 'Timestamp';
    if (Array.isArray(value)) return 'Array';
    if (typeof value === 'object') return 'Object';
    return typeof value;
  };

  const getFieldBadgeColor = (fieldName: string): string => {
    const importantFields = [
      'id', 'cashCloseDate', 'businessDate', 'totalCashInTill',
      'totalRevenue', 'totalNetworkPayments', 'specialFunds', 'm_expenseFund',
      'purchasingManager', 'status', 'createdAt', 'updatedAt'
    ];

    if (importantFields.includes(fieldName)) return 'bg-blue-100 text-blue-800';
    if (fieldName.includes('total') || fieldName.includes('amount')) return 'bg-green-100 text-green-800';
    if (fieldName.includes('date') || fieldName.includes('time')) return 'bg-purple-100 text-purple-800';
    if (fieldName.includes('shift') || fieldName.includes('employee')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredDocuments = documents.filter(doc =>
    searchTerm === '' ||
    doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(doc).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cash Close Inspector</h1>
        <p className="text-gray-600">Inspect all fields in your cashCloses collection</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents ({filteredDocuments.length})</CardTitle>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <Button onClick={loadDocuments} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4">
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocument?.id === doc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="font-medium text-sm">{doc.id}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {doc.businessDate || doc.date || 'No date'}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {doc.status && (
                        <Badge variant="outline" className="text-xs">
                          {doc.status}
                        </Badge>
                      )}
                      {doc.shift && (
                        <Badge variant="outline" className="text-xs">
                          {doc.shift}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Details */}
        <div className="lg:col-span-2">
          {selectedDocument ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Details</CardTitle>
                <CardDescription>
                  ID: {selectedDocument.id}
                  {selectedDocument.businessDate && (
                    <span className="ml-4">Date: {selectedDocument.businessDate}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="fields" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="fields">All Fields</TabsTrigger>
                    <TabsTrigger value="json">JSON View</TabsTrigger>
                  </TabsList>

                  <TabsContent value="fields" className="space-y-4">
                    <div className="grid gap-4">
                      {Object.entries(selectedDocument)
                        .filter(([key]) => key !== 'id')
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => (
                          <div key={key} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={getFieldBadgeColor(key)}>
                                  {getFieldType(value)}
                                </Badge>
                                <span className="font-medium text-sm">{key}</span>
                              </div>
                              {key === 'specialFunds' && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  LEGACY FIELD
                                </Badge>
                              )}
                              {key === 'm_expenseFund' && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  NEW FIELD
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 font-mono bg-gray-50 p-2 rounded">
                              {formatValue(value)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="json">
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedDocument, (key, value) => {
                        if (value && typeof value === 'object' && value.toDate) {
                          return value.toDate().toISOString();
                        }
                        return value;
                      }, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-gray-500">Select a document to view its fields</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {documents.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Collection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
                <div className="text-sm text-gray-600">Total Documents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {documents.filter(doc => doc.m_expenseFund !== undefined).length}
                </div>
                <div className="text-sm text-gray-600">With New Field</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {documents.filter(doc => doc.specialFunds !== undefined).length}
                </div>
                <div className="text-sm text-gray-600">With Legacy Field</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {documents.filter(doc => doc.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





