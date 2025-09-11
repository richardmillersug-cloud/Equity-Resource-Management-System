// Script to populate sample cash close data for testing
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} = require('firebase/firestore');

// Initialize Firebase (using same config as main app)
const firebaseConfig = {
  apiKey: "AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI",
  authDomain: "equitysys-41320.firebaseapp.com",
  projectId: "equitysys-41320",
  storageBucket: "equitysys-41320.firebasestorage.app",
  messagingSenderId: "989839221549",
  appId: "1:989839221549:web:4400f782d5f8c9bd6aa9a4",
  measurementId: "G-KR0H4HEB4D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generate sample cash close data
function generateSampleCashClose(date, shift) {
  const baseAmount = 5000000 + Math.floor(Math.random() * 3000000); // 5M to 8M UGX
  const networkAmount = Math.floor(baseAmount * 0.2); // 20% network payments
  const cashAmount = baseAmount - networkAmount;
  const expenses = Math.floor(Math.random() * 500000); // Up to 500k expenses
  
  return {
    // Date fields - using multiple formats for compatibility
    cashCloseDate: Timestamp.fromDate(date),
    date: date.toISOString(),
    businessDate: date.toISOString().split('T')[0],
    
    // Core financial data
    totalRevenue: baseAmount,
    totalCashInTill: cashAmount,
    totalNetworkPayments: networkAmount,
    totalExpenses: expenses,
    
    // Shift data
    shifts: [{
      shift: shift,
      shiftTotalRevenue: baseAmount,
      shiftTotalCash: cashAmount,
      shiftTotalNetwork: networkAmount,
      tills: [
        {
          tillNumber: 1,
          totalCashInTill: Math.floor(cashAmount * 0.6),
          cashAmount: Math.floor(cashAmount * 0.6),
          totalNetworkPayments: Math.floor(networkAmount * 0.6),
          expenses: Math.floor(expenses * 0.6)
        },
        {
          tillNumber: 2,
          totalCashInTill: Math.floor(cashAmount * 0.4),
          cashAmount: Math.floor(cashAmount * 0.4),
          totalNetworkPayments: Math.floor(networkAmount * 0.4),
          expenses: Math.floor(expenses * 0.4)
        }
      ]
    }],
    
    // Additional metadata
    branchId: 'branch_001',
    createdBy: 'test_pm_001', // Use a test PM ID that can be referenced
    status: 'submitted',
    
    // Tax and allocations (following business rules)
    taxRate: 0.18,
    taxAmount: Math.floor(baseAmount * 0.18),
    afterTaxAmount: Math.floor(baseAmount * 0.82),
    profitPercentage: 0.12,
    profitAmount: Math.floor(baseAmount * 0.12),
    
    // Allocation calculations (after 12% profit)
    cashAfterProfit: Math.floor(cashAmount * 0.88),
    m_expenseFund: Math.floor(cashAmount * 0.88 * 0.30), // 30% of remaining
    purchasingManager: Math.floor(cashAmount * 0.88 * 0.70), // 70% of remaining
    
    // Variance
    totalShortage: Math.floor(Math.random() * 50000),
    totalExcess: Math.floor(Math.random() * 30000),
    
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

async function populateSampleData() {
  console.log('🚀 Starting to populate sample cash close data...\n');
  
  try {
    const today = new Date();
    const records = [];
    
    // Generate data for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      // Create both day and night shift records
      for (const shift of ['day', 'night']) {
        const cashClose = generateSampleCashClose(date, shift);
        
        console.log(`📝 Creating cash close for ${date.toISOString().split('T')[0]} - ${shift} shift`);
        console.log(`   💰 Total Revenue: UGX ${cashClose.totalRevenue.toLocaleString()}`);
        console.log(`   💵 Cash: UGX ${cashClose.totalCashInTill.toLocaleString()}`);
        console.log(`   📱 Network: UGX ${cashClose.totalNetworkPayments.toLocaleString()}`);
        
        const docRef = await addDoc(collection(db, 'cashCloses'), cashClose);
        console.log(`   ✅ Created with ID: ${docRef.id}\n`);
        
        records.push({
          id: docRef.id,
          date: date.toISOString().split('T')[0],
          shift: shift,
          revenue: cashClose.totalRevenue
        });
      }
    }
    
    console.log('=' .repeat(50));
    console.log('✅ SUCCESSFULLY CREATED SAMPLE DATA');
    console.log('=' .repeat(50));
    console.log('\n📊 Summary of created records:\n');
    
    records.forEach(record => {
      console.log(`  • ${record.date} - ${record.shift}: UGX ${record.revenue.toLocaleString()} (ID: ${record.id})`);
    });
    
    console.log('\n💡 You can now test the automated allocation system with these dates!');
    console.log('🎯 Navigate to: Dashboard → Accountant → Allocations');
    console.log('📅 Select any of the dates above and the corresponding shift');
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
  }
  
  process.exit(0);
}

// Run the script
populateSampleData();








