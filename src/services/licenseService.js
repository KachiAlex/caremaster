import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { getLicenseStatus as getDirectLicenseStatus, activateLicenseByKey as directActivateLicenseByKey, getAllLicenses as getDirectLicenses, getAllInstitutions as getDirectInstitutions } from '../api/licenseAPI';

// Use direct Firestore access to bypass CORS issues
export async function fetchLicenseStatus(institutionId) {
  try {
    // Use direct Firestore access instead of Cloud Functions
    const status = await getDirectLicenseStatus(institutionId);
    return status;
  } catch (error) {
    console.error('Error fetching license status:', error);
    // Security: Default to inactive on error
    return { active: false, reason: 'error', error: error.message };
  }
}

// Activate license using license key
export async function activateLicense(licenseKey, institutionId) {
  try {
    const result = await directActivateLicenseByKey(licenseKey, institutionId);
    return result;
  } catch (error) {
    console.error('Error activating license:', error);
    throw error;
  }
}

// Validate license key format
export function validateLicenseKey(licenseKey) {
  if (!licenseKey || typeof licenseKey !== 'string') {
    return { valid: false, error: 'License key is required' };
  }
  
  // License key format: LIC-XXXX-XXXX-XXXX-XXXX (20 chars + 4 dashes = 24 total)
  const licenseKeyPattern = /^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  
  if (!licenseKeyPattern.test(licenseKey)) {
    return { valid: false, error: 'Invalid license key format. Expected: LIC-XXXX-XXXX-XXXX-XXXX' };
  }
  
  return { valid: true };
}

// Generate a license key
export function generateLicenseKey() {
  const segments = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars: 0, O, I, 1
  
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `LIC-${segments.join('-')}`;
}

export async function createInstitution(payload) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'createInstitutionFunction');
  const res = await callable(payload);
  return res.data;
}

export async function createLicense(payload) {
  try {
    // Use direct Firestore access to bypass CORS issues
    const { createLicense: createLicenseDirect } = await import('../api/licenseAPI');
    return await createLicenseDirect(payload);
  } catch (error) {
    console.error('Error creating license via Firestore:', error);
    // Fallback to Cloud Function if Firestore fails
    const functions = getFunctions(getApp(), 'us-central1');
    const callable = httpsCallable(functions, 'createLicenseFunction');
    const res = await callable(payload);
    return res.data;
  }
}

export async function assignInstitutionAdmin(payload) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'assignInstitutionAdminFunction');
  const res = await callable(payload);
  return res.data;
}

export async function getInstitutions() {
  try {
    // Use direct Firestore access to bypass CORS
    const institutions = await getDirectInstitutions();
    return institutions;
  } catch (error) {
    console.error('Error fetching institutions:', error);
    // Fallback to Cloud Functions if Firestore fails
    try {
      const functions = getFunctions(getApp(), 'us-central1');
      const callable = httpsCallable(functions, 'getInstitutionsFunction');
      const res = await callable();
      return res.data;
    } catch (funcError) {
      throw error;
    }
  }
}

export async function getLicenses() {
  try {
    // Use direct Firestore access to bypass CORS
    const licenses = await getDirectLicenses();
    return licenses;
  } catch (error) {
    console.error('Error fetching licenses:', error);
    // Fallback to Cloud Functions if Firestore fails
    try {
      const functions = getFunctions(getApp(), 'us-central1');
      const callable = httpsCallable(functions, 'getLicensesFunction');
      const res = await callable();
      return res.data;
    } catch (funcError) {
      throw error;
    }
  }
}

export async function updateInstitution(institutionId, updates) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'updateInstitutionFunction');
  const res = await callable({ institutionId, updates });
  return res.data;
}

export async function deleteInstitution(institutionId) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'deleteInstitutionFunction');
  const res = await callable({ institutionId });
  return res.data;
}

export async function updateLicense(licenseId, updates) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'updateLicenseFunction');
  const res = await callable({ licenseId, updates });
  return res.data;
}

export async function suspendLicense(licenseId) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'suspendLicenseFunction');
  const res = await callable({ licenseId });
  return res.data;
}

export async function activateLicenseById(licenseId) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'activateLicenseFunction');
  const res = await callable({ licenseId });
  return res.data;
}

export async function migrateInstitutionLinks(options = {}) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'migrateInstitutionLinksFunction');
  const res = await callable(options);
  return res.data;
}

export async function getInstitutionAdmins(institutionId) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'getInstitutionAdminsFunction');
  const res = await callable({ institutionId });
  return res.data;
}

export async function removeInstitutionAdmin(payload) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'removeInstitutionAdminFunction');
  const res = await callable(payload);
  return res.data;
}

