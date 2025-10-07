import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CARE_LOGS_COLLECTION = 'careLogs';

export async function createCareLog(log, institutionId = null) {
  if (!log || !log.patientId || !log.caregiverId || !log.content) {
    throw new Error('patientId, caregiverId and content are required');
  }
  const payload = {
    ...log,
    institutionId: institutionId || log.institutionId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, CARE_LOGS_COLLECTION), payload);
  return { id: ref.id, ...payload };
}

export async function updateCareLog(logId, updates) {
  if (!logId || !updates) throw new Error('logId and updates required');
  const ref = doc(db, CARE_LOGS_COLLECTION, logId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

export async function deleteCareLog(logId) {
  if (!logId) throw new Error('logId required');
  const ref = doc(db, CARE_LOGS_COLLECTION, logId);
  await deleteDoc(ref);
  return true;
}

export async function getCareLogsByPatient(patientId, institutionId = null) {
  if (!patientId) throw new Error('patientId required');
  let q = query(
    collection(db, CARE_LOGS_COLLECTION),
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc')
  );
  
  // Add institution filtering if provided
  if (institutionId) {
    q = query(
      collection(db, CARE_LOGS_COLLECTION),
      where('patientId', '==', patientId),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc')
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCareLogsByCaregiver(caregiverId) {
  if (!caregiverId) throw new Error('caregiverId required');
  const q = query(
    collection(db, CARE_LOGS_COLLECTION),
    where('caregiverId', '==', caregiverId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}




