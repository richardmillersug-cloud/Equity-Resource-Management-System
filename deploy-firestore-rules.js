#!/usr/bin/env node

/**
 * Script to deploy Firestore security rules
 * 
 * This script deploys the updated Firestore rules that include:
 * - Enhanced return notes permissions for Purchasing Managers
 * - Counters collection access for return note numbering
 * - Inventory management permissions for restocking operations
 * 
 * Usage:
 *   node deploy-firestore-rules.js
 * 
 * Prerequisites:
 *   - Firebase CLI installed and configured
 *   - Proper authentication with Firebase project
 *   - firestore.rules file in the root directory
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const RULES_FILE = 'firestore.rules';
const PROJECT_ID = 'equitysys-41320'; // Update this to match your Firebase project ID

console.log('🔥 Firebase Firestore Rules Deployment Script');
console.log('===============================================');

// Check if rules file exists
if (!fs.existsSync(RULES_FILE)) {
  console.error(`❌ Error: ${RULES_FILE} not found in current directory`);
  process.exit(1);
}

console.log(`✅ Found ${RULES_FILE}`);

// Read and validate rules file
try {
  const rulesContent = fs.readFileSync(RULES_FILE, 'utf8');
  console.log(`📄 Rules file size: ${(rulesContent.length / 1024).toFixed(2)} KB`);
  
  // Basic validation
  if (!rulesContent.includes('rules_version = \'2\'')) {
    console.warn('⚠️  Warning: Rules file might not have the correct version header');
  }
  
  if (!rulesContent.includes('returnNotes')) {
    console.error('❌ Error: Return notes rules not found in firestore.rules');
    process.exit(1);
  }
  
  if (!rulesContent.includes('Purchasing Manager')) {
    console.error('❌ Error: Purchasing Manager permissions not found in firestore.rules');
    process.exit(1);
  }
  
  console.log('✅ Rules file validation passed');
  
} catch (error) {
  console.error(`❌ Error reading rules file: ${error.message}`);
  process.exit(1);
}

// Deploy rules
console.log('\n🚀 Deploying Firestore rules...');
console.log(`📡 Target project: ${PROJECT_ID}`);

const deployCommand = `firebase deploy --only firestore:rules --project ${PROJECT_ID}`;

exec(deployCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Deployment failed: ${error.message}`);
    console.error('💡 Troubleshooting tips:');
    console.error('   - Make sure Firebase CLI is installed: npm install -g firebase-tools');
    console.error('   - Make sure you\'re logged in: firebase login');
    console.error('   - Check project ID in firebase.json or use: firebase use --add');
    process.exit(1);
  }

  if (stderr) {
    console.warn(`⚠️  Warnings: ${stderr}`);
  }

  console.log('\n✅ Deployment successful!');
  console.log(stdout);
  
  console.log('\n🎉 Firestore Rules Updated Successfully!');
  console.log('\n📋 New Permissions Summary:');
  console.log('   ✅ Purchasing Managers can read all return notes');
  console.log('   ✅ Purchasing Managers can update return note items for restocking');
  console.log('   ✅ Purchasing Managers can read counters for return note numbering');
  console.log('   ✅ Purchasing Managers can create/update inventory for restocking');
  console.log('   ✅ Enhanced inventory permissions for restocking operations');
  
  console.log('\n🔒 Security Features:');
  console.log('   ✅ Purchasing Managers can only update specific fields (items, inventory)');
  console.log('   ✅ Receivers maintain full control over return note status updates');
  console.log('   ✅ Admin permissions preserved for all collections');
  console.log('   ✅ Role-based access control enforced throughout');
  
  console.log('\n💼 Business Impact:');
  console.log('   📊 Purchasing Managers can now view all return notes');
  console.log('   📦 Purchasing Managers can track items needing restocking');
  console.log('   ✅ Purchasing Managers can mark items as restocked');
  console.log('   📈 Enhanced visibility into return trends and patterns');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Test the new return notes page: /dashboard/purchase-manager/return-notes');
  console.log('   2. Verify purchasing manager can see return notes data');
  console.log('   3. Test restocking functionality');
  console.log('   4. Monitor for any permission issues in console');
});

console.log('\nℹ️  Note: Deployment may take a few minutes to propagate globally');
console.log('💡 If you encounter permission issues, check the Firebase console Rules tab');