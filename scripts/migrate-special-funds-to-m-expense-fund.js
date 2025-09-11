// Migration script to rename 'specialFunds' field to 'm_expenseFund' in cashCloses collection
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp
} = require('firebase/firestore');

// Initialize Firebase (using same config as main app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDyKJOFqPHPBsTNKK3XLvW1PpTlJvF7Lzg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "equityauth.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "equityauth",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "equityauth.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "598171395411",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:598171395411:web:c21b37e04e006b8bf94d4b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test authentication by trying to read a simple collection first
async function testConnection() {
  console.log('🔍 Testing Firestore connection...');
  try {
    // Try to read from a simple collection first
    const testQuery = collection(db, 'users');
    const testSnapshot = await getDocs(testQuery);
    console.log(`✅ Firestore connection successful. Found ${testSnapshot.size} users.`);
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
    return false;
  }
}

async function migrateSpecialFundsToMExpenseFund() {
  console.log('🚀 Starting migration: specialFunds → m_expenseFund in cashCloses collection\n');

  // Test connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('❌ Aborting migration due to connection issues.');
    return;
  }

  try {
    const cashClosesRef = collection(db, 'cashCloses');
    const snapshot = await getDocs(cashClosesRef);

    if (snapshot.empty) {
      console.log('ℹ️  No documents found in cashCloses collection.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents to process\n`);

    const batch = writeBatch(db);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const document of snapshot.docs) {
      const data = document.data();
      const docId = document.id;

      // Check if document has specialFunds field
      if (data.hasOwnProperty('specialFunds') && data.specialFunds !== undefined) {
        console.log(`🔄 Updating document ${docId}:`);
        console.log(`   Old: specialFunds = ${data.specialFunds}`);

        // Create update object
        const updateData = {
          m_expenseFund: data.specialFunds,
          updatedAt: serverTimestamp()
        };

        // Add to batch - this will add the new field
        batch.update(doc(db, 'cashCloses', docId), updateData);

        updatedCount++;
        console.log(`   New: m_expenseFund = ${data.specialFunds}`);
        console.log(`   ✅ Scheduled for update\n`);
      } else {
        console.log(`⏭️  Skipping document ${docId}: no specialFunds field found\n`);
        skippedCount++;
      }
    }

    // Execute the batch
    if (updatedCount > 0) {
      console.log('🔥 Executing batch update...');
      await batch.commit();
      console.log('✅ Batch update completed successfully!');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total documents processed: ${snapshot.size}`);
    console.log(`✅ Documents updated: ${updatedCount}`);
    console.log(`⏭️  Documents skipped: ${skippedCount}`);
    console.log('\n🎯 Migration completed successfully!');

    if (updatedCount > 0) {
      console.log('\n⚠️  IMPORTANT NOTES:');
      console.log('• The old "specialFunds" field still exists in the documents');
      console.log('• You can remove the old field manually if needed');
      console.log('• New documents will only have the "m_expenseFund" field');
      console.log('• Update your application code to use the new field name');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
migrateSpecialFundsToMExpenseFund();
