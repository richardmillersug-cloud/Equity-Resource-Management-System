#!/usr/bin/env node

/**
 * Create Cash Close Index Script
 *
 * This script creates the required composite index for the cashCloses collection
 * that filters by status and orders by createdAt.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Cash Close Index Creation Script');
console.log('====================================\n');

// The exact URL from the error message
const INDEX_URL = 'https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=ClJwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2Nhc2hDbG9zZXMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg';

console.log('📊 Required Index Details:');
console.log('===========================');
console.log('Collection: cashCloses');
console.log('Fields:');
console.log('  • status (Ascending)');
console.log('  • createdAt (Descending)');
console.log('  • __name__ (Ascending)');
console.log('');

console.log('🚀 Index Creation Options:');
console.log('===========================');
console.log('');
console.log('Option 1: Direct Firebase Console (Recommended)');
console.log('-----------------------------------------------');
console.log('1. Click this link to create the index directly:');
console.log('');
console.log(`🔗 ${INDEX_URL}`);
console.log('');
console.log('2. Wait for the index to be created (5-30 minutes)');
console.log('3. Refresh your allocations page');
console.log('');

console.log('Option 2: Programmatic Creation');
console.log('--------------------------------');
console.log('If you have Firebase Admin SDK access, run:');
console.log('');
console.log('npm install firebase-admin');
console.log('node create-index-programmatically.js');
console.log('');

console.log('⚠️  IMPORTANT NOTES:');
console.log('==================');
console.log('• The index will take 5-30 minutes to build');
console.log('• Your app will show errors until the index is ready');
console.log('• You can check index status in Firebase Console > Firestore > Indexes');
console.log('• Once ready, the allocations page will work automatically');
console.log('');

console.log('📋 What this index enables:');
console.log('==========================');
console.log('• Queries cash closes with status = "submitted"');
console.log('• Orders results by creation time (most recent first)');
console.log('• Powers the automated allocation system');
console.log('• Enables faster loading of recent cash close data');
console.log('');

console.log('🎯 Next Steps:');
console.log('==============');
console.log('1. Create the index using Option 1 (click the link)');
console.log('2. Wait for index creation to complete');
console.log('3. Test the allocations page');
console.log('4. The error should be resolved!');
console.log('');

console.log('🔍 Alternative: Check Existing Indexes');
console.log('======================================');
console.log('If the index already exists, you can check in Firebase Console:');
console.log('Firebase Console > Firestore > Indexes');
console.log('Look for: cashCloses (status, createdAt, __name__)');
console.log('');

// Try to open the URL automatically (cross-platform)
try {
  const open = require('open');
  console.log('🌐 Opening Firebase Console automatically...');
  open(INDEX_URL);
} catch (error) {
  console.log('💡 To open automatically: npm install -g open-cli');
  console.log('   Then run: open-cli "' + INDEX_URL + '"');
}

console.log('\n✅ Script completed. Follow the instructions above to create the index.');

