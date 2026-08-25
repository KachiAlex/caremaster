import { collection, updateDoc, doc, serverTimestamp } from 'backend/database';
import { db } from '../backend/config';

// Reset onboarding status for a specific user
export const resetUserOnboarding = async (userId) => {
  try {
    console.log(`🔄 Resetting onboarding for user: ${userId}`);
    
    // Reset in users collection
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      onboardingComplete: false,
      updatedAt: serverTimestamp()
    });
    
    // Reset in caregivers collection (if it exists)
    const caregiverRef = doc(db, 'caregivers', userId);
    try {
      await updateDoc(caregiverRef, {
        onboardingComplete: false,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.log('Caregivers document might not exist, that\'s fine');
    }
    
    console.log(`✅ Successfully reset onboarding for user: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    throw error;
  }
};

// Reset onboarding for all caregivers
export const resetAllCaregiverOnboarding = async () => {
  try {
    console.log('🔄 Resetting onboarding for all caregivers...');
    
    // This would require admin privileges to query all users
    // For now, we'll provide a manual way to reset specific users
    console.log('⚠️  Use resetUserOnboarding() for specific users, or manually reset in Backend Console');
    
    return { success: true, message: 'Manual reset required' };
  } catch (error) {
    console.error('Error resetting all caregiver onboarding:', error);
    throw error;
  }
};
