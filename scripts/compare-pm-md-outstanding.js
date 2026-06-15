/**
 * Compare PM-style vs MD-style outstanding invoice counts.
 * Run in browser console while logged in (Firestore rules require auth):
 *   1. Open /dashboard/purchase-manager or /dashboard/managing-director
 *   2. Paste this script in DevTools console
 *
 * PM-style  = status filter + invoice.paidAmount (supplier-totals / invoices page)
 * MD-style  = sumOutstanding via invoicePayments (MD dashboard breakdown)
 */

(async () => {
  const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
  const { db } = await import('/src/lib/firebase/config.js');

  const fmt = (n) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);

  const toJsDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const getInvoiceAmount = (inv) =>
    safeNum(inv.amount ?? inv.amountInDigits ?? inv.totalAmount ?? 0);

  const getPaymentAmount = (p) =>
    safeNum(p.amount ?? p.paidAmount ?? p.paymentAmount ?? 0);

  const getPaymentDate = (p) => {
    const primary = toJsDate(p.paymentDate);
    if (primary) return primary;
    if (p.paymentStatus === 'completed' || !p.paymentStatus) {
      const processed = toJsDate(p.processedAt);
      if (processed) return processed;
    }
    return toJsDate(p.createdAt);
  };

  const isCheque = (p) => p.paymentMethod?.type === 'cheque';

  const isValidPayment = (p) => {
    const status = p.paymentStatus;
    if (status === 'failed' || status === 'cancelled') return false;
    if (isCheque(p)) return status === 'completed';
    return (status || 'completed') === 'completed';
  };

  const getOutstandingAt = (invoice, payments, asOf) => {
    const amount = getInvoiceAmount(invoice);
    const paid = payments
      .filter((p) => {
        const d = getPaymentDate(p);
        return p.invoiceId === invoice.id && isValidPayment(p) && d && d <= asOf;
      })
      .reduce((s, p) => s + getPaymentAmount(p), 0);
    return Math.max(0, amount - paid);
  };

  const asOf = new Date();
  const unpaidStatuses = ['pending', 'approved', 'partial', 'overdue', 'draft'];

  const [invoiceSnap, paymentSnap] = await Promise.all([
    getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, 'invoicePayments'), orderBy('paymentDate', 'desc'))),
  ]);

  const invoices = invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ── PM-style (supplier-totals) ──────────────────────────────────────────
  let pmUnpaid = 0;
  let pmPartial = 0;
  const pmIds = new Set();

  invoices.forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (!status || !unpaidStatuses.includes(status)) return;

    const amount = getInvoiceAmount(inv);
    const paid = safeNum(inv.paidAmount);
    const remaining = Math.max(0, amount - paid);
    if (remaining <= 0) return;

    pmIds.add(inv.id);
    if (status.includes('partial')) pmPartial++;
    else pmUnpaid++;
  });

  // ── MD-style (sumOutstanding) ─────────────────────────────────────────────
  let mdFullyUnpaid = 0;
  let mdPartial = 0;
  const mdIds = new Set();

  invoices.forEach((inv) => {
    const invoiceDate = toJsDate(inv.date ?? inv.createdAt);
    if (!invoiceDate || invoiceDate > asOf) return;

    const amount = getInvoiceAmount(inv);
    const remaining = getOutstandingAt(inv, payments, asOf);
    if (remaining <= 0) return;

    mdIds.add(inv.id);
    const completedPaid = amount - remaining;
    if (completedPaid > 0 && completedPaid < amount) mdPartial++;
    else mdFullyUnpaid++;
  });

  // ── Discrepancy buckets ───────────────────────────────────────────────────
  const onlyInMd = [];
  const onlyInPm = [];

  mdIds.forEach((id) => {
    if (!pmIds.has(id)) {
      const inv = invoices.find((i) => i.id === id);
      const amount = getInvoiceAmount(inv);
      const paidAmount = safeNum(inv.paidAmount);
      const mdRemaining = getOutstandingAt(inv, payments, asOf);
      onlyInMd.push({
        id,
        invoiceNumber: inv.invoiceNumber || inv.fdn || id.slice(0, 8),
        status: inv.status,
        amount,
        paidAmount,
        pmRemaining: Math.max(0, amount - paidAmount),
        mdRemaining,
        reason:
          !(inv.status || '').toLowerCase() || !unpaidStatuses.includes((inv.status || '').toLowerCase())
            ? 'status_excluded'
            : paidAmount >= amount
              ? 'paidAmount_shows_fully_paid'
              : 'other',
      });
    }
  });

  pmIds.forEach((id) => {
    if (!mdIds.has(id)) onlyInPm.push(id);
  });

  const byReason = onlyInMd.reduce((acc, row) => {
    acc[row.reason] = (acc[row.reason] || 0) + 1;
    return acc;
  }, {});

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('PM vs MD OUTSTANDING INVOICE COUNT COMPARISON');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('PM-style (status + paidAmount):');
  console.log(`  Fully unpaid:  ${pmUnpaid}`);
  console.log(`  Partial:       ${pmPartial}`);
  console.log(`  TOTAL:         ${pmIds.size}\n`);

  console.log('MD-style (invoicePayments):');
  console.log(`  Fully unpaid:  ${mdFullyUnpaid}`);
  console.log(`  Partial:       ${mdPartial}`);
  console.log(`  TOTAL:         ${mdIds.size}\n`);

  console.log(`Gap (MD − PM):   ${mdIds.size - pmIds.size} invoices\n`);

  console.log('Why MD counts invoices PM misses:');
  Object.entries(byReason).forEach(([reason, count]) => {
    console.log(`  ${reason}: ${count}`);
  });

  if (onlyInMd.length) {
    console.log('\nSample invoices in MD but NOT PM (first 15):');
    console.table(
      onlyInMd.slice(0, 15).map((r) => ({
        invoice: r.invoiceNumber,
        status: r.status,
        paidAmount: r.paidAmount,
        pmRemaining: r.pmRemaining,
        mdRemaining: r.mdRemaining,
        reason: r.reason,
      }))
    );
  }

  if (onlyInPm.length) {
    console.log(`\n${onlyInPm.length} invoice(s) in PM but NOT MD (likely future-dated or payment sync):`);
    onlyInPm.slice(0, 10).forEach((id) => {
      const inv = invoices.find((i) => i.id === id);
      console.log(' ', inv?.invoiceNumber || id, '| status:', inv?.status);
    });
  }

  console.log('\nFull onlyInMd list available as window.__onlyInMd');
  window.__onlyInMd = onlyInMd;
})();
