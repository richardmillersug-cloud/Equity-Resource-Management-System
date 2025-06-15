'use client';

import { useEffect, useState } from 'react';
import '../lib/firebase/init-database';

export default function DatabaseLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        // Import the initialization functions
        const { quickDatabaseSetup } = await import('../lib/firebase/init-database');
        
        // Check if database is already initialized
        if (typeof window !== 'undefined') {
          const hasInit = localStorage.getItem('db-initialized');
          
          if (!hasInit) {
            console.log('🚀 First-time database initialization...');
            await quickDatabaseSetup();
            localStorage.setItem('db-initialized', 'true');
            console.log('✅ Database initialized and cached');
          } else {
            console.log('📊 Database already initialized, loading connections...');
          }
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