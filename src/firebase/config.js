import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "elderx-f5c2b.firebaseapp.com",
  projectId: "elderx-f5c2b",
  storageBucket: "elderx-f5c2b.firebasestorage.app",
  messagingSenderId: "987610993096",
  appId: "1:987610993096:web:97c82732772d1223d3f0fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development (commented out for now)
// if (process.env.NODE_ENV === 'development') {
//   try {
//     connectAuthEmulator(auth, 'http://localhost:9099');
//     connectFirestoreEmulator(db, 'localhost', 8080);
//     connectFunctionsEmulator(functions, 'localhost', 5001);
//     console.log('Connected to Firebase emulators');
//   } catch (error) {
//     console.log('Emulators already connected or not available');
//   }
// }

export default app;
