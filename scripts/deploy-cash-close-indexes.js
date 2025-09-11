// Script to deploy Firestore indexes for cash close collection
const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Firestore Indexes for Cash Close Collection...\n');

// Get the absolute path to firestore.indexes.json
const indexesPath = path.join(__dirname, '..', 'firestore.indexes.json');

console.log('📁 Index file path:', indexesPath);
console.log('🔥 Deploying indexes...\n');

// Deploy indexes using Firebase CLI
const deployCommand = `firebase deploy --only firestore:indexes`;

console.log('⚡ Executing command:', deployCommand);
console.log('⏳ This may take a few minutes...\n');

exec(deployCommand, { cwd: path.dirname(indexesPath) }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error deploying indexes:');
    console.error(error.message);
    console.error('\n🔧 Troubleshooting:');
    console.log('1. Make sure Firebase CLI is installed: npm install -g firebase-tools');
    console.log('2. Make sure you\'re logged in: firebase login');
    console.log('3. Make sure you\'re in the correct project: firebase use [project-id]');
    console.log('4. Check your firestore.indexes.json file for syntax errors');
    return;
  }

  if (stderr) {
    console.log('⚠️  Warnings/Info:', stderr);
  }

  console.log('✅ Indexes deployed successfully!');
  console.log('\n📊 Output:');
  console.log(stdout);

  console.log('\n🎯 What was deployed:');
  console.log('✓ 14 new indexes for cashCloses collection');
  console.log('  - Date + Shift queries (ASC/DESC)');
  console.log('  - Branch + Date queries');
  console.log('  - Status + Date queries');
  console.log('  - CreatedBy + Date queries');
  console.log('  - Shift + Date queries');

  console.log('\n⏰ Index creation may take 5-10 minutes to complete in Firebase');
  console.log('📝 You can monitor progress in the Firebase Console > Firestore > Indexes');
});








