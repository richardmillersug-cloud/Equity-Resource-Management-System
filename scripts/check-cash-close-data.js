// Quick script to check cash close data in Firestore
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

// Firebase config - you'll need to update this with your actual config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkCashCloseCollections() {
  try {
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const collectionsToCheck = [
      'cashCloses',
      'comprehensiveCashClose', 
      'importedCashCloses',
      'cashClose',
      'cashAllocations' // This might contain cash close data
    ];

    console.log('\n📊 CASH CLOSE DATA ANALYSIS\n' + '='.repeat(50));

    for (const collectionName of collectionsToCheck) {
      try {
        console.log(`\n🔍 Checking collection: ${collectionName}`);
        
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        console.log(`📈 Found ${querySnapshot.size} documents`);
        
        if (querySnapshot.size > 0) {
          console.log('\n📋 Sample documents:');
          querySnapshot.docs.slice(0, 3).forEach((doc, index) => {
            const data = doc.data();
            console.log(`\n  ${index + 1}. Document ID: ${doc.id}`);
            console.log(`     Created: ${data.createdAt?.toDate?.() || data.createdAt || 'N/A'}`);
            console.log(`     Status: ${data.status || 'N/A'}`);
            
            // Check for revenue data
            if (data.totalRevenue) {
              console.log(`     Total Revenue: UGX ${data.totalRevenue.toLocaleString()}`);
            }
            if (data.totalCashInTill) {
              console.log(`     Total Cash in Till: UGX ${data.totalCashInTill.toLocaleString()}`);
            }
            if (data.totalNetworkPayments) {
              console.log(`     Total Network Payments: UGX ${data.totalNetworkPayments.toLocaleString()}`);
            }
            
            // Check for network payments in shifts
            if (data.shifts && Array.isArray(data.shifts)) {
              let totalNetworkPayments = 0;
              let networkPaymentCount = 0;
              
              data.shifts.forEach(shift => {
                if (shift.tills && Array.isArray(shift.tills)) {
                  shift.tills.forEach(till => {
                    if (till.networkPayments && Array.isArray(till.networkPayments)) {
                      till.networkPayments.forEach(payment => {
                        totalNetworkPayments += payment.amount || 0;
                        networkPaymentCount++;
                      });
                    }
                  });
                }
              });
              
              if (networkPaymentCount > 0) {
                console.log(`     Network Payments: ${networkPaymentCount} payments totaling UGX ${totalNetworkPayments.toLocaleString()}`);
              }
            }
            
            // Show key fields present
            const keyFields = Object.keys(data).filter(key => 
              ['totalRevenue', 'totalNetworkPayments', 'totalCashInTill', 'shifts', 'cashCloseTotal', 'actualNetworkMoney'].includes(key)
            );
            if (keyFields.length > 0) {
              console.log(`     Key fields: ${keyFields.join(', ')}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`❌ Error accessing ${collectionName}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Cash close data analysis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkCashCloseCollections().catch(console.error);


