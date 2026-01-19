const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI",
  authDomain: "equitysys-41320.firebaseapp.com",
  projectId: "equitysys-41320",
  storageBucket: "equitysys-41320.firebasestorage.app",
  messagingSenderId: "989839221549",
  appId: "1:989839221549:web:4400f782d5f8c9bd6aa9a4",
  measurementId: "G-KR0H4HEB4D"
};

async function calculateOutstanding() {
  try {
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📊 Fetching all invoices...');
    const invoicesSnapshot = await getDocs(collection(db, 'invoices'));
    
    console.log(`📋 Found ${invoicesSnapshot.docs.length} total invoices\n`);
    
    let totalAllInvoiceAmounts = 0;
    let totalCompletelyPaidAmounts = 0;
    let totalPartialPayments = 0;
    let totalOutstanding = 0;
    
    let completelyPaidCount = 0;
    let partialPaymentCount = 0;
    let unpaidCount = 0;
    
    invoicesSnapshot.docs.forEach((doc) => {
      const invoice = doc.data();
      const invoiceAmount = Number(invoice.amount || invoice.amountInDigits || 0);
      const paidAmount = Number(invoice.paidAmount || 0);
      const remainingAmount = Math.max(0, invoiceAmount - paidAmount);
      
      // Sum of all invoice amounts
      totalAllInvoiceAmounts += invoiceAmount;
      
      // Check if completely paid off
      if (paidAmount >= invoiceAmount && invoiceAmount > 0) {
        totalCompletelyPaidAmounts += invoiceAmount;
        completelyPaidCount++;
      }
      
      // Check if partial payment (paid but not fully paid)
      if (paidAmount > 0 && paidAmount < invoiceAmount) {
        totalPartialPayments += paidAmount;
        partialPaymentCount++;
      }
      
      // Count unpaid invoices
      if (remainingAmount > 0) {
        unpaidCount++;
      }
      
      // Calculate outstanding for this invoice
      totalOutstanding += remainingAmount;
    });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 OUTSTANDING CALCULATION RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📈 BREAKDOWN:');
    console.log(`   Sum of ALL invoice amounts:        ${formatCurrency(totalAllInvoiceAmounts)}`);
    console.log(`   Sum of completely paid invoices:    ${formatCurrency(totalCompletelyPaidAmounts)}`);
    console.log(`   Sum of partial payments:            ${formatCurrency(totalPartialPayments)}`);
    console.log(`\n   Total Outstanding (All - Paid - Partial):`);
    console.log(`   ${formatCurrency(totalAllInvoiceAmounts)} - ${formatCurrency(totalCompletelyPaidAmounts)} - ${formatCurrency(totalPartialPayments)}`);
    console.log(`\n   = ${formatCurrency(totalOutstanding)}\n`);
    
    console.log('📋 INVOICE COUNTS:');
    console.log(`   Total invoices:                     ${invoicesSnapshot.docs.length}`);
    console.log(`   Completely paid:                    ${completelyPaidCount}`);
    console.log(`   Partially paid:                     ${partialPaymentCount}`);
    console.log(`   Unpaid (with outstanding):          ${unpaidCount}`);
    console.log(`   Fully paid (no outstanding):         ${completelyPaidCount}\n`);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💰 TOTAL OUTSTANDING: ${formatCurrency(totalOutstanding)}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Verification
    const calculated = totalAllInvoiceAmounts - totalCompletelyPaidAmounts - totalPartialPayments;
    console.log(`✅ Verification: ${formatCurrency(calculated)} (should match above)\n`);
    
  } catch (error) {
    console.error('❌ Error calculating outstanding:', error);
    process.exit(1);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

calculateOutstanding();
