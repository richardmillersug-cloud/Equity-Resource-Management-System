/**
 * Compare outstanding calculation methods and cheque impact.
 * Run: node scripts/diagnose-outstanding.js
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI',
  authDomain: 'equitysys-41320.firebaseapp.com',
  projectId: 'equitysys-41320',
  storageBucket: 'equitysys-41320.firebasestorage.app',
  messagingSenderId: '989839221549',
  appId: '1:989839221549:web:4400f782d5f8c9bd6aa9a4',
};

function toJsDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getInvoiceAmount(invoice) {
  return safeNumber(invoice.amount ?? invoice.amountInDigits ?? invoice.totalAmount ?? 0);
}

function getPaymentAmount(payment) {
  return safeNumber(payment.amount ?? payment.paidAmount ?? payment.paymentAmount ?? 0);
}

function getPaymentDate(payment) {
  const primary = toJsDate(payment.paymentDate);
  if (primary) return primary;
  if (payment.paymentStatus === 'completed' || !payment.paymentStatus) {
    const processed = toJsDate(payment.processedAt);
    if (processed) return processed;
  }
  return toJsDate(payment.createdAt);
}

function isValidPayment(payment) {
  const status = payment.paymentStatus || 'completed';
  return status === 'completed';
}

function getInvoiceOutstandingAt(invoice, payments, asOf) {
  const invoiceAmount = getInvoiceAmount(invoice);
  const paidUpTo = payments
    .filter((payment) => {
      const paymentDate = getPaymentDate(payment);
      return (
        payment.invoiceId === invoice.id &&
        isValidPayment(payment) &&
        paymentDate &&
        paymentDate <= asOf
      );
    })
    .reduce((sum, p) => sum + getPaymentAmount(p), 0);
  return Math.max(0, invoiceAmount - paidUpTo);
}

function fmt(n) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const asOf = new Date();

  const [invoiceSnap, paymentSnap] = await Promise.all([
    getDocs(collection(db, 'invoices')),
    getDocs(collection(db, 'invoicePayments')),
  ]);

  const invoices = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Method 1: paidAmount (supplier-totals / legacy)
  let paidAmountOutstanding = 0;
  let fullyUnpaidRemaining = 0;
  let partialRemaining = 0;
  let partialCount = 0;
  let fullyUnpaidCount = 0;

  invoices.forEach((inv) => {
    const amount = getInvoiceAmount(inv);
    const paid = safeNumber(inv.paidAmount);
    const remaining = Math.max(0, amount - paid);
    if (remaining <= 0) return;
    paidAmountOutstanding += remaining;
    if (paid > 0 && paid < amount) {
      partialRemaining += remaining;
      partialCount++;
    } else {
      fullyUnpaidRemaining += remaining;
      fullyUnpaidCount++;
    }
  });

  // Method 2: invoicePayments completed only (MD dashboard)
  let paymentsBasedOutstanding = 0;
  let paymentsPartialRemaining = 0;
  let paymentsPartialCount = 0;
  let paymentsFullyUnpaidRemaining = 0;
  let paymentsFullyUnpaidCount = 0;

  invoices.forEach((inv) => {
    const invoiceDate = toJsDate(inv.date ?? inv.createdAt);
    if (!invoiceDate || invoiceDate > asOf) return;
    const remaining = getInvoiceOutstandingAt(inv, payments, asOf);
    if (remaining <= 0) return;
    paymentsBasedOutstanding += remaining;
    const amount = getInvoiceAmount(inv);
    const completedPaid = amount - remaining;
    if (completedPaid > 0 && completedPaid < amount) {
      paymentsPartialRemaining += remaining;
      paymentsPartialCount++;
    } else {
      paymentsFullyUnpaidRemaining += remaining;
      paymentsFullyUnpaidCount++;
    }
  });

  // Cheque analysis
  const chequePayments = payments.filter((p) => p.paymentMethod?.type === 'cheque');
  const pendingCheques = chequePayments.filter((p) => (p.paymentStatus || 'completed') === 'pending');
  const completedCheques = chequePayments.filter((p) => (p.paymentStatus || 'completed') === 'completed');
  const failedCheques = chequePayments.filter((p) => ['failed', 'cancelled'].includes(p.paymentStatus || ''));
  const legacyChequesNoStatus = chequePayments.filter((p) => !p.paymentStatus);

  const pendingChequeTotal = pendingCheques.reduce((s, p) => s + getPaymentAmount(p), 0);
  const legacyChequeTotal = legacyChequesNoStatus.reduce((s, p) => s + getPaymentAmount(p), 0);

  // What if legacy cheques without status were NOT counted as completed?
  let outstandingIfLegacyChequesExcluded = 0;
  invoices.forEach((inv) => {
    const invoiceDate = toJsDate(inv.date ?? inv.createdAt);
    if (!invoiceDate || invoiceDate > asOf) return;
    const invoiceAmount = getInvoiceAmount(inv);
    const paidUpTo = payments
      .filter((payment) => {
        const paymentDate = getPaymentDate(payment);
        const status = payment.paymentStatus || 'completed';
        const isCheque = payment.paymentMethod?.type === 'cheque';
        const isLegacyUnclearedCheque = isCheque && !payment.paymentStatus && status === 'completed';
        if (isLegacyUnclearedCheque) return false;
        return (
          payment.invoiceId === inv.id &&
          status === 'completed' &&
          paymentDate &&
          paymentDate <= asOf
        );
      })
      .reduce((sum, p) => sum + getPaymentAmount(p), 0);
    const remaining = Math.max(0, invoiceAmount - paidUpTo);
    outstandingIfLegacyChequesExcluded += remaining;
  });

  console.log('\n=== OUTSTANDING COMPARISON ===\n');
  console.log(`paidAmount method (supplier-totals):     ${fmt(paidAmountOutstanding)}`);
  console.log(`invoicePayments completed (MD/PM):     ${fmt(paymentsBasedOutstanding)}`);
  console.log(`If legacy cheques excluded:            ${fmt(outstandingIfLegacyChequesExcluded)}`);
  console.log(`Difference (payments - paidAmount):    ${fmt(paymentsBasedOutstanding - paidAmountOutstanding)}`);

  console.log('\n=== PARTIAL PAYMENT BREAKDOWN (invoicePayments method) ===\n');
  console.log(`Fully unpaid invoices:  ${paymentsFullyUnpaidCount} → remaining ${fmt(paymentsFullyUnpaidRemaining)}`);
  console.log(`Partially paid:         ${paymentsPartialCount} → remaining ${fmt(paymentsPartialRemaining)}`);
  console.log(`Total invoices w/ balance: ${paymentsFullyUnpaidCount + paymentsPartialCount}`);

  console.log('\n=== PARTIAL PAYMENT BREAKDOWN (paidAmount method) ===\n');
  console.log(`Fully unpaid:  ${fullyUnpaidCount} → ${fmt(fullyUnpaidRemaining)}`);
  console.log(`Partially paid: ${partialCount} → ${fmt(partialRemaining)}`);

  console.log('\n=== CHEQUE PAYMENTS ===\n');
  console.log(`Total cheque payments:     ${chequePayments.length}`);
  console.log(`Pending (not cleared):     ${pendingCheques.length} → ${fmt(pendingChequeTotal)}`);
  console.log(`Completed (cleared):       ${completedCheques.length}`);
  console.log(`Failed/cancelled:          ${failedCheques.length}`);
  console.log(`Legacy (no paymentStatus): ${legacyChequesNoStatus.length} → ${fmt(legacyChequeTotal)} counted as completed`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
