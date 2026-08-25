import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'backend/database';
import { ref, uploadBytes, getDownloadURL } from 'backend/storage';
import { db, storage } from '../backend/config';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from './notificationsAPI';

export const saveCaregiverProfile = async (uid, profile, isDraft = false) => {
  const caregiverRef = doc(db, 'caregivers', uid);
  const current = await getDoc(caregiverRef);
  
  // Get existing draft data if it exists
  const existingData = current.exists() ? current.data() : {};
  
  // Merge profile data, preserving existing fields if not provided
  const payload = {
    id: uid,
    userId: uid,
    ...existingData, // Preserve existing data
    ...profile, // Override with new data
    name: profile.name || existingData.name || '',
    email: profile.email || existingData.email || '',
    phone: profile.phone || existingData.phone || '',
    address: profile.address || existingData.address || '',
    specializations: profile.specializations || existingData.specializations || [],
    medicalQualification: profile.medicalQualification || existingData.medicalQualification || '',
    yearsOfExperience: profile.yearsOfExperience || existingData.yearsOfExperience || '',
    verificationStatus: profile.verificationStatus || existingData.verificationStatus || 'pending',
    onboardingComplete: isDraft ? false : (!!profile.onboardingComplete),
    onboardingDraft: isDraft ? true : (existingData.onboardingDraft || false),
    onboardingStep: profile.onboardingStep || existingData.onboardingStep || 1,
    createdAt: current.exists() ? existingData.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: profile.status || existingData.status || 'active'
  };
  
  if (current.exists()) {
    await updateDoc(caregiverRef, payload);
  } else {
    await setDoc(caregiverRef, payload);
  }
  
  // Also save draft to users collection for easy access
  const userRef = doc(db, 'users', uid);
  const userCurrent = await getDoc(userRef);
  if (userCurrent.exists()) {
    await updateDoc(userRef, {
      onboardingDraft: isDraft,
      onboardingStep: profile.onboardingStep || existingData.onboardingStep || 1,
      updatedAt: serverTimestamp()
    });
  }
  
  return payload;
};

// Save draft data
export const saveOnboardingDraft = async (uid, draftData) => {
  return saveCaregiverProfile(uid, draftData, true);
};

// Load draft data
export const loadOnboardingDraft = async (uid) => {
  const caregiverRef = doc(db, 'caregivers', uid);
  const caregiverSnap = await getDoc(caregiverRef);
  
  if (caregiverSnap.exists()) {
    return caregiverSnap.data();
  }
  
  // Also check users collection
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  
  return null;
};

export const uploadCaregiverDocument = async (uid, file, folder = 'documents') => {
  const path = `users/${uid}/${folder}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  const url = await getDownloadURL(fileRef);
  return { path, url };
};

export const completeOnboarding = async (uid) => {
  console.log('🎯 Completing onboarding for user:', uid);
  
  // Get current caregiver data to preserve institutionId
  const caregiverRef = doc(db, 'caregivers', uid);
  const caregiverSnap = await getDoc(caregiverRef);
  const caregiverData = caregiverSnap.exists() ? caregiverSnap.data() : {};
  
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};
  
  const institutionId = userData.institutionId || caregiverData.institutionId;
  const caregiverName = userData.name || caregiverData.name || 'A caregiver';
  const caregiverEmail = userData.email || caregiverData.email || '';
  
  // Determine user type (caregiver, doctor, nurse, or pharmacist)
  const userType = userData.userType || userData.type || caregiverData.userType || caregiverData.type || 'caregiver';
  const isPharmacist = userType === 'pharmacist';
  
  // Update caregivers collection - set status to 'active' automatically after onboarding
  // Note: Pharmacists also use the caregivers collection for onboarding data
  await updateDoc(caregiverRef, { 
    onboardingComplete: true,
    status: 'active', // Automatically set to active - no admin approval required
    active: true,
    updatedAt: serverTimestamp() 
  });
  console.log('✅ Updated caregivers collection with status: active');
  
  // Update users collection with proper error handling
  try {
    await updateDoc(userRef, { 
      onboardingComplete: true, 
      userType: userType, // Preserve user type (caregiver, doctor, nurse, or pharmacist)
      type: userType, // Also set type field for consistency
      status: 'active', // Automatically set to active - no admin approval required
      active: true,
      institutionId: institutionId, // Preserve institutionId
      updatedAt: serverTimestamp() 
    });
    console.log(`✅ Updated users collection with userType: ${userType}, status: active`);
  } catch (error) {
    console.error('❌ Failed to update users collection:', error);
    throw error; // Re-throw to catch in UI
  }
  
  // Notify all admins in the institution
  if (institutionId) {
    try {
      // Get all admin users for this institution
      const usersRef = collection(db, 'users');
      const adminsQuery = query(
        usersRef,
        where('institutionId', '==', institutionId),
        where('userType', '==', 'admin')
      );
      const adminsSnap = await getDocs(adminsQuery);
      
      console.log(`📧 Notifying ${adminsSnap.size} admin(s) about new caregiver onboarding`);
      
      // Create notifications for each admin (informational - no action required)
      const userTypeLabel = isPharmacist ? 'Pharmacist' : 'Caregiver';
      const notificationPromises = adminsSnap.docs.map(adminDoc => {
        return createNotification({
          userId: adminDoc.id,
          type: NOTIFICATION_TYPES.CAREGIVER_ONBOARDING,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          title: `New ${userTypeLabel} Onboarded`,
          message: `${caregiverName} (${caregiverEmail}) has completed onboarding and is now active. No approval needed.`,
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
      
      // TODO: Send email notifications to admins
      // This would require a backend function to send emails
      
    } catch (notifyError) {
      console.error('❌ Failed to send admin notifications:', notifyError);
      // Don't throw - notifications are not critical for onboarding completion
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


