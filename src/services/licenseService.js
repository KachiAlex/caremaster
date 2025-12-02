import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

export async function fetchLicenseStatus(institutionId) {
  return new Promise((resolve) => {
    if (!institutionId) {
      resolve({ active: false, reason: 'no_institution_id' });
      return;
    }

    const functions = getFunctions(getApp(), 'us-central1');
    const callable = httpsCallable(functions, 'getLicenseStatusFunction');
    
    // Call license check function
    Promise.resolve(callable({ institutionId }))
      .then((res) => {
        resolve(res.data);
      })
      .catch((error) => {
        console.error('License check error:', error);
        // If functions not deployed or network error, default to INACTIVE for security
        resolve({ active: false, reason: 'check_unavailable', error: error.message });
      });
  }).catch(() => {
    // Security: Default to inactive on any error
    return { active: false, reason: 'error' };
  });
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
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'createLicenseFunction');
  const res = await callable(payload);
  return res.data;
}

export async function assignInstitutionAdmin(payload) {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'assignInstitutionAdminFunction');
  const res = await callable(payload);
  return res.data;
}

export async function getInstitutions() {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'getInstitutionsFunction');
  const res = await callable();
  return res.data;
}

export async function getLicenses() {
  const functions = getFunctions(getApp(), 'us-central1');
  const callable = httpsCallable(functions, 'getLicensesFunction');
  const res = await callable();
  return res.data;
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

export async function activateLicense(licenseId) {
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

