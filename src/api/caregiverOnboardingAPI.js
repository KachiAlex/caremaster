import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';

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
  
  // Update caregivers collection
  const caregiverRef = doc(db, 'caregivers', uid);
  await updateDoc(caregiverRef, { 
    onboardingComplete: true, 
    updatedAt: serverTimestamp() 
  });
  console.log('✅ Updated caregivers collection');
  
  // Update users collection with proper error handling
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, { 
      onboardingComplete: true, 
      userType: 'caregiver',
      type: 'caregiver', // Also set type field for consistency
      updatedAt: serverTimestamp() 
    });
    console.log('✅ Updated users collection with userType: caregiver');
  } catch (error) {
    console.error('❌ Failed to update users collection:', error);
    throw error; // Re-throw to catch in UI
  }
  
  return true;
};

export default {
  saveCaregiverProfile,
  uploadCaregiverDocument,
  completeOnboarding,
};


