// Backend auth compatibility stub — no Firebase SDK is initialized here.
// Auth, data, storage, and functions are now handled by the backend API.
import { getFirestore, connectFirestoreEmulator } from 'backend/database';
import { getStorage, connectStorageEmulator } from 'backend/storage';
import { getFunctions, connectFunctionsEmulator } from 'backend/functions';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'backend/auth';

const app = {};

// Initialize backend services (all stubs)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Set auth persistence to local storage
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {
  // no-op
}

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    // no-op
  }
}

export default app;
