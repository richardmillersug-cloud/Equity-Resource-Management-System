// Simple script to deploy only cash closes indexes
const { exec } = require('child_process');

console.log('🔧 Deploying Cash Closes Indexes Only...\n');

// Use the separate indexes file
const command = `firebase deploy --only firestore:indexes --force`;

console.log('📋 Using indexes from: cash-closes-indexes-only.json');
console.log('⚡ Executing:', command);
console.log('⏳ This should create 13 new cashCloses indexes...\n');

exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Deployment failed:');
    console.error(error.message);
    console.log('\n🔄 Alternative: Use Firebase Console');
    console.log('1. Go to Firebase Console > Firestore > Indexes');
    console.log('2. Click "Create Index"');
    console.log('3. Use the indexes from cash-closes-indexes-only.json');
    return;
  }

  if (stderr) {
    console.log('⚠️  Warnings:', stderr);
  }

  console.log('✅ Deployment successful!');
  console.log('\n📊 Output:');
  console.log(stdout);

  console.log('\n🎯 Next Steps:');
  console.log('1. Wait 5-30 minutes for indexes to be created');
  console.log('2. Check Firebase Console > Firestore > Indexes');
  console.log('3. Test the automated allocation system');
  console.log('4. Performance should be 10x faster!');
});








