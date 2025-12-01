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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetCaregiverPassword = exports.createCaregiverWithAuth = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();
/**
 * Create a caregiver with Firebase Auth account and user/caregiver documents
 * Callable by institution admins only
 */
exports.createCaregiverWithAuth = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verify the caller is an admin
        const callerDoc = await getDb().collection('users').doc(context.auth.uid).get();
        const callerData = callerDoc.data();
        if (!callerData || (callerData.userType !== 'admin' && callerData.userType !== 'institutionAdmin')) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can create caregivers');
        }
        // Validate required fields
        if (!data.email || !data.password || !data.name || !data.institutionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Email, password, name, and institutionId are required');
        }
        // Validate password length
        if (data.password.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
        }
        // Create Firebase Auth user
        let authUser;
        try {
            authUser = await getAuth().createUser({
                email: data.email,
                password: data.password,
                displayName: data.name,
                emailVerified: false
            });
        }
        catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
            }
            throw authError;
        }
        // Determine role fields based on userType
        const userType = data.userType || 'caregiver';
        let roles = [];
        switch (userType) {
            case 'doctor':
                roles = ['doctor', 'caregiver'];
                break;
            case 'nurse':
                roles = ['nurse', 'caregiver'];
                break;
            case 'pharmacist':
                roles = ['pharmacist'];
                break;
            case 'caregiver':
            default:
                roles = ['caregiver'];
                break;
        }
        // Create user document in Firestore with all required fields
        await getDb().collection('users').doc(authUser.uid).set({
            // Identity fields
            id: authUser.uid,
            uid: authUser.uid,
            email: data.email,
            name: data.name,
            displayName: data.name,
            phone: data.phone || '',
            // REQUIRED: Role fields (all formats for compatibility)
            userType: userType,
            type: userType,
            role: userType,
            roles: roles, // Array format required for filtering
            // REQUIRED: Active status fields
            status: 'pending', // Can be 'pending', 'active', but NOT 'deleted'
            isActive: true, // Must not be false
            active: true, // Must not be false
            // REQUIRED: Institution field
            institutionId: data.institutionId,
            // Medical fields
            medicalQualification: data.specialization || '',
            // Account settings
            onboardingComplete: false,
            accountType: 'institution_created',
            // Timestamps
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        });
        // Create caregiver document in caregivers collection
        await getDb().collection('caregivers').doc(authUser.uid).set({
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            userType: data.userType || 'caregiver',
            specialization: data.specialization || '',
            qualifications: data.qualifications || '',
            experience: data.experience || '',
            availableDays: data.availableDays || [],
            workingHours: data.workingHours || '',
            hourlyRate: data.hourlyRate || '',
            address: data.address || '',
            emergencyContact: data.emergencyContact || '',
            notes: data.notes || '',
            institutionId: data.institutionId,
            status: 'pending',
            rating: 0,
            totalPatients: 0,
            currentPatients: 0,
            performance: {
                punctuality: 0,
                patientSatisfaction: 0,
                taskCompletion: 0,
                communication: 0,
                safety: 0
            },
            earnings: {
                thisMonth: 0,
                lastMonth: 0,
                total: 0
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Log the creation
        await getDb().collection('auditLogs').add({
            action: 'CAREGIVER_CREATED',
            performedBy: context.auth.uid,
            targetUserId: authUser.uid,
            institutionId: data.institutionId,
            details: {
                caregiverName: data.name,
                caregiverEmail: data.email,
                userType: data.userType
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Caregiver created successfully: ${authUser.uid}`);
        return {
            success: true,
            caregiverId: authUser.uid,
            message: 'Caregiver account created successfully'
        };
    }
    catch (error) {
        console.error('Error creating caregiver:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to create caregiver: ${error.message}`);
    }
});
exports.resetCaregiverPassword = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const callerDoc = await getDb().collection('users').doc(context.auth.uid).get();
        const callerData = callerDoc.data();
        if (!callerData || (callerData.userType !== 'admin' && callerData.userType !== 'institutionAdmin' && callerData.role !== 'admin')) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can reset caregiver passwords');
        }
        const { caregiverId, newPassword } = data || {};
        if (!caregiverId || !newPassword) {
            throw new functions.https.HttpsError('invalid-argument', 'Caregiver ID and new password are required');
        }
        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters long');
        }
        await admin.auth().updateUser(caregiverId, { password: newPassword });
        try {
            await getDb().collection('users').doc(caregiverId).set({
                passwordLastResetAt: admin.firestore.FieldValue.serverTimestamp(),
                passwordResetBy: context.auth.uid,
                tempPasswordIssued: false,
                mustChangePassword: false
            }, { merge: true });
        }
        catch (firestoreError) {
            console.warn('Failed to update caregiver password metadata', firestoreError);
        }
        return {
            success: true,
            caregiverId
        };
    }
    catch (error) {
        console.error('Error resetting caregiver password:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to reset caregiver password: ${error.message}`);
    }
});
//# sourceMappingURL=caregiverManagement.js.map