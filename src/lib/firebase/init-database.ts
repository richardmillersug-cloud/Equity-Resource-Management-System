import { DatabaseInitialization } from './database-initialization';
import { InterfaceDatabaseConnector } from './interface-database-connector';

// =====================================================
// DATABASE INITIALIZATION SCRIPT
// =====================================================

/**
 * Initialize the complete database system
 */
export async function initializeDatabaseSystem(): Promise<void> {
  try {
    console.log('🚀 Starting database system initialization...');
    
    // Step 1: Initialize all collections with dummy data
    await DatabaseInitialization.initializeAllCollections();
    
    // Step 2: Test all interface connections
    const connectionStatus = await InterfaceDatabaseConnector.testAllConnections();
    console.log('🔗 Interface connection status:', connectionStatus);
    
    // Step 3: Verify database status
    const dbStatus = await DatabaseInitialization.getDatabaseStatus();
    console.log('📊 Database status:', dbStatus);
    
    console.log('✅ Database system initialization completed successfully!');
    console.log('🎯 All interfaces are now connected to Firestore with real-time data synchronization.');
    
  } catch (error) {
    console.error('❌ Database system initialization failed:', error);
    throw error;
  }
}

/**
 * Quick setup for development/testing
 */
export async function quickDatabaseSetup(): Promise<void> {
  try {
    console.log('⚡ Quick database setup starting...');
    
    // Initialize with minimal data for testing
    await DatabaseInitialization.initializeAllCollections();
    // NOTE: Do NOT create sample cash close / interface records automatically.
    // This was the source of "system-generated" cash closes (e.g. test_emp_001).
    // If you need sample interface data in dev, call InterfaceDatabaseConnector.createSampleDataForTesting()
    // manually from the console with explicit intent.
    
    console.log('⚡ Quick database setup completed!');
    
  } catch (error) {
    console.error('❌ Quick database setup failed:', error);
    throw error;
  }
}

// =====================================================
// AUTO-INITIALIZATION
// =====================================================

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
  // Expose console helpers only when explicitly enabled in non-production builds.
  const enableDevDbTools =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_DB_TOOLS === 'true';

  if (!enableDevDbTools) {
    // Avoid attaching global debug helpers in normal runtime.
    // (This file may still be imported manually in dev when the flag is enabled.)
  } else {
  console.log('🗄️ Database system loading...');
  
  // Add global functions for manual control
  (window as any).initDB = {
    full: initializeDatabaseSystem,
    quick: quickDatabaseSetup,
    status: DatabaseInitialization.getDatabaseStatus,
    test: InterfaceDatabaseConnector.testAllConnections,
    analytics: InterfaceDatabaseConnector.getDashboardAnalytics
  };
  
  console.log('✅ Database system loaded! Available commands:');
  console.log('- initDB.full() - Full database initialization');
  console.log('- initDB.quick() - Quick setup for testing');
  console.log('- initDB.status() - Check database status');
  console.log('- initDB.test() - Test interface connections');
  console.log('- initDB.analytics() - Get dashboard analytics');
  
  // Auto-run quick setup on first load (optional)
  // Uncomment the next line to auto-initialize on page load
  // quickDatabaseSetup().catch(console.error);
  }
} 