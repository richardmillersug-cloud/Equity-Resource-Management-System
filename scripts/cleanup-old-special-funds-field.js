// Cleanup script to remove old 'specialFunds' field from cashCloses collection
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

async function cleanupOldSpecialFundsField() {
  console.log('🧹 Starting cleanup: Removing old "specialFunds" field from cashCloses collection\n');

  try {
    const cashClosesRef = collection(db, 'cashCloses');
    const snapshot = await getDocs(cashClosesRef);

    if (snapshot.empty) {
      console.log('ℹ️  No documents found in cashCloses collection.');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents to check\n`);

    const batch = writeBatch(db);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const document of snapshot.docs) {
      const data = document.data();
      const docId = document.id;

      // Check if document has both old and new fields
      if (data.hasOwnProperty('specialFunds') &&
          data.hasOwnProperty('m_expenseFund') &&
          data.specialFunds === data.m_expenseFund) {

        console.log(`🗑️  Cleaning up document ${docId}:`);
        console.log(`   Removing: specialFunds = ${data.specialFunds}`);
        console.log(`   Keeping: m_expenseFund = ${data.m_expenseFund}`);

        // Add to batch - this will remove the old field
        batch.update(doc(db, 'cashCloses', docId), {
          specialFunds: null, // Firestore will delete the field when set to null
          updatedAt: serverTimestamp()
        });

        updatedCount++;
        console.log(`   ✅ Scheduled for cleanup\n`);
      } else if (data.hasOwnProperty('specialFunds') && !data.hasOwnProperty('m_expenseFund')) {
        console.log(`⚠️  Document ${docId} has specialFunds but no m_expenseFund - skipping cleanup\n`);
        skippedCount++;
      } else {
        console.log(`⏭️  Document ${docId} doesn't need cleanup\n`);
        skippedCount++;
      }
    }

    // Execute the batch
    if (updatedCount > 0) {
      console.log('🔥 Executing batch cleanup...');
      await batch.commit();
      console.log('✅ Batch cleanup completed successfully!');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🧹 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total documents processed: ${snapshot.size}`);
    console.log(`🗑️  Documents cleaned up: ${updatedCount}`);
    console.log(`⏭️  Documents skipped: ${skippedCount}`);
    console.log('\n🎯 Cleanup completed successfully!');

    if (updatedCount > 0) {
      console.log('\n✅ The old "specialFunds" field has been removed from documents that have both fields with matching values.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the cleanup
cleanupOldSpecialFundsField();





