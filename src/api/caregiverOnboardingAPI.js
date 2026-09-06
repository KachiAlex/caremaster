import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from './notificationsAPI';
import { collection, query, getDocs, getDoc, updateDoc, where, doc, serverTimestamp } from 'backend/database';
import { ref, uploadBytes, getDownloadURL } from 'backend/storage';
import { db, storage } from '../backend/config';

/**
 * Save caregiver onboarding profile data.
 *
 * All onboarding data is stored in users.onboarding_data (jsonb) — we do NOT
 * write to the caregivers table because:
 *   1. The caregivers table is empty in production (no records exist for most users)
 *   2. The backend PUT /data/caregivers/:id returns 404 for non-existent records
 *   3. The backend doesn't support upsert via PUT
 *
 * The users table is the single source of truth for onboarding state.
 */
export const saveCaregiverProfile = async (uid, profile, isDraft = false) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('User record not found. Please log out and log back in.');
  }

  const existingUserData = userSnap.data();
  const existingOnboardingData = existingUserData.onboardingData || {};

  // Merge profile data with existing onboarding data
  const mergedOnboardingData = {
    ...existingOnboardingData,
    ...profile,
    name: profile.name || existingUserData.name || existingOnboardingData.name || '',
    email: profile.email || existingUserData.email || existingOnboardingData.email || '',
    phone: profile.phone || existingUserData.phone || existingOnboardingData.phone || '',
    address: profile.address || existingOnboardingData.address || '',
    specializations: profile.specializations || existingOnboardingData.specializations || [],
    medicalQualification: profile.medicalQualification || existingOnboardingData.medicalQualification || '',
    yearsOfExperience: profile.yearsOfExperience || existingOnboardingData.yearsOfExperience || '',
    licenseNumber: profile.licenseNumber || existingOnboardingData.licenseNumber || '',
    bio: profile.bio || existingOnboardingData.bio || '',
    onboardingStep: profile.onboardingStep || existingOnboardingData.onboardingStep || 1,
    onboardingDraft: isDraft,
    onboardingComplete: isDraft ? false : (!!profile.onboardingComplete),
    savedAt: new Date().toISOString(),
  };

  await updateDoc(userRef, {
    onboardingData: mergedOnboardingData,
    onboardingComplete: isDraft ? false : (!!profile.onboardingComplete),
    updatedAt: serverTimestamp(),
  });

  console.log('✅ Onboarding profile saved to users.onboarding_data');
  return mergedOnboardingData;
};

// Save draft data
export const saveOnboardingDraft = async (uid, draftData) => {
  return saveCaregiverProfile(uid, draftData, true);
};

// Load draft data
export const loadOnboardingDraft = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    if (userData.onboardingData && Object.keys(userData.onboardingData).length > 0) {
      return userData.onboardingData;
    }
    // Return user data as fallback
    return userData;
  }
  return null;
};

export const uploadCaregiverDocument = async (uid, file, folder = 'documents') => {
  const path = `users/${uid}/${folder}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  const result = await uploadBytes(fileRef, file);
  if (result && result.downloadURL) {
    return { path, url: result.downloadURL };
  }
  const url = await getDownloadURL({ ...fileRef, downloadURL: result?.downloadURL });
  return { path, url };
};

/**
 * Mark onboarding as complete.
 *
 * Updates the users table with onboardingComplete=true, status=active.
 * Also sends notifications to institution admins.
 */
export const completeOnboarding = async (uid) => {
  console.log('🎯 Completing onboarding for user:', uid);

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const institutionId = userData.institutionId;
  const caregiverName = userData.name || userData.firstName || 'A caregiver';
  const caregiverEmail = userData.email || '';

  // Determine user type (caregiver, doctor, nurse, or pharmacist)
  const userType = userData.userType || userData.type || 'caregiver';
  const isPharmacist = userType === 'pharmacist';

  // Update users collection — this is the critical update
  const existingOnboardingData = userData.onboardingData || {};
  await updateDoc(userRef, {
    onboardingComplete: true,
    userType: userType,
    status: 'active',
    is_active: true,
    institutionId: institutionId,
    onboardingData: {
      ...existingOnboardingData,
      onboardingComplete: true,
      completedAt: new Date().toISOString(),
    },
    updatedAt: serverTimestamp()
  });
  console.log(`✅ Onboarding complete: userType=${userType}, status=active, onboardingComplete=true`);

  // Notify all admins in the institution
  if (institutionId) {
    try {
      const usersRef = collection(db, 'users');
      const adminsQuery = query(
        usersRef,
        where('institutionId', '==', institutionId),
        where('userType', '==', 'admin')
      );
      const adminsSnap = await getDocs(adminsQuery);

      console.log(`📧 Notifying ${adminsSnap.size} admin(s) about new caregiver onboarding`);

      const userTypeLabel = isPharmacist ? 'Pharmacist' : 'Caregiver';
      const notificationPromises = adminsSnap.docs.map(adminDoc => {
        return createNotification({
          userId: adminDoc.id,
          type: NOTIFICATION_TYPES.CAREGIVER_ONBOARDING,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          title: `New ${userTypeLabel} Onboarded`,
          message: `${caregiverName} (${caregiverEmail}) has completed onboarding and is now active.`,
          data: {
            caregiverId: uid,
            caregiverName: caregiverName,
            caregiverEmail: caregiverEmail,
            institutionId: institutionId,
            action: 'view_caregiver'
          }
        });
      });

      await Promise.all(notificationPromises);
      console.log('✅ Admin notifications sent successfully');
    } catch (notifyError) {
      console.error('❌ Failed to send admin notifications:', notifyError);
    }
  }

  return true;
};

export default {
  saveCaregiverProfile,
  saveOnboardingDraft,
  loadOnboardingDraft,
  uploadCaregiverDocument,
  completeOnboarding,
};
