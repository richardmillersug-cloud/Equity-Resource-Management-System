// Script to get all cash closes with status = 'submitted'
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDyKJOFqPHPBsTNKK3XLvW1PpTlJvF7Lzg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "equityauth.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "equityauth",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "equityauth.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "598171395411",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:598171395411:web:c21b37e04e006b8bf94d4b"
};

async function getSubmittedCashCloses() {
  try {
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('\n📊 FETCHING SUBMITTED CASH CLOSES\n' + '='.repeat(60));

    // Query cashCloses collection for documents with status = 'submitted'
    const cashClosesQuery = query(
      collection(db, 'cashCloses'),
      where('status', '==', 'submitted'),
      orderBy('createdAt', 'desc')
    );

    console.log('🔍 Querying cashCloses collection...');
    console.log('📋 Filters: status == "submitted"');
    console.log('📋 Order: createdAt DESC');

    const querySnapshot = await getDocs(cashClosesQuery);

    console.log(`\n✅ Found ${querySnapshot.size} submitted cash closes\n`);

    if (querySnapshot.size === 0) {
      console.log('ℹ️  No cash closes with status "submitted" found.');
      console.log('\n💡 This could mean:');
      console.log('   • All cash closes have been processed');
      console.log('   • Cash closes have different status values');
      console.log('   • Collection might be empty');
      return;
    }

    console.log('📋 SUBMITTED CASH CLOSES DETAILS:\n' + '-'.repeat(60));

    let totalRevenue = 0;
    let totalCash = 0;
    let totalNetwork = 0;
    let shiftCount = { day: 0, night: 0 };

    querySnapshot.docs.forEach((doc, index) => {
      const data = doc.data();

      console.log(`\n${index + 1}. 📄 Document ID: ${doc.id}`);
      console.log(`   📅 Business Date: ${data.businessDate || data.date || 'N/A'}`);
      console.log(`   📊 Status: ${data.status}`);
      console.log(`   👤 Created By: ${data.createdBy || 'Unknown'}`);
      console.log(`   🕒 Created At: ${data.createdAt?.toDate?.()?.toLocaleString() || data.createdAt || 'N/A'}`);

      // Financial data
      if (data.totalRevenue) {
        console.log(`   💰 Total Revenue: UGX ${data.totalRevenue.toLocaleString()}`);
        totalRevenue += data.totalRevenue;
      }
      if (data.totalCashInTill) {
        console.log(`   💵 Total Cash in Till: UGX ${data.totalCashInTill.toLocaleString()}`);
        totalCash += data.totalCashInTill;
      }
      if (data.totalNetworkPayments) {
        console.log(`   📱 Total Network Payments: UGX ${data.totalNetworkPayments.toLocaleString()}`);
        totalNetwork += data.totalNetworkPayments;
      }

      // Monthly expense fund
      if (data.m_expenseFund && data.m_expenseFund > 0) {
        console.log(`   💰 Monthly Expense Fund: UGX ${data.m_expenseFund.toLocaleString()}`);
      }

      // Shifts information
      if (data.shifts && Array.isArray(data.shifts)) {
        console.log(`   🔄 Shifts: ${data.shifts.length}`);
        data.shifts.forEach((shift, shiftIndex) => {
          const shiftType = shift.shift || 'unknown';
          if (shiftType === 'day' || shiftType === 'night') {
            shiftCount[shiftType]++;
          }

          if (shift.tills && Array.isArray(shift.tills)) {
            const tillCount = shift.tills.length;
            const totalShiftCash = shift.tills.reduce((sum, till) => sum + (till.totalCashInTill || 0), 0);
            console.log(`      ↳ ${shiftType.toUpperCase()} Shift: ${tillCount} tills, UGX ${totalShiftCash.toLocaleString()}`);
          }
        });
      }

      // Branch information
      if (data.branchId) {
        console.log(`   🏢 Branch: ${data.branchId}`);
      }

      console.log(`   📝 Notes: ${data.notes ? data.notes.substring(0, 50) + (data.notes.length > 50 ? '...' : '') : 'None'}`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(60));
    console.log(`📄 Total Submitted Cash Closes: ${querySnapshot.size}`);
    console.log(`💰 Total Revenue: UGX ${totalRevenue.toLocaleString()}`);
    console.log(`💵 Total Cash in Till: UGX ${totalCash.toLocaleString()}`);
    console.log(`📱 Total Network Payments: UGX ${totalNetwork.toLocaleString()}`);
    console.log(`🌅 Day Shifts: ${shiftCount.day}`);
    console.log(`🌙 Night Shifts: ${shiftCount.night}`);

    if (totalRevenue > 0 || totalCash > 0) {
      const avgRevenue = totalRevenue / querySnapshot.size;
      const avgCash = totalCash / querySnapshot.size;
      console.log(`📈 Average Revenue per Cash Close: UGX ${avgRevenue.toLocaleString()}`);
      console.log(`📈 Average Cash per Cash Close: UGX ${avgCash.toLocaleString()}`);
    }

    console.log('\n✅ Query completed successfully!');
    console.log('💡 These are the cash closes ready for allocation processing.');

  } catch (error) {
    console.error('❌ Error fetching submitted cash closes:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the script
getSubmittedCashCloses().catch(console.error);




