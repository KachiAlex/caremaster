import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();

interface UserProfileData {
  displayName: string;
  email: string;
  userType: 'elderly' | 'caregiver' | 'doctor' | 'admin';
  dateOfBirth?: string;
  phoneNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
}

// Create user profile when user signs up
export const createUserProfile = async (user: admin.auth.UserRecord) => {
  try {
    // CRITICAL: Check if user profile already exists (created by institution flow)
    // This prevents overwriting pharmacist/caregiver/doctor/nurse roles with 'elderly'
    const existingProfile = await getDb().collection('users').doc(user.uid).get();
    
    if (existingProfile.exists) {
      const existingData = existingProfile.data();
      
      // NEVER overwrite non-elderly roles - these are institution staff
      const staffRoles = ['pharmacist', 'caregiver', 'doctor', 'nurse', 'admin'];
      if (existingData?.userType && staffRoles.includes(existingData.userType)) {
        console.log(`User profile already exists with staff role: ${existingData.userType}, skipping default profile creation`);
        return;
      }
      
      // Check roles array for staff roles
      if (Array.isArray(existingData?.roles)) {
        const hasStaffRole = existingData.roles.some((role: string) => staffRoles.includes(role));
        if (hasStaffRole) {
          console.log(`User profile has staff role in roles array: ${existingData.roles}, skipping default profile creation`);
          return;
        }
      }
      
      // If user has institutionId, they're institution staff - don't default to elderly
      if (existingData?.institutionId) {
        console.log(`User has institutionId, skipping elderly profile creation - institution flow will handle it`);
        return;
      }
      
      // If it exists but is elderly and has no institutionId, it's a real client - proceed
    }

    const userProfileData: UserProfileData = {
      displayName: user.displayName || 'User',
      email: user.email || '',
      userType: 'elderly', // Default type ONLY for standalone client signups
      dateOfBirth: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      medicalConditions: [],
      allergies: [],
      medications: []
    };

    // Create user profile in Firestore (only if it doesn't exist or is truly a new client)
    await getDb().collection('users').doc(user.uid).set({
      ...userProfileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    }, { merge: true }); // Use merge to not overwrite existing fields

    // Create elderly profile if user is elderly
    if (userProfileData.userType === 'elderly') {
      await getDb().collection('elderlyProfiles').doc(user.uid).set({
        userId: user.uid,
        emergencyContactName: userProfileData.emergencyContactName || '',
        emergencyContactPhone: userProfileData.emergencyContactPhone || '',
        primaryCareDoctor: '',
        allergies: userProfileData.allergies || [],
        medicalConditions: userProfileData.medicalConditions || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Log the event
    await getDb().collection('auditLogs').add({
      userId: user.uid,
      action: 'USER_PROFILE_CREATED',
      details: {
        email: user.email,
        userType: userProfileData.userType
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'system'
    });

    console.log(`User profile created for ${user.uid}`);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user profile');
  }
};

// Update user profile
export const updateUserProfile = async (data: { userId: string; profileData: Partial<UserProfileData> }, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, profileData } = data;

    // Check if user can update this profile
    if (context.auth.uid !== userId && context.auth.token.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }

    // Update user profile
    await getDb().collection('users').doc(userId).update({
      ...profileData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update elderly profile if applicable
    if (profileData.userType === 'elderly' || profileData.emergencyContactName || profileData.emergencyContactPhone) {
      const elderlyProfileData: any = {};
      
      if (profileData.emergencyContactName) elderlyProfileData.emergencyContactName = profileData.emergencyContactName;
      if (profileData.emergencyContactPhone) elderlyProfileData.emergencyContactPhone = profileData.emergencyContactPhone;
      if (profileData.medicalConditions) elderlyProfileData.medicalConditions = profileData.medicalConditions;
      if (profileData.allergies) elderlyProfileData.allergies = profileData.allergies;

      if (Object.keys(elderlyProfileData).length > 0) {
        elderlyProfileData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await getDb().collection('elderlyProfiles').doc(userId).update(elderlyProfileData);
      }
    }

    // Log the event
    await getDb().collection('auditLogs').add({
      userId: context.auth.uid,
      action: 'USER_PROFILE_UPDATED',
      details: {
        targetUserId: userId,
        updatedFields: Object.keys(profileData)
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip
    });

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to update user profile');
  }
};

// Delete user profile
export const deleteUserProfile = async (user: admin.auth.UserRecord) => {
  try {
    // Soft delete - mark as inactive instead of hard delete
    await getDb().collection('users').doc(user.uid).update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the event
    await getDb().collection('auditLogs').add({
      userId: user.uid,
      action: 'USER_PROFILE_DELETED',
      details: {
        email: user.email
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: 'system'
    });

    console.log(`User profile deleted for ${user.uid}`);
  } catch (error) {
    console.error('Error deleting user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user profile');
  }
};

// Delete user (Auth + Firestore) - Callable function
export const deleteUser = functions.https.onCall(async (data: { userId: string }, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user is admin
  const callerToken = context.auth.token;
  if (!callerToken.admin && !callerToken.institutionId) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    // Delete from Firestore
    await getDb().collection('users').doc(userId).delete();
    
    // Delete from Auth
    await admin.auth().deleteUser(userId);
    
    console.log(`User ${userId} deleted from both Auth and Firestore`);
    
    return { success: true, message: 'User deleted successfully' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    // If Auth user doesn't exist, that's okay - just delete from Firestore
    if (error.code === 'auth/user-not-found') {
      console.log(`Auth user ${userId} not found, but Firestore document was deleted`);
      return { success: true, message: 'User document deleted (Auth user not found)' };
    }
    
    throw new functions.https.HttpsError('internal', `Failed to delete user: ${error.message}`);
  }
});