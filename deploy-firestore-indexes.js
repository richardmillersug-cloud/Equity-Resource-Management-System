#!/usr/bin/env node

/**
 * Deploy Firestore Indexes Script
 * 
 * This script helps deploy the required Firestore indexes for the expense analytics functionality.
 * Run this after adding new indexes to firestore.indexes.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Firestore Index Deployment Script');
console.log('=====================================\n');

// Check if firestore.indexes.json exists
const indexesFile = path.join(__dirname, 'firestore.indexes.json');
if (!fs.existsSync(indexesFile)) {
  console.error('❌ firestore.indexes.json not found!');
  console.log('   Make sure you have the firestore.indexes.json file in the project root.');
  process.exit(1);
}

console.log('✅ Found firestore.indexes.json');

// Read and validate the indexes file
try {
  const indexesContent = fs.readFileSync(indexesFile, 'utf8');
  const indexesData = JSON.parse(indexesContent);
  
  console.log(`📊 Found ${indexesData.indexes.length} indexes in configuration`);
  
  // Show recent additions
  const expensesIndexes = indexesData.indexes.filter(idx => idx.collectionGroup === 'expenses');
  const specialFundsIndexes = indexesData.indexes.filter(idx => idx.collectionGroup === 'specialFundsTracker');
  
  console.log(`💰 Expenses collection indexes: ${expensesIndexes.length}`);
  console.log(`🏦 Special Funds Tracker indexes: ${specialFundsIndexes.length}`);
  
  if (expensesIndexes.length > 0) {
    console.log('   Recent expenses index fields:');
    expensesIndexes.forEach((idx, i) => {
      console.log(`   ${i + 1}. ${idx.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`);
    });
  }
  
  if (specialFundsIndexes.length > 0) {
    console.log('   Special funds index fields:');
    specialFundsIndexes.forEach((idx, i) => {
      console.log(`   ${i + 1}. ${idx.fields.map(f => `${f.fieldPath} (${f.order})`).join(', ')}`);
    });
  }
  
} catch (error) {
  console.error('❌ Error reading firestore.indexes.json:', error.message);
  process.exit(1);
}

console.log('\n🚀 Deployment Options:');
console.log('1. Deploy using Firebase CLI (recommended)');
console.log('2. Manual creation via Firebase Console');

console.log('\n📋 Option 1: Firebase CLI Deployment');
console.log('=====================================');
console.log('Run the following command in your terminal:');
console.log('\n   firebase deploy --only firestore:indexes\n');

console.log('📋 Option 2: Manual Console Creation');
console.log('=====================================');
console.log('For the specific indexes required, click these links:');

console.log('\n💰 Expenses Index:');
console.log('🔗 https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=ClBwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2V4cGVuc2VzL2luZGV4ZXMvXxABGg8KC2V4cGVuc2VEYXRlEAIaCgoGYW1vdW50EAIaDAoIX19uYW1lX18QAg');

console.log('\n🏦 Special Funds Tracker Index:');
console.log('🔗 https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=Cltwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3NwZWNpYWxGdW5kc1RyYWNrZXIvaW5kZXhlcy9fEAEaEAoMYWNjb3VudGFudElkEAEaDwoLbGFzdFVwZGF0ZWQQAhoMCghfX25hbWVfXxAC\n');

console.log('⏱️  Note: Index creation typically takes a few minutes to complete.');
console.log('📊 Once created, your Analytics Dashboard will load expenses data faster.');
console.log('✅ The system will automatically use simplified queries as a fallback until then.\n');

// Check if Firebase CLI is installed
try {
  execSync('firebase --version', { stdio: 'ignore' });
  console.log('✅ Firebase CLI is installed');
  console.log('💡 You can run: npm run deploy:indexes (if you have this script)');
  console.log('💡 Or directly: firebase deploy --only firestore:indexes');
} catch (error) {
  console.log('⚠️  Firebase CLI not found');
  console.log('📦 Install it with: npm install -g firebase-tools');
  console.log('🔑 Then login with: firebase login');
}

console.log('\n🎯 After deployment, refresh your Analytics Dashboard to see the improvements!');