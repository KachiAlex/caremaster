// databaseCompat — compatibility layer that re-exports backend/database stubs
// This replaces the old Firestore compatibility layer

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'backend/database';

export {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
};
