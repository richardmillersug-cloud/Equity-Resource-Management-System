// Copy and paste this entire script into your browser console
// while on http://localhost:3000/dashboard/purchase-manager/supplier-totals

(async function calculateOutstanding() {
  try {
    const { collection, getDocs, query } = await import('https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js');
    const { db } = await import('/src/lib/firebase/config.js');
    
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
      
      totalAllInvoiceAmounts += invoiceAmount;
      
      if (paidAmount >= invoiceAmount && invoiceAmount > 0) {
        totalCompletelyPaidAmounts += invoiceAmount;
        completelyPaidCount++;
      }
      
      if (paidAmount > 0 && paidAmount < invoiceAmount) {
        totalPartialPayments += paidAmount;
        partialPaymentCount++;
      }
      
      if (remainingAmount > 0) {
        unpaidCount++;
      }
      
      totalOutstanding += remainingAmount;
    });
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency: 'UGX',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    };
    
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
    console.log(`   Unpaid (with outstanding):          ${unpaidCount}\n`);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💰 TOTAL OUTSTANDING: ${formatCurrency(totalOutstanding)}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    const calculated = totalAllInvoiceAmounts - totalCompletelyPaidAmounts - totalPartialPayments;
    console.log(`✅ Verification: ${formatCurrency(calculated)} (should match above)\n`);
    
    return {
      totalOutstanding,
      totalAllInvoiceAmounts,
      totalCompletelyPaidAmounts,
      totalPartialPayments,
      invoiceCounts: {
        total: invoicesSnapshot.docs.length,
        completelyPaid: completelyPaidCount,
        partiallyPaid: partialPaymentCount,
        unpaid: unpaidCount
      }
    };
    
  } catch (error) {
    console.error('❌ Error calculating outstanding:', error);
    throw error;
  }
})();
