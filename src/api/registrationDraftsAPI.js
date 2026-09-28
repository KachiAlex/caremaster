import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'backend/database';
import { db } from '../backend/config';

// Server-side drafts for the admin client-registration flow. Maps to the
// registration_drafts table (admin-only, institution-scoped). Passwords are
// never sent — callers must strip credentials before saving.
const COLLECTION = 'registrationDrafts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuidOrNull = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);

const unwrap = (snapOrArr) => {
  if (!snapOrArr) return [];
  if (Array.isArray(snapOrArr)) return snapOrArr;
  const docs = snapOrArr.docs || [];
  return docs.map((d) => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d.data) }));
};

const parseDraft = (row) => ({
  ...row,
  formData: row.formData || row.form_data || {},
});

/**
 * List in-progress registration drafts for an institution.
 * @param {string} institutionId
 */
export const getRegistrationDrafts = async (institutionId) => {
  try {
    const clauses = [where('status', '==', 'in_progress')];
    const instId = asUuidOrNull(institutionId);
    if (instId) clauses.push(where('institutionId', '==', instId));
    const snap = await getDocs(query(collection(db, COLLECTION), ...clauses));
    return unwrap(snap)
      .map(parseDraft)
      .sort((a, b) => new Date(b.lastSavedAt || b.last_saved_at || 0) - new Date(a.lastSavedAt || a.last_saved_at || 0));
  } catch (err) {
    console.error('Failed to load registration drafts:', err);
    return [];
  }
};

/**
 * Create a new server-side draft. Returns { id } or null on failure.
 */
export const createRegistrationDraft = async ({ institutionId, createdByName, clientName, formData, currentStep, nationalId }) => {
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      institutionId: asUuidOrNull(institutionId),
      createdByName: createdByName || null,
      clientName: clientName || null,
      formData: formData || {},
      currentStep: currentStep || 1,
      nationalId: nationalId || null,
      status: 'in_progress',
      lastSavedAt: new Date().toISOString(),
    });
    return ref?.id ? { id: ref.id } : (ref ? { id: ref.id || ref } : null);
  } catch (err) {
    console.error('Failed to create registration draft:', err);
    return null;
  }
};

/**
 * Update an existing draft (autosave). Returns true on success.
 */
export const updateRegistrationDraft = async (draftId, { clientName, formData, currentStep, nationalId }) => {
  if (!asUuidOrNull(draftId)) return false;
  try {
    await updateDoc(doc(db, COLLECTION, draftId), {
      clientName: clientName || null,
      formData: formData || {},
      currentStep: currentStep || 1,
      nationalId: nationalId || null,
      lastSavedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Failed to update registration draft:', err);
    return false;
  }
};

/**
 * Discard (delete) a draft — used when the admin explicitly discards or the
 * registration completes successfully.
 */
export const deleteRegistrationDraft = async (draftId) => {
  if (!asUuidOrNull(draftId)) return false;
  try {
    await deleteDoc(doc(db, COLLECTION, draftId));
    return true;
  } catch (err) {
    console.error('Failed to delete registration draft:', err);
    return false;
  }
};
