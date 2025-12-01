import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import secureConfigService from '../services/secureConfigService';
import logger from '../utils/logger';

// Use secure configuration service with safe fallback for hosting runtime
let firebaseConfig = secureConfigService.getFirebaseConfig();

if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
  logger.warn('Firebase config missing from env; falling back to public config.');
  firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "***REMOVED***",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "elderx-f5c2b.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "elderx-f5c2b",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "elderx-f5c2b.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "987610993096",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:987610993096:web:97c82732772d1223d3f0fd"
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Set auth persistence to local storage for better session persistence
// This prevents automatic logout during token refresh
try {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    logger.warn('Failed to set auth persistence:', error);
  });
} catch (error) {
  logger.warn('Error setting auth persistence:', error);
}

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
}

export default app;
