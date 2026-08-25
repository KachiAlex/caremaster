import { getDoc, updateDoc, doc } from 'backend/database';
import { db } from '../backend/config';
/**
 * Client-side utility to fix caregiver profile with missing institutionId and status
 */


export const fixCaregiverProfile = async (userId, institutionId) => {
  try {
    console.log(`🔧 Fixing caregiver profile for: ${userId}`);
    
    // Get current user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found');
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    console.log('Current user data:', {
      userId,
      userType: userData.userType,
      institutionId: userData.institutionId,
      status: userData.status,
      onboardingComplete: userData.onboardingComplete
    });
    
    // Get caregiver document to get the correct data
    const caregiverRef = doc(db, 'caregivers', userId);
    const caregiverDoc = await getDoc(caregiverRef);
    const caregiverData = caregiverDoc.exists() ? caregiverDoc.data() : {};
    
    // Prepare update
    const updates = {};
    
    if (!userData.institutionId && (institutionId || caregiverData.institutionId)) {
      updates.institutionId = institutionId || caregiverData.institutionId;
      console.log('  ➕ Adding institutionId:', updates.institutionId);
    }
    
    if (!userData.status) {
      updates.status = caregiverData.status || 'active';
      console.log('  ➕ Adding status:', updates.status);
    }
    
    if (!userData.userType || userData.userType !== 'caregiver') {
      updates.userType = 'caregiver';
      updates.type = 'caregiver';
      console.log('  ➕ Setting userType to caregiver');
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
      console.log('✅ Profile updated successfully');
      console.log('Updated fields:', updates);
      return { 
        success: true, 
        message: 'Profile fixed! Please refresh the page.',
        updates
      };
    } else {
      console.log('ℹ️ Profile already correct - no updates needed');
      return {
        success: true,
        message: 'Profile already correct'
      };
    }
    
  } catch (error) {
    console.error('Error fixing profile:', error);
    return { success: false, error: error.message };
  }
};

// Auto-fix on component mount if needed
export const autoFixCurrentUser = async (user, userProfile, institutionId) => {
  if (!user || !userProfile) return;
  
  const needsFix = !userProfile.institutionId || !userProfile.status;
  
  if (needsFix && institutionId) {
    console.log('🔄 Auto-fixing caregiver profile...');
    const result = await fixCaregiverProfile(user.uid, institutionId);
    if (result.success) {
      console.log('✅ Auto-fix complete:', result.message);
      return true;
    }
  }
  
  return false;
};

// Make available in window for console access
if (typeof window !== 'undefined') {
  window.fixCaregiverProfile = fixCaregiverProfile;
}

export default {
  fixCaregiverProfile,
  autoFixCurrentUser
};

