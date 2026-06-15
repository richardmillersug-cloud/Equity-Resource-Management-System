#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const { Firestore } = require('@google-cloud/firestore');

const PROJECT_ID = 'equitysys-41320';
const invoiceNumber = process.argv[2];
const expectedPaymentRef = process.argv[3];

const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPUEAeNk_VEJqfOl2ckspW3yIfv6gVHR';

function loadTokens() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8')).tokens;
}

async function getAuthClient() {
  const tokens = loadTokens();
  const client = new OAuth2Client(FIREBASE_CLI_CLIENT_ID, FIREBASE_CLI_CLIENT_SECRET);
  if (tokens.access_token && tokens.expires_at > Date.now() + 60_000) {
    client.setCredentials({ access_token: tokens.access_token });
    return client;
  }
  client.setCredentials({ refresh_token: tokens.refresh_token });
  await client.getAccessToken();
  return client;
}

async function restorePaymentToAllocation(db, allocationId, paymentAmount) {
  const ref = db.collection('dailyAllocations').doc(allocationId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(`  Allocation ${allocationId} not found`);
    return;
  }
  const allocation = snap.data();
  const newUsedAmount = Math.max(0, (allocation.usedAmount || 0) - paymentAmount);
  const newAvailableBalance = (allocation.totalAllocated || 0) - newUsedAmount;
  const newTransactionCount = Math.max(0, (allocation.totalTransactions || 0) - 1);
  const updates = {
    usedAmount: newUsedAmount,
    availableBalance: newAvailableBalance,
    totalTransactions: newTransactionCount,
  };
  if (allocation.status === 'completed' && newAvailableBalance > 0) {
    updates.status = 'accepted';
  }
  await ref.update(updates);
  console.log(`  Restored allocation ${allocationId}: +UGX ${paymentAmount}`);
}

async function main() {
  if (!invoiceNumber) {
    console.error('Usage: node scripts/delete-invoice-gcloud.js <invoiceNumber> [paymentRef]');
    process.exit(1);
  }

  const authClient = await getAuthClient();
  const db = new Firestore({ projectId: PROJECT_ID, authClient });

  console.log(`Looking up invoice: ${invoiceNumber}`);
  const invoiceSnap = await db.collection('invoices').where('invoiceNumber', '==', invoiceNumber).get();

  if (invoiceSnap.empty) {
    console.error('Invoice not found');
    process.exit(1);
  }

  for (const invoiceDoc of invoiceSnap.docs) {
    const invoiceId = invoiceDoc.id;
    const invoice = invoiceDoc.data();
    console.log(`\nInvoice id: ${invoiceId}, supplier: ${invoice.supplierName}, amount: ${invoice.amount}`);

    const paymentsSnap = await db.collection('invoicePayments').where('invoiceId', '==', invoiceId).get();
    console.log(`Payments (${paymentsSnap.size}):`);
    for (const p of paymentsSnap.docs) {
      console.log(`  ${p.id}: ${p.data().paymentReference} (${p.data().amount})`);
    }

    if (expectedPaymentRef) {
      const found = paymentsSnap.docs.some((d) => d.data().paymentReference === expectedPaymentRef);
      console.log(found ? `Confirmed ${expectedPaymentRef}` : `Warning: ${expectedPaymentRef} not on invoice`);
    }

    for (const paymentDoc of paymentsSnap.docs) {
      const payment = paymentDoc.data();
      if (payment.allocationId && payment.allocationUsed) {
        try {
          await restorePaymentToAllocation(db, payment.allocationId, payment.amount);
        } catch (e) {
          console.error('  Allocation restore failed:', e.message);
        }
      }
    }

    const chequeSnap = await db.collection('chequeTracker').where('invoiceId', '==', invoiceId).get();
    const batch = db.batch();
    paymentsSnap.docs.forEach((d) => batch.delete(d.ref));
    chequeSnap.docs.forEach((d) => batch.delete(d.ref));
    if (invoice.installmentPlan?.id) {
      batch.delete(db.collection('installmentPlans').doc(invoice.installmentPlan.id));
    }
    batch.delete(invoiceDoc.ref);
    await batch.commit();

    console.log(`Deleted: ${paymentsSnap.size} payment(s), ${chequeSnap.size} cheque(s)`);
  }

  if (expectedPaymentRef) {
    const orphan = await db.collection('invoicePayments').where('paymentReference', '==', expectedPaymentRef).get();
    if (!orphan.empty) {
      const batch = db.batch();
      orphan.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      console.log(`Deleted ${orphan.size} orphan payment(s)`);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error('Error:', e.message || e);
  process.exit(1);
});
