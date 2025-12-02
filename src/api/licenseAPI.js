/**
 * License API
 * Direct Firestore access for license management (bypasses Cloud Functions CORS issues)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const LICENSES_COLLECTION = 'licenses';
const INSTITUTIONS_COLLECTION = 'institutions';

// Get license status for an institution
export const getLicenseStatus = async (institutionId) => {
  try {
    if (!institutionId) {
      return { active: false, reason: 'no_institution_id' };
    }

    // Query licenses for this institution
    const q = query(
      collection(db, LICENSES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('endsAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { active: false, reason: 'no_license' };
    }

    // Get the most recent license
    let mostRecentLicense = null;
    snapshot.forEach((doc) => {
      const licenseData = { id: doc.id, ...doc.data() };
      if (!mostRecentLicense) {
        mostRecentLicense = licenseData;
      }
    });

    if (!mostRecentLicense) {
      return { active: false, reason: 'no_valid_license' };
    }

    // Check if license is active
    const now = new Date();
    const endsAt = mostRecentLicense.endsAt?.toDate ? mostRecentLicense.endsAt.toDate() : new Date(mostRecentLicense.endsAt);
    const startsAt = mostRecentLicense.startsAt?.toDate ? mostRecentLicense.startsAt.toDate() : new Date(mostRecentLicense.startsAt || mostRecentLicense.createdAt);

    const isActiveStatus = mostRecentLicense.status === 'active' || mostRecentLicense.active === true;
    const isWithinDateRange = startsAt <= now && endsAt >= now;
    const active = isActiveStatus && isWithinDateRange;

    if (!active) {
      if (!isActiveStatus) {
        return { active: false, reason: 'license_suspended', license: mostRecentLicense };
      }
      if (!isWithinDateRange) {
        return { active: false, reason: 'license_expired', license: mostRecentLicense };
      }
    }

    return { active, license: mostRecentLicense };
  } catch (error) {
    console.error('Error checking license status:', error);
    // Security: Default to inactive on error
    return { active: false, reason: 'check_error', error: error.message };
  }
};

// Get all licenses (SuperAdmin only)
export const getAllLicenses = async () => {
  try {
    const q = query(collection(db, LICENSES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const licenses = [];
    snapshot.forEach((doc) => {
      licenses.push({ id: doc.id, ...doc.data() });
    });

    return licenses;
  } catch (error) {
    console.error('Error fetching licenses:', error);
    throw error;
  }
};

// Get all institutions (SuperAdmin only)
export const getAllInstitutions = async () => {
  try {
    const q = query(collection(db, INSTITUTIONS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const institutions = [];
    snapshot.forEach((doc) => {
      institutions.push({ id: doc.id, ...doc.data() });
    });

    return institutions;
  } catch (error) {
    console.error('Error fetching institutions:', error);
    throw error;
  }
};

// Create a new license (SuperAdmin only - should validate in security rules)
export const createLicense = async (licenseData) => {
  try {
    const newLicense = {
      institutionId: licenseData.institutionId,
      licenseKey: licenseData.licenseKey,
      plan: licenseData.plan || 'basic',
      seats: licenseData.seats || 10,
      startsAt: licenseData.startsAt ? Timestamp.fromDate(new Date(licenseData.startsAt)) : serverTimestamp(),
      endsAt: Timestamp.fromDate(new Date(licenseData.endsAt)),
      status: 'active',
      active: true,
      features: licenseData.features || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, LICENSES_COLLECTION), newLicense);
    console.log('✅ License created:', docRef.id);

    return { id: docRef.id, ...newLicense };
  } catch (error) {
    console.error('Error creating license:', error);
    throw error;
  }
};

// Update license
export const updateLicense = async (licenseId, updates) => {
  try {
    const licenseRef = doc(db, LICENSES_COLLECTION, licenseId);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // Convert date strings to Timestamps
    if (updates.endsAt) {
      updateData.endsAt = Timestamp.fromDate(new Date(updates.endsAt));
    }
    if (updates.startsAt) {
      updateData.startsAt = Timestamp.fromDate(new Date(updates.startsAt));
    }

    await updateDoc(licenseRef, updateData);
    console.log('✅ License updated:', licenseId);

    return { id: licenseId, ...updateData };
  } catch (error) {
    console.error('Error updating license:', error);
    throw error;
  }
};

// Suspend license
export const suspendLicense = async (licenseId) => {
  try {
    const licenseRef = doc(db, LICENSES_COLLECTION, licenseId);
    await updateDoc(licenseRef, {
      status: 'suspended',
      active: false,
      suspendedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ License suspended:', licenseId);
    return { success: true };
  } catch (error) {
    console.error('Error suspending license:', error);
    throw error;
  }
};

// Activate license
export const activateLicense = async (licenseId) => {
  try {
    const licenseRef = doc(db, LICENSES_COLLECTION, licenseId);
    await updateDoc(licenseRef, {
      status: 'active',
      active: true,
      activatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('✅ License activated:', licenseId);
    return { success: true };
  } catch (error) {
    console.error('Error activating license:', error);
    throw error;
  }
};

// Validate license key and activate
export const activateLicenseByKey = async (licenseKey, institutionId) => {
  try {
    // Find license by license key
    const q = query(
      collection(db, LICENSES_COLLECTION),
      where('licenseKey', '==', licenseKey.trim().toUpperCase())
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { success: false, error: 'Invalid license key' };
    }

    let matchedLicense = null;
    snapshot.forEach((doc) => {
      const licenseData = doc.data();
      // If institutionId provided, verify it matches
      if (!institutionId || licenseData.institutionId === institutionId) {
        matchedLicense = { id: doc.id, ...licenseData };
      }
    });

    if (!matchedLicense) {
      return { success: false, error: 'License key does not match this institution' };
    }

    // Check if already active
    if (matchedLicense.status === 'active' && matchedLicense.active === true) {
      return { success: true, alreadyActive: true, license: matchedLicense };
    }

    // Activate the license
    await activateLicense(matchedLicense.id);

    return { success: true, license: matchedLicense };
  } catch (error) {
    console.error('Error activating license by key:', error);
    return { success: false, error: error.message };
  }
};

export default {
  getLicenseStatus,
  getAllLicenses,
  getAllInstitutions,
  createLicense,
  updateLicense,
  suspendLicense,
  activateLicense,
  activateLicenseByKey
};

