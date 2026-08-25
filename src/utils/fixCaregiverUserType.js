import { getDoc, updateDoc, doc } from 'backend/database';
import { db } from '../backend/config';
/**
 * Client-side utility to fix caregiver userType issues
 * Can be called directly from the browser console or a component
 */


export const fixCaregiverUserType = async (userId) => {
  try {
    console.log(`🔧 Fixing user: ${userId}`);
    
    // Get current user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ User document not found');
      return { success: false, error: 'User not found' };
    }
    
    const userData = userDoc.data();
    console.log('Current user data:', {
      userType: userData.userType,
      type: userData.type,
      role: userData.role,
      email: userData.email
    });
    
    // Check if this is a caregiver ID
    if (userId.startsWith('caregiver_')) {
      // Update userType to caregiver
      await updateDoc(userRef, {
        userType: 'caregiver',
        type: 'caregiver'
      });
      
      console.log('✅ Updated users collection with userType: caregiver');
      
      // Also check caregivers collection
      const caregiverRef = doc(db, 'caregivers', userId);
      const caregiverDoc = await getDoc(caregiverRef);
      
      if (caregiverDoc.exists()) {
        console.log('✅ Caregiver document exists');
      } else {
        console.log('⚠️ Caregiver document not found');
      }
      
      return { 
        success: true, 
        message: 'UserType fixed successfully. Please refresh the page.' 
      };
    } else {
      console.log('ℹ️ User ID does not start with "caregiver_" - no action needed');
      return { 
        success: false, 
        error: 'Not a caregiver user ID' 
      };
    }
    
  } catch (error) {
    console.error('Error fixing user:', error);
    return { success: false, error: error.message };
  }
};

export const fixAllInstitutionCaregivers = async (institutionId) => {
  console.log('🔍 This function requires server-side access.');
  console.log('Please log out and log back in - the system will auto-fix your profile.');
  return { 
    success: false, 
    error: 'Please log out and log back in for auto-fix' 
  };
};

// Make available in window for console access
if (typeof window !== 'undefined') {
  window.fixCaregiverUserType = fixCaregiverUserType;
}

export default {
  fixCaregiverUserType,
  fixAllInstitutionCaregivers
};

