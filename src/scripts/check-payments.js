const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI",
  authDomain: "equitysys-41320.firebaseapp.com",
  projectId: "equitysys-41320",
  storageBucket: "equitysys-41320.firebasestorage.app",
  messagingSenderId: "989839221549",
  appId: "1:989839221549:web:4400f782d5f8c9bd6aa9a4",
  measurementId: "G-KR0H4HEB4D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPaymentsData() {
  console.log('🔍 Checking Firestore Collections for Payment Data...\n');

  try {
    // Check invoicePayments collection (new system)
    console.log('📊 INVOICE PAYMENTS COLLECTION (New System):');
    console.log('=' .repeat(60));
    
    const invoicePaymentsQuery = query(
      collection(db, 'invoicePayments'),
      orderBy('paymentDate', 'desc')
    );
    
    const invoicePaymentsSnapshot = await getDocs(invoicePaymentsQuery);
    
    if (invoicePaymentsSnapshot.empty) {
      console.log('❌ No records found in invoicePayments collection');
    } else {
      console.log(`✅ Found ${invoicePaymentsSnapshot.size} payment records\n`);
      
      invoicePaymentsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Payment ${index + 1}:`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Payment Reference: ${data.paymentReference || 'N/A'}`);
        console.log(`  Invoice Number: ${data.invoiceNumber || 'N/A'}`);
        console.log(`  Supplier: ${data.supplierName || 'N/A'}`);
        console.log(`  Amount: UGX ${data.amount?.toLocaleString() || 'N/A'}`);
        console.log(`  Payment Method: ${data.paymentMethod?.type || 'N/A'}`);
        console.log(`  Installment: #${data.installmentNumber || 'N/A'}`);
        console.log(`  Paid By: ${data.paidBy || 'N/A'}`);
        console.log(`  Payment Date: ${data.paymentDate?.toDate?.()?.toLocaleString() || data.paymentDate || 'N/A'}`);
        console.log(`  Status: ${data.paymentStatus || 'N/A'}`);
        console.log(`  Running Total: UGX ${data.runningTotal?.toLocaleString() || 'N/A'}`);
        console.log(`  Remaining: UGX ${data.remainingAfterPayment?.toLocaleString() || 'N/A'}`);
        if (data.notes) console.log(`  Notes: ${data.notes}`);
        console.log('  ---');
      });
    }

    console.log('\n📊 OLD PAYMENTS COLLECTION (Legacy System):');
    console.log('=' .repeat(60));
    
    // Check old payments collection (if it exists)
    try {
      const oldPaymentsQuery = query(
        collection(db, 'payments'),
        orderBy('createdAt', 'desc')
      );
      
      const oldPaymentsSnapshot = await getDocs(oldPaymentsQuery);
      
      if (oldPaymentsSnapshot.empty) {
        console.log('❌ No records found in old payments collection');
      } else {
        console.log(`⚠️  Found ${oldPaymentsSnapshot.size} old payment records\n`);
        
        oldPaymentsSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`Old Payment ${index + 1}:`);
          console.log(`  ID: ${doc.id}`);
          console.log(`  Reference: ${data.reference || 'N/A'}`);
          console.log(`  Supplier: ${data.supplierName || 'N/A'}`);
          console.log(`  Amount: ${data.amount || 'N/A'}`);
          console.log(`  Method: ${data.method || 'N/A'}`);
          console.log(`  Status: ${data.status || 'N/A'}`);
          console.log(`  Created: ${data.createdAt?.toDate?.()?.toLocaleString() || data.createdAt || 'N/A'}`);
          console.log('  ---');
        });
      }
    } catch (error) {
      console.log('❌ Old payments collection does not exist or is inaccessible');
    }

    console.log('\n📊 INVOICES COLLECTION (Payment Status):');
    console.log('=' .repeat(60));
    
    // Check invoices for payment status
    const invoicesQuery = query(
      collection(db, 'invoices'),
      orderBy('createdAt', 'desc')
    );
    
    const invoicesSnapshot = await getDocs(invoicesQuery);
    
    if (invoicesSnapshot.empty) {
      console.log('❌ No invoices found');
    } else {
      console.log(`✅ Found ${invoicesSnapshot.size} invoices\n`);
      
      const paidInvoices = [];
      const partialInvoices = [];
      const unpaidInvoices = [];
      
      invoicesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const invoice = {
          id: doc.id,
          number: data.invoiceNumber,
          supplier: data.supplierName,
          amount: data.amount,
          paidAmount: data.paidAmount || 0,
          remainingAmount: data.remainingAmount || data.amount,
          status: data.status,
          paymentCount: data.paymentCount || 0
        };
        
        if (data.status === 'paid') paidInvoices.push(invoice);
        else if (data.status === 'partial') partialInvoices.push(invoice);
        else unpaidInvoices.push(invoice);
      });
      
      console.log(`💰 Paid Invoices: ${paidInvoices.length}`);
      paidInvoices.forEach(inv => {
        console.log(`  ${inv.number} - ${inv.supplier} - UGX ${inv.amount?.toLocaleString()} (${inv.paymentCount} payments)`);
      });
      
      console.log(`\n🔄 Partial Invoices: ${partialInvoices.length}`);
      partialInvoices.forEach(inv => {
        console.log(`  ${inv.number} - ${inv.supplier} - UGX ${inv.paidAmount?.toLocaleString()}/${inv.amount?.toLocaleString()} (${inv.paymentCount} payments)`);
      });
      
      console.log(`\n⏳ Unpaid Invoices: ${unpaidInvoices.length}`);
      unpaidInvoices.slice(0, 5).forEach(inv => {
        console.log(`  ${inv.number} - ${inv.supplier} - UGX ${inv.amount?.toLocaleString()}`);
      });
      if (unpaidInvoices.length > 5) {
        console.log(`  ... and ${unpaidInvoices.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking payment data:', error);
  }
}

// Run the check
checkPaymentsData().then(() => {
  console.log('\n✅ Payment data check completed!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 