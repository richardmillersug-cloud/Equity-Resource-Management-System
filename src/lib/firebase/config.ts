// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3J6FwamZoYiOdqNEsz2bsYUSRb94ZxQI",
  authDomain: "equitysys-41320.firebaseapp.com",
  projectId: "equitysys-41320",
  storageBucket: "equitysys-41320.firebasestorage.app",
  messagingSenderId: "989839221549",
  appId: "1:989839221549:web:4400f782d5f8c9bd6aa9a4",
  measurementId: "G-KR0H4HEB4D"
};

// Initialize Firebase with enhanced error handling
console.log('🔥 Initializing Firebase...');
let app: any;
let db: any;
let auth: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
  
  // Initialize Firebase services with detailed logging
  db = getFirestore(app);
  console.log('✅ Firestore initialized:', {
    type: typeof db,
    constructor: db?.constructor?.name,
    hasDelegate: !!db?._delegate
  });
  
  auth = getAuth(app);
  console.log('✅ Auth initialized');
  
  storage = getStorage(app);
  console.log('✅ Storage initialized');
  
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
}

// Verification function to ensure Firebase is ready
export const verifyFirebaseInitialization = () => {
  console.log('🔍 Verifying Firebase initialization...');
  
  if (!app) {
    throw new Error('Firebase app not initialized');
  }
  
  if (!db) {
    throw new Error('Firestore database not initialized');
  }
  
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  
  console.log('✅ Firebase verification successful');
  return true;
};

// Force verification on module load (browser only)
if (typeof window !== 'undefined') {
  try {
    verifyFirebaseInitialization();
  } catch (error) {
    console.error('❌ Firebase verification failed:', error);
  }
}

export { app, db, auth, storage };

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app; 