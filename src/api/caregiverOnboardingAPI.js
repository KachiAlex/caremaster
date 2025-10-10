import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from './notificationsAPI';

export const saveCaregiverProfile = async (uid, profile) => {
  const caregiverRef = doc(db, 'caregivers', uid);
  const current = await getDoc(caregiverRef);
  const payload = {
    id: uid,
    userId: uid,
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    specializations: profile.specializations || [],
    medicalQualification: profile.medicalQualification || '',
    yearsOfExperience: profile.yearsOfExperience || '',
    verificationStatus: profile.verificationStatus || 'pending',
    onboardingComplete: !!profile.onboardingComplete,
    createdAt: current.exists() ? current.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: profile.status || 'active'
  };
  if (current.exists()) {
    await updateDoc(caregiverRef, payload);
  } else {
    await setDoc(caregiverRef, payload);
  }
  return payload;
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
  
  // Update caregivers collection - set status to 'pending' awaiting admin approval
  await updateDoc(caregiverRef, { 
    onboardingComplete: true,
    status: 'pending', // Set status to pending for admin approval
    updatedAt: serverTimestamp() 
  });
  console.log('✅ Updated caregivers collection with status: pending');
  
  // Update users collection with proper error handling
  try {
    await updateDoc(userRef, { 
      onboardingComplete: true, 
      userType: 'caregiver',
      type: 'caregiver', // Also set type field for consistency
      status: 'pending', // Set status to pending for admin approval
      institutionId: institutionId, // Preserve institutionId
      updatedAt: serverTimestamp() 
    });
    console.log('✅ Updated users collection with userType: caregiver, status: pending');
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
      
      // Create notifications for each admin
      const notificationPromises = adminsSnap.docs.map(adminDoc => {
        return createNotification({
          userId: adminDoc.id,
          type: NOTIFICATION_TYPES.CAREGIVER_ONBOARDING,
          priority: NOTIFICATION_PRIORITIES.HIGH,
          title: 'New Caregiver Awaiting Approval',
          message: `${caregiverName} (${caregiverEmail}) has completed onboarding and is awaiting your approval.`,
          data: {
            caregiverId: uid,
            caregiverName: caregiverName,
            caregiverEmail: caregiverEmail,
            institutionId: institutionId,
            action: 'review_caregiver'
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
  uploadCaregiverDocument,
  completeOnboarding,
};


