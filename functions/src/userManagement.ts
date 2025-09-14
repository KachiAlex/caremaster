import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

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
    const userProfileData: UserProfileData = {
      displayName: user.displayName || 'User',
      email: user.email || '',
      userType: 'elderly', // Default type
      dateOfBirth: '',
      phoneNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      medicalConditions: [],
      allergies: [],
      medications: []
    };

    // Create user profile in Firestore
    await db.collection('users').doc(user.uid).set({
      ...userProfileData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    });

    // Create elderly profile if user is elderly
    if (userProfileData.userType === 'elderly') {
      await db.collection('elderlyProfiles').doc(user.uid).set({
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
    await db.collection('auditLogs').add({
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
    await db.collection('users').doc(userId).update({
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
        await db.collection('elderlyProfiles').doc(userId).update(elderlyProfileData);
      }
    }

    // Log the event
    await db.collection('auditLogs').add({
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
    await db.collection('users').doc(user.uid).update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the event
    await db.collection('auditLogs').add({
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
