// Test script to check for cash close data on specific dates
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  where,
  orderBy,
  limit
} = require('firebase/firestore');

// Initialize Firebase
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

async function testCashCloseQuery() {
  console.log('🔍 Testing Cash Close Data Query\n');
  console.log('=' .repeat(50));
  
  try {
    // Get all documents from cashCloses collection
    console.log('📊 Fetching all documents from cashCloses collection...\n');
    const snapshot = await getDocs(collection(db, 'cashCloses'));
    
    if (snapshot.empty) {
      console.log('❌ No documents found in cashCloses collection');
      console.log('\nThe collection is empty. You need to create cash close records first.');
      console.log('Go to: Dashboard → Accountant → Cash Close → Create Cash Close\n');
      return;
    }
    
    console.log(`✅ Found ${snapshot.size} documents in cashCloses collection\n`);
    console.log('📅 Available Cash Close Dates:\n');
    
    const dates = new Set();
    const records = [];
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
      // Extract date from various possible fields
      let dateStr = 'Unknown';
      let dateObj = null;
      
      if (data.cashCloseDate) {
        if (data.cashCloseDate.toDate) {
          dateObj = data.cashCloseDate.toDate();
        } else if (typeof data.cashCloseDate === 'string') {
          dateObj = new Date(data.cashCloseDate);
        }
      } else if (data.date) {
        if (typeof data.date === 'string') {
          dateObj = new Date(data.date);
        } else if (data.date.toDate) {
          dateObj = data.date.toDate();
        }
      } else if (data.businessDate) {
        dateObj = new Date(data.businessDate);
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        dateStr = dateObj.toISOString().split('T')[0];
        dates.add(dateStr);
      }
      
      // Get shift information
      let shifts = [];
      if (data.shifts && Array.isArray(data.shifts)) {
        shifts = data.shifts.map(s => s.shift);
      } else if (data.shift) {
        shifts = [data.shift];
      }
      
      records.push({
        id: doc.id,
        date: dateStr,
        shifts: shifts,
        totalRevenue: data.totalRevenue || data.totalCashInTill || 0,
        totalCash: data.totalCashInTill || data.closeCash || 0,
        totalNetwork: data.totalNetworkPayments || data.totalNetworkMoney || 0
      });
      
      console.log(`  ${index + 1}. Date: ${dateStr}`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     Shifts: ${shifts.length > 0 ? shifts.join(', ') : 'Not specified'}`);
      console.log(`     Total Revenue: UGX ${(data.totalRevenue || 0).toLocaleString()}`);
      console.log(`     Total Cash: UGX ${(data.totalCashInTill || data.closeCash || 0).toLocaleString()}`);
      console.log(`     Total Network: UGX ${(data.totalNetworkPayments || 0).toLocaleString()}\n`);
    });
    
    console.log('=' .repeat(50));
    console.log('\n📌 SUMMARY:\n');
    console.log(`Total Records: ${records.length}`);
    console.log(`Unique Dates: ${dates.size}`);
    
    if (dates.size > 0) {
      console.log('\n✅ Available dates for testing:');
      Array.from(dates).sort().reverse().forEach(date => {
        const dateRecords = records.filter(r => r.date === date);
        const shifts = [...new Set(dateRecords.flatMap(r => r.shifts))];
        console.log(`  • ${date} - Shifts: ${shifts.join(', ') || 'Not specified'}`);
      });
      
      console.log('\n💡 To test the automated allocation:');
      console.log('1. Go to: Dashboard → Accountant → Allocations');
      console.log('2. Select one of the dates above');
      console.log('3. Select the corresponding shift');
      console.log('4. The system should find and display the cash close data');
    }
    
    // Test querying a specific date (most recent)
    if (dates.size > 0) {
      const testDate = Array.from(dates).sort().reverse()[0];
      console.log(`\n🧪 Testing query for most recent date: ${testDate}`);
      
      let foundCount = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if this document matches the test date
        let dateMatch = false;
        
        if (data.cashCloseDate?.toDate) {
          const docDate = data.cashCloseDate.toDate().toISOString().split('T')[0];
          dateMatch = docDate === testDate;
        } else if (data.date) {
          const docDate = new Date(data.date).toISOString().split('T')[0];
          dateMatch = docDate === testDate;
        } else if (data.businessDate) {
          const docDate = data.businessDate.split('T')[0];
          dateMatch = docDate === testDate;
        }
        
        if (dateMatch) {
          foundCount++;
          console.log(`  ✅ Found matching document: ${doc.id}`);
        }
      });
      
      console.log(`  Result: Found ${foundCount} document(s) for ${testDate}`);
    }
    
  } catch (error) {
    console.error('❌ Error querying cash closes:', error);
    console.error('\nDetails:', error.message);
  }
  
  process.exit(0);
}

// Run the test
testCashCloseQuery();








