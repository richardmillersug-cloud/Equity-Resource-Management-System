// ============================================
// CALCULATE OUTSTANDING - BROWSER CONSOLE SCRIPT
// ============================================
// 
// INSTRUCTIONS:
// 1. Open http://localhost:3000/dashboard/purchase-manager/supplier-totals
// 2. Open browser console (F12)
// 3. Copy and paste this entire script
// 4. Press Enter
//
// ============================================

(async () => {
  const { collection, getDocs, query } = await import('firebase/firestore');
  const { db } = await import('/src/lib/firebase/config.js');
  
  console.log('📊 Fetching all invoices...');
  const invoicesSnapshot = await getDocs(query(collection(db, 'invoices')));
  
  let sumAllInvoices = 0;
  let sumCompletelyPaid = 0;
  let sumPartialPayments = 0;
  let countCompletelyPaid = 0;
  let countPartial = 0;
  let countUnpaid = 0;
  
  invoicesSnapshot.docs.forEach(doc => {
    const inv = doc.data();
    const amount = Number(inv.amount || inv.amountInDigits || 0);
    const paid = Number(inv.paidAmount || 0);
    const remaining = Math.max(0, amount - paid);
    
    sumAllInvoices += amount;
    
    if (paid >= amount && amount > 0) {
      sumCompletelyPaid += amount;
      countCompletelyPaid++;
    } else if (paid > 0 && paid < amount) {
      sumPartialPayments += paid;
      countPartial++;
    }
    
    if (remaining > 0) countUnpaid++;
  });
  
  const totalOutstanding = sumAllInvoices - sumCompletelyPaid - sumPartialPayments;
  
  const format = (n) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('💰 TOTAL OUTSTANDING CALCULATION');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Sum of ALL invoices:              ${format(sumAllInvoices)}`);
  console.log(`Less: Completely paid invoices:   ${format(sumCompletelyPaid)}`);
  console.log(`Less: Partial payments:           ${format(sumPartialPayments)}`);
  console.log('───────────────────────────────────────────────────────');
  console.log(`TOTAL OUTSTANDING:                ${format(totalOutstanding)}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Total invoices: ${invoicesSnapshot.docs.length}`);
  console.log(`Completely paid: ${countCompletelyPaid}`);
  console.log(`Partially paid: ${countPartial}`);
  console.log(`Unpaid: ${countUnpaid}\n`);
  
  return totalOutstanding;
})();
