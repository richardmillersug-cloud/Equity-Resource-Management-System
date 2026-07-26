/**
 * Client-SDK cleanup script (no Admin credentials).
 *
 * This will only succeed if your Firestore rules allow deletes for the current context.
 * If you get "Missing or insufficient permissions", use the Admin cleanup script
 * with ADC/service-account credentials instead.
 */
const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} = require('firebase/firestore');

// Keep in sync with src/lib/firebase/config.ts
const firebaseConfig = {
  apiKey: 'AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI',
  authDomain: 'equitysys-41320.firebaseapp.com',
  projectId: 'equitysys-41320',
  storageBucket: 'equitysys-41320.firebasestorage.app',
  messagingSenderId: '989839221549',
  appId: '1:989839221549:web:4400f782d5f8c9bd6aa9a4',
  measurementId: 'G-KR0H4HEB4D',
};

async function listMatchingDocs(db, collectionName) {
  const col = collection(db, collectionName);
  const refsByPath = new Map();

  const s1 = await getDocs(query(col, where('employeeId', '==', 'test_emp_001')));
  s1.forEach((d) => refsByPath.set(`${collectionName}/${d.id}`, d.ref));

  const s2 = await getDocs(query(col, where('branchId', '==', 'test_branch')));
  s2.forEach((d) => refsByPath.set(`${collectionName}/${d.id}`, d.ref));

  return [...refsByPath.values()];
}

async function cleanup() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const targets = ['cashCloses', 'cashClose'];
  let totalDeleted = 0;

  console.log(`🔎 Client cleanup starting (projectId=${firebaseConfig.projectId})`);

  for (const collectionName of targets) {
    console.log(`\n📦 Scanning collection: ${collectionName}`);
    const refs = await listMatchingDocs(db, collectionName);
    console.log(`Found ${refs.length} matching doc(s) in ${collectionName}`);

    if (refs.length === 0) continue;

    refs.slice(0, 10).forEach((r) => console.log(` - ${r.path}`));
    if (refs.length > 10) console.log(` - ... +${refs.length - 10} more`);

    for (const ref of refs) {
      await deleteDoc(ref);
      totalDeleted += 1;
    }

    console.log(`✅ Deleted ${refs.length} doc(s) from ${collectionName}`);
  }

  console.log(`\n✅ Cleanup complete. Total deleted: ${totalDeleted}`);
}

cleanup().catch((err) => {
  console.error('❌ Client cleanup failed:', err);
  process.exitCode = 1;
});

