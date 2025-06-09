'use client';

import React, { useState } from 'react';
import { seedInitialData } from '../../lib/firebase/seed-data';

export default function SeedPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);
    setError(null);

    try {
      const data = await seedInitialData();
      setResult(`Successfully seeded ${data.branches.length} branches`);
    } catch (err: any) {
      setError(err.message || 'Failed to seed data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Seed Initial Data
        </h1>
        
        <p className="text-gray-600 mb-6 text-center">
          This will create sample branches and other initial data needed for the system.
        </p>

        {result && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{result}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <button
          onClick={handleSeed}
          disabled={isSeeding}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSeeding ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Seeding...
            </>
          ) : (
            'Seed Data'
          )}
        </button>

        <div className="mt-6 text-center">
          <a
            href="/auth"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go to Authentication
          </a>
        </div>
      </div>
    </div>
  );
} 