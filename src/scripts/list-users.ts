// Script to list all users from Firestore 'users' collection
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Inline Firebase config (copied from config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI",
  authDomain: "equitysys-41320.firebaseapp.com",
  projectId: "equitysys-41320",
  storageBucket: "equitysys-41320.firebasestorage.app",
  messagingSenderId: "989839221549",
  appId: "1:989839221549:web:4400f782d5f8c9bd6aa9a4",
  measurementId: "G-KR0H4HEB4D"
};

async function listUsers() {
  // Initialize Firebase app
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Reference to 'users' collection
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);

  if (snapshot.empty) {
    console.log('No users found in Firestore.');
    return;
  }

  console.log('Users in Firestore:');
  snapshot.forEach(doc => {
    console.log({ id: doc.id, ...doc.data() });
  });
}

listUsers().catch(err => {
  console.error('Error fetching users:', err);
  process.exit(1);
}); 