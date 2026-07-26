'use client';

import { useEffect, useState } from 'react';

export default function DatabaseLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        // IMPORTANT:
        // This app previously auto-seeded Firestore with "test" data on first load.
        // That behavior can create "system-generated" records (e.g. cash closes with test_emp_001)
        // in real environments. We now *only* expose optional dev-only helpers when explicitly enabled.

        const enableDevDbTools =
          process.env.NODE_ENV !== 'production' &&
          process.env.NEXT_PUBLIC_ENABLE_DEV_DB_TOOLS === 'true';

        if (enableDevDbTools && typeof window !== 'undefined') {
          await import('../lib/firebase/init-database');
          console.log('🧪 Dev DB tools enabled (NEXT_PUBLIC_ENABLE_DEV_DB_TOOLS=true)');
          console.log('ℹ️ No data is auto-created. Use window.initDB.* manually if needed.');
        }

        setIsLoaded(true);
      } catch (err) {
        console.error('Database loading error:', err);
        setError(err instanceof Error ? err.message : 'Unknown database error');
        setIsLoaded(true); // Still set loaded to prevent infinite loading
      }
    };

    loadDatabase();
  }, []);

  // Return null - this is just a loader component
  if (error) {
    console.warn('Database loader warning:', error);
  }

  return null;
} 