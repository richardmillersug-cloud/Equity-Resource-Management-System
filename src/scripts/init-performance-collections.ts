#!/usr/bin/env ts-node

import { initializePerformanceCollections } from '../lib/firebase/init-performance-collections';

async function main() {
  console.log('🚀 Starting Performance Management Collections Initialization...');
  console.log('=====================================');

  try {
    const result = await initializePerformanceCollections();

    if (result.success) {
      console.log('\n🎉 SUCCESS! Performance Management Collections Initialized');
      console.log('=====================================');
      console.log(`📊 Collections Created: ${result.collectionsCreated.length}`);
      result.collectionsCreated.forEach(collection => {
        console.log(`   ✅ ${collection}`);
      });
      console.log(`📈 Total Documents: ${result.documentsCreated}`);
      
      console.log('\n🔗 Available Collections:');
      console.log('   • performanceTargets - Employee performance goals');
      console.log('   • performanceEvaluations - Performance reviews and ratings');
      console.log('   • performanceMetrics - Tracked performance data');
      console.log('   • performanceDevelopmentPlans - Employee development goals');
      console.log('   • performanceReports - Generated performance reports');
      
      console.log('\n📝 Next Steps:');
      console.log('   1. Deploy Firestore rules: npm run deploy-rules');
      console.log('   2. Deploy indexes: npm run deploy-indexes');
      console.log('   3. Access Performance Management at: /dashboard/hr/performance');
      console.log('   4. Create targets and evaluations for your employees');
      
      process.exit(0);
    } else {
      console.error('\n❌ FAILED to initialize performance collections');
      console.error('=====================================');
      result.errors.forEach(error => {
        console.error(`   ❌ ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 UNEXPECTED ERROR during initialization');
    console.error('=====================================');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 
 
 
 
 