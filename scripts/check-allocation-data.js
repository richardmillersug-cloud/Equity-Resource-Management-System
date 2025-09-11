#!/usr/bin/env node

/**
 * Quick script to check cash allocation data in Firestore
 * Run with: node scripts/check-allocation-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin (you may need to adjust the path to your service account)
const serviceAccount = require('../path-to-your-service-account-key.json'); // Update this path

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id-default-rtdb.firebaseio.com/' // Update this
  });
}

const db = admin.firestore();

async function checkAllocationData() {
  console.log('🔍 Checking cash allocation data...\n');

  try {
    // Query all cash allocations
    const allocationsSnapshot = await db.collection('cash_allocations')
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`📊 Found ${allocationsSnapshot.docs.length} allocation records\n`);

    if (allocationsSnapshot.docs.length === 0) {
      console.log('❌ No allocation records found in the database');
      console.log('💡 This means either:');
      console.log('   1. No allocations have been created yet');
      console.log('   2. The collection name might be different');
      console.log('   3. There might be permission issues');
      return;
    }

    // Statistics
    let totalAmount = 0;
    const statusCounts = {};
    const pmCounts = {};

    console.log('📋 ALLOCATION RECORDS:\n');
    console.log('=' .repeat(120));
    console.log('ID'.padEnd(20) + 'Amount'.padEnd(15) + 'Status'.padEnd(20) + 'From'.padEnd(15) + 'To'.padEnd(15) + 'Created'.padEnd(20) + 'Description');
    console.log('=' .repeat(120));

    for (const doc of allocationsSnapshot.docs) {
      const data = doc.data();
      const id = doc.id;
      
      // Get user names if possible
      let fromName = 'Unknown';
      let toName = 'Unknown';
      
      try {
        if (data.allocatedBy) {
          const fromUser = await db.collection('users').doc(data.allocatedBy).get();
          if (fromUser.exists) {
            const fromData = fromUser.data();
            fromName = fromData.name || fromData.email || 'Unknown';
          }
        }
        
        if (data.allocatedTo) {
          const toUser = await db.collection('users').doc(data.allocatedTo).get();
          if (toUser.exists) {
            const toData = toUser.data();
            toName = toData.name || toData.email || 'Unknown';
          }
        }
      } catch (error) {
        console.warn('Warning: Could not fetch user names:', error.message);
      }

      // Update statistics
      totalAmount += data.amount || 0;
      statusCounts[data.status] = (statusCounts[data.status] || 0) + 1;
      pmCounts[toName] = (pmCounts[toName] || 0) + 1;

      // Format date
      const createdDate = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'N/A';
      
      // Print record
      console.log(
        id.substring(0, 18).padEnd(20) +
        `UGX ${(data.amount || 0).toLocaleString()}`.padEnd(15) +
        (data.status || 'unknown').padEnd(20) +
        fromName.substring(0, 13).padEnd(15) +
        toName.substring(0, 13).padEnd(15) +
        createdDate.padEnd(20) +
        (data.description || 'N/A').substring(0, 40)
      );
    }

    console.log('=' .repeat(120));
    console.log('\n📈 STATISTICS:\n');
    
    console.log(`💰 Total Amount: UGX ${totalAmount.toLocaleString()}`);
    console.log(`📊 Total Records: ${allocationsSnapshot.docs.length}\n`);
    
    console.log('📋 By Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n👥 By Purchase Manager:');
    Object.entries(pmCounts).forEach(([pm, count]) => {
      console.log(`   ${pm}: ${count} allocations`);
    });

    console.log('\n🔍 Recent Records (Raw Data):');
    allocationsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });

  } catch (error) {
    console.error('❌ Error checking allocation data:', error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure your Firebase service account key is correct');
    console.log('   2. Check if the collection name "cash_allocations" exists');
    console.log('   3. Verify your Firebase project ID and database URL');
    console.log('   4. Ensure you have proper read permissions');
  }
}

// Alternative: Simple browser console script
function generateBrowserScript() {
  console.log('\n🌐 BROWSER CONSOLE SCRIPT:');
  console.log('Copy and paste this into your browser console while on the app:');
  console.log('=' .repeat(60));
  
  const browserScript = `
// Run this in browser console to check allocation data
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '/path/to/your/firebase/config'; // Update path

async function checkAllocations() {
  try {
    const q = query(collection(db, 'cash_allocations'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log('Total allocations:', snapshot.docs.length);
    
    snapshot.docs.forEach(doc => {
      console.log('ID:', doc.id);
      console.log('Data:', doc.data());
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllocations();`;

  console.log(browserScript);
}

// Run the check
checkAllocationData().then(() => {
  generateBrowserScript();
  console.log('\n✅ Check complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});



