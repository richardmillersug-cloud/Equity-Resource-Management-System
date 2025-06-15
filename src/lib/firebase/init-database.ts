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
    await InterfaceDatabaseConnector.createSampleDataForTesting();
    
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