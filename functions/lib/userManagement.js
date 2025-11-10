"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.deleteUserProfile = exports.updateUserProfile = exports.createUserProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Create user profile when user signs up
const createUserProfile = async (user) => {
    try {
        const userProfileData = {
            displayName: user.displayName || 'User',
            email: user.email || '',
            userType: 'elderly',
            dateOfBirth: '',
            phoneNumber: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            medicalConditions: [],
            allergies: [],
            medications: []
        };
        // Create user profile in Firestore
        await getDb().collection('users').doc(user.uid).set(Object.assign(Object.assign({}, userProfileData), { createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), isActive: true }));
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
    }
    catch (error) {
        console.error('Error creating user profile:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create user profile');
    }
};
exports.createUserProfile = createUserProfile;
// Update user profile
const updateUserProfile = async (data, context) => {
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
        await getDb().collection('users').doc(userId).update(Object.assign(Object.assign({}, profileData), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        // Update elderly profile if applicable
        if (profileData.userType === 'elderly' || profileData.emergencyContactName || profileData.emergencyContactPhone) {
            const elderlyProfileData = {};
            if (profileData.emergencyContactName)
                elderlyProfileData.emergencyContactName = profileData.emergencyContactName;
            if (profileData.emergencyContactPhone)
                elderlyProfileData.emergencyContactPhone = profileData.emergencyContactPhone;
            if (profileData.medicalConditions)
                elderlyProfileData.medicalConditions = profileData.medicalConditions;
            if (profileData.allergies)
                elderlyProfileData.allergies = profileData.allergies;
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
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to update user profile');
    }
};
exports.updateUserProfile = updateUserProfile;
// Delete user profile
const deleteUserProfile = async (user) => {
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
    }
    catch (error) {
        console.error('Error deleting user profile:', error);
        throw new functions.https.HttpsError('internal', 'Failed to delete user profile');
    }
};
exports.deleteUserProfile = deleteUserProfile;
// Delete user (Auth + Firestore) - Callable function
exports.deleteUser = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Error deleting user:', error);
        // If Auth user doesn't exist, that's okay - just delete from Firestore
        if (error.code === 'auth/user-not-found') {
            console.log(`Auth user ${userId} not found, but Firestore document was deleted`);
            return { success: true, message: 'User document deleted (Auth user not found)' };
        }
        throw new functions.https.HttpsError('internal', `Failed to delete user: ${error.message}`);
    }
});
//# sourceMappingURL=userManagement.js.map