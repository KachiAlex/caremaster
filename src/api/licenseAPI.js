/**
 * License API
 * Direct Database access for license management (bypasses Cloud Functions CORS issues)
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

const LICENSES_COLLECTION = 'licenses';
const INSTITUTIONS_COLLECTION = 'institutions';

// Get license status for an institution
export const getLicenseStatus = async (institutionId) => {
  try {
    console.log('🔍 LICENSE CHECK - Institution ID:', institutionId);

    if (!institutionId) {
      console.warn('❌ LICENSE CHECK - No institution ID provided');
      return { active: false, reason: 'no_institution_id' };
    }

    // Use the public license-status endpoint (no auth required)
    const API_BASE = process.env.REACT_APP_API_URL || 'https://getcaremaster.com/api';
    const res = await fetch(`${API_BASE}/auth/license-status/${institutionId}`);
    const body = await res.json();

    if (!res.ok || !body.success) {
      console.warn('❌ LICENSE CHECK - API returned error:', body);
      return { active: false, reason: body.reason || 'check_error' };
    }

    console.log('✅ LICENSE CHECK - License status:', {
      active: body.active,
      reason: body.reason,
      hasLicense: !!body.license
    });

    return {
      active: body.active,
      reason: body.reason || (body.active ? 'active' : 'inactive'),
      license: body.license
    };
  } catch (error) {
    console.error('❌ LICENSE CHECK - Error:', error);
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

// Get institution admins (SuperAdmin only)
export const getInstitutionAdmins = async (institutionId) => {
  try {
    // Query users collection for admins of this institution
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('institutionId', '==', institutionId),
      where('userType', 'in', ['admin', 'institutionAdmin'])
    );
    
    const snapshot = await getDocs(q);
    const admins = [];
    
    snapshot.forEach((doc) => {
      admins.push({ id: doc.id, ...doc.data() });
    });

    console.log('✅ Institution admins fetched:', admins.length);
    return admins;
  } catch (error) {
    console.error('Error fetching institution admins:', error);
    throw error;
  }
};

// Assign institution admin (SuperAdmin only)
export const assignInstitutionAdmin = async ({ institutionId, email, displayName, password }) => {
  try {
    // Check if institution exists
    const institutionRef = doc(db, 'institutions', institutionId);
    const institutionSnap = await getDoc(institutionRef);
    
    if (!institutionSnap.exists()) {
      throw new Error('Institution not found');
    }

    // Check if user already exists
    const usersRef = collection(db, 'users');
    const existingUserQuery = query(usersRef, where('email', '==', email));
    const existingUserSnap = await getDocs(existingUserQuery);
    
    let userId;
    
    if (!existingUserSnap.empty) {
      // User exists, update their profile
      const existingUserDoc = existingUserSnap.docs[0];
      userId = existingUserDoc.id;
      
      await updateDoc(doc(db, 'users', userId), {
        institutionId,
        institutionAdmin: true,
        type: 'admin',
        userType: 'admin',
        role: 'admin',
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Existing user updated as admin:', email);
    } else {
      // Create new user in Backend Auth (Note: This requires the current user to be signed out temporarily)
      // For production, this should be done via Cloud Functions with admin SDK
      console.warn('⚠️ Cannot create new Backend Auth users from client. User must exist first.');
      throw new Error('User does not exist. Please create the user account first or use Cloud Functions.');
    }

    // Create admin mapping
    const adminMappingRef = doc(collection(db, 'institutionAdmins'));
    await setDoc(adminMappingRef, {
      institutionId,
      userId,
      email,
      createdAt: serverTimestamp()
    });

    console.log('✅ Admin assigned successfully:', email);
    return { userId, email, institutionId };
  } catch (error) {
    console.error('Error assigning institution admin:', error);
    throw error;
  }
};

// Remove institution admin
export const removeInstitutionAdmin = async ({ institutionId, adminId }) => {
  try {
    // Remove institutionId from user document
    const userRef = doc(db, 'users', adminId);
    await updateDoc(userRef, {
      institutionId: null,
      institutionAdmin: false,
      updatedAt: serverTimestamp()
    });

    // Remove from institutionAdmins collection
    const adminMappingsRef = collection(db, 'institutionAdmins');
    const q = query(
      adminMappingsRef,
      where('institutionId', '==', institutionId),
      where('userId', '==', adminId)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log('✅ Admin removed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error removing institution admin:', error);
    throw error;
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
  activateLicenseByKey,
  getInstitutionAdmins,
  assignInstitutionAdmin,
  removeInstitutionAdmin
};

