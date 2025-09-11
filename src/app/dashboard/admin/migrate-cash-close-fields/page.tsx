'use client';

import { useState } from 'react';
import { getFirestore, collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MigrateCashCloseFieldsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [results, setResults] = useState<{
    totalDocuments: number;
    updatedDocuments: number;
    skippedDocuments: number;
    errors: string[];
  } | null>(null);

  const migrateFields = async () => {
    setIsLoading(true);
    setProgress(0);
    setStatus('Starting migration...');
    setResults(null);

    try {
      const db = getFirestore(getApp());
      const cashClosesRef = collection(db, 'cashCloses');
      const snapshot = await getDocs(cashClosesRef);

      if (snapshot.empty) {
        setStatus('No documents found in cashCloses collection.');
        setIsLoading(false);
        return;
      }

      setStatus(`Found ${snapshot.size} documents to process...`);
      setProgress(10);

      const batch = writeBatch(db);
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      const totalDocs = snapshot.size;
      let processedCount = 0;

      for (const document of snapshot.docs) {
        const data = document.data();
        const docId = document.id;

        processedCount++;
        setProgress(10 + (processedCount / totalDocs) * 80);

        // Check if document has specialFunds field
        if (data.hasOwnProperty('specialFunds') && data.specialFunds !== undefined) {
          setStatus(`Processing document ${processedCount}/${totalDocs}: ${docId}`);

          try {
            // Update the document to add m_expenseFund field
            batch.update(doc(db, 'cashCloses', docId), {
              m_expenseFund: data.specialFunds,
              updatedAt: serverTimestamp()
            });
            updatedCount++;
          } catch (error) {
            errors.push(`Failed to update ${docId}: ${error}`);
          }
        } else {
          skippedCount++;
        }
      }

      // Execute the batch
      if (updatedCount > 0) {
        setStatus('Executing batch update...');
        setProgress(90);
        await batch.commit();
        setProgress(100);
        setStatus('Migration completed successfully!');
      } else {
        setStatus('No documents needed updating.');
        setProgress(100);
      }

      setResults({
        totalDocuments: totalDocs,
        updatedDocuments: updatedCount,
        skippedDocuments: skippedCount,
        errors
      });

    } catch (error) {
      setStatus(`Migration failed: ${error}`);
      console.error('Migration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Migrate Cash Close Fields</CardTitle>
          <CardDescription>
            Rename 'specialFunds' field to 'm_expenseFund' in all cashCloses documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This migration will:
              <ul className="mt-2 ml-4 list-disc">
                <li>Add the new 'm_expenseFund' field with the same value as 'specialFunds'</li>
                <li>Update the 'updatedAt' timestamp for modified documents</li>
                <li>Keep the original 'specialFunds' field intact</li>
              </ul>
              <p className="mt-2 font-semibold">
                After migration, you can run a cleanup to remove the old field if needed.
              </p>
            </AlertDescription>
          </Alert>

          {isLoading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{status}</p>
            </div>
          )}

          {!isLoading && !results && (
            <Button onClick={migrateFields} className="w-full">
              Start Migration
            </Button>
          )}

          {results && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <h3 className="font-semibold mb-2">Migration Results:</h3>
                  <ul className="space-y-1">
                    <li>Total documents: {results.totalDocuments}</li>
                    <li>Updated documents: {results.updatedDocuments}</li>
                    <li>Skipped documents: {results.skippedDocuments}</li>
                    {results.errors.length > 0 && (
                      <li>Errors: {results.errors.length}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              {results.errors.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <h4 className="font-semibold mb-2">Errors:</h4>
                    <ul className="space-y-1 text-red-600">
                      {results.errors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={() => window.location.reload()} variant="outline">
                Run Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
