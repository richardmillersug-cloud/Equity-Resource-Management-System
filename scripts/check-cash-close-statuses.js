// Script to check what status values exist in cashCloses collection
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDyKJOFqPHPBsTNKK3XLvW1PpTlJvF7Lzg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "equityauth.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "equityauth",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "equityauth.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "598171395411",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:598171395411:web:c21b37e04e006b8bf94d4b"
};

async function checkCashCloseStatuses() {
  try {
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('\n📊 CHECKING CASH CLOSE STATUSES\n' + '='.repeat(50));

    // Get all cash closes (limited to avoid timeout)
    const cashClosesQuery = query(
      collection(db, 'cashCloses'),
      orderBy('createdAt', 'desc'),
      limit(50) // Check recent 50 documents
    );

    console.log('🔍 Querying cashCloses collection...');
    const querySnapshot = await getDocs(cashClosesQuery);

    console.log(`📈 Found ${querySnapshot.size} total cash closes\n`);

    if (querySnapshot.size === 0) {
      console.log('ℹ️  No cash closes found in collection.');
      return;
    }

    // Analyze status distribution
    const statusCounts = {};
    const documents = [];

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'undefined';

      if (!statusCounts[status]) {
        statusCounts[status] = 0;
      }
      statusCounts[status]++;

      documents.push({
        id: doc.id,
        status: status,
        createdAt: data.createdAt,
        businessDate: data.businessDate || data.date,
        totalRevenue: data.totalRevenue
      });
    });

    // Display status summary
    console.log('📊 STATUS DISTRIBUTION:\n' + '-'.repeat(30));
    Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        console.log(`🔸 ${status}: ${count} documents`);
      });

    // Show sample documents for each status
    console.log('\n📋 SAMPLE DOCUMENTS BY STATUS:\n' + '-'.repeat(40));

    const statuses = Object.keys(statusCounts);
    statuses.forEach(status => {
      const statusDocs = documents.filter(doc => doc.status === status).slice(0, 2);
      if (statusDocs.length > 0) {
        console.log(`\n🔍 Status: "${status}" (${statusCounts[status]} total)`);
        statusDocs.forEach((doc, index) => {
          console.log(`   ${index + 1}. ID: ${doc.id}`);
          console.log(`      Date: ${doc.businessDate || 'N/A'}`);
          console.log(`      Revenue: ${doc.totalRevenue ? 'UGX ' + doc.totalRevenue.toLocaleString() : 'N/A'}`);
        });
      }
    });

    // Check for potential submitted statuses
    const potentialSubmitted = documents.filter(doc =>
      doc.status &&
      (doc.status.toLowerCase().includes('submit') ||
       doc.status.toLowerCase().includes('pending') ||
       doc.status === 'draft')
    );

    if (potentialSubmitted.length > 0) {
      console.log('\n💡 POTENTIAL "SUBMITTED" EQUIVALENTS:\n' + '-'.repeat(40));
      potentialSubmitted.slice(0, 5).forEach((doc, index) => {
        console.log(`${index + 1}. Status: "${doc.status}" - ID: ${doc.id}`);
      });
    }

    console.log('\n✅ Status analysis complete!');
    console.log(`🔍 Checked ${querySnapshot.size} most recent cash closes`);

  } catch (error) {
    console.error('❌ Error checking cash close statuses:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
checkCashCloseStatuses().catch(console.error);




