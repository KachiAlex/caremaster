// Script to reset onboarding status for all existing caregivers
// This forces them to go through the new robust onboarding flow

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

// Firebase config (same as in your app)
const firebaseConfig = {
  apiKey: "AIzaSyA1V8W8Q9X2Y3Z4A5B6C7D8E9F0G1H2I3J4K",
  authDomain: "elderx-f5c2b.firebaseapp.com",
  projectId: "elderx-f5c2b",
  storageBucket: "elderx-f5c2b.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function resetCaregiverOnboarding() {
  try {
    console.log('🔄 Starting caregiver onboarding reset...');
    
    // Get all users with userType = 'caregiver'
    const usersRef = collection(db, 'users');
    const caregiversQuery = query(usersRef, where('userType', '==', 'caregiver'));
    const usersSnapshot = await getDocs(caregiversQuery);
    
    console.log(`📊 Found ${usersSnapshot.size} caregiver users`);
    
    const updatePromises = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      console.log(`👤 Resetting onboarding for: ${userData.email || userData.name || userDoc.id}`);
      
      // Reset onboarding status in users collection
      const userRef = doc(db, 'users', userDoc.id);
      updatePromises.push(
        updateDoc(userRef, {
          onboardingComplete: false,
          updatedAt: new Date()
        })
      );
      
      // Also reset in caregivers collection if it exists
      const caregiverRef = doc(db, 'caregivers', userDoc.id);
      updatePromises.push(
        updateDoc(caregiverRef, {
          onboardingComplete: false,
          updatedAt: new Date()
        }).catch(() => {
          // If caregivers document doesn't exist, that's fine
          console.log(`⚠️  Caregivers document doesn't exist for ${userDoc.id}`);
        })
      );
    });
    
    // Execute all updates
    await Promise.all(updatePromises);
    
    console.log('✅ Successfully reset onboarding status for all caregivers');
    console.log('🔄 All caregivers will now be forced through the new onboarding flow');
    
  } catch (error) {
    console.error('❌ Error resetting caregiver onboarding:', error);
  }
}

// Run the reset
resetCaregiverOnboarding();
