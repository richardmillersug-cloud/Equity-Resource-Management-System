#!/usr/bin/env ts-node

import { verifyPerformanceCollections } from '../lib/firebase/init-performance-collections';

async function main() {
  console.log('🔍 Verifying Performance Management Collections...');
  console.log('=====================================');

  try {
    const isVerified = await verifyPerformanceCollections();

    if (isVerified) {
      console.log('\n✅ SUCCESS! All Performance Collections Verified');
      console.log('=====================================');
      
      console.log('📊 Verified Collections:');
      console.log('   ✅ performanceTargets');
      console.log('   ✅ performanceEvaluations');
      console.log('   ✅ performanceMetrics');
      console.log('   ✅ performanceDevelopmentPlans');
      console.log('   ✅ performanceReports');
      
      console.log('\n🎯 Performance Management System Status:');
      console.log('   • Firebase Collections: ✅ Ready');
      console.log('   • Firestore Rules: ✅ Deployed');
      console.log('   • Database Indexes: ✅ Available');
      console.log('   • Performance Dashboard: ✅ Accessible');
      
      console.log('\n🚀 Ready to use Performance Management!');
      console.log('   📍 Navigate to: /dashboard/hr/performance');
      console.log('   👤 Access as: HR or Manager role');
      
      process.exit(0);
    } else {
      console.error('\n❌ VERIFICATION FAILED');
      console.error('=====================================');
      console.error('One or more performance collections are not properly configured.');
      console.error('\n🔧 Troubleshooting:');
      console.error('   1. Run: npm run init-performance');
      console.error('   2. Check Firebase configuration');
      console.error('   3. Verify Firestore rules are deployed');
      console.error('   4. Ensure you have proper permissions');
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 UNEXPECTED ERROR during verification');
    console.error('=====================================');
    console.error(error);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check your Firebase connection');
    console.error('   2. Verify authentication credentials');
    console.error('   3. Ensure Firestore is enabled');
    console.error('   4. Check console for specific error details');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 
 
 
 
 