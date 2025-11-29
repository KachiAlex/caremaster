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
exports.createInstitutionUser = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
const getAuth = () => admin.auth();
/**
 * Create an institution user with Firebase Auth account using Admin SDK
 * This preserves the current admin session (doesn't log them out)
 * Callable by institution admins only
 */
exports.createInstitutionUser = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        // Verify the caller is an admin or institution admin
        const callerDoc = await getDb().collection('users').doc(context.auth.uid).get();
        const callerData = callerDoc.data();
        if (!callerData || (callerData.userType !== 'admin' && !callerData.institutionId)) {
            throw new functions.https.HttpsError('permission-denied', 'Only admins can create institution users');
        }
        // Validate required fields
        const { email, firstName, lastName, userType, institutionId, password, phone, medicalQualification, specialization, licenseNumber } = data;
        if (!email || !firstName || !lastName || !userType || !institutionId) {
            throw new functions.https.HttpsError('invalid-argument', 'Email, firstName, lastName, userType, and institutionId are required');
        }
        // For pharmacists, password is required
        if (userType === 'pharmacist' && !password) {
            throw new functions.https.HttpsError('invalid-argument', 'Password is required for pharmacists');
        }
        // Validate password if provided
        if (password && password.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
        }
        // Generate password if not provided (for non-pharmacists)
        const finalPassword = password || generateTemporaryPassword();
        // Create Firebase Auth user using Admin SDK (doesn't affect current session)
        let authUser;
        try {
            authUser = await getAuth().createUser({
                email,
                password: finalPassword,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false
            });
        }
        catch (authError) {
            if (authError.code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError('already-exists', 'A user with this email already exists');
            }
            throw authError;
        }
        // Determine standardized user data
        const displayName = `${firstName} ${lastName}`;
        let effectiveUserType = userType;
        // Determine roles based on user type
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
        // Create standardized user document in Firestore
        const userData = {
            id: authUser.uid,
            uid: authUser.uid,
            firstName,
            lastName,
            name: displayName,
            displayName,
            email,
            phone: phone || '',
            userType: effectiveUserType,
            type: effectiveUserType,
            role: effectiveUserType,
            roles,
            status: 'active',
            isActive: true,
            institutionId,
            accountType: 'institution_created',
            onboardingComplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            joinDate: admin.firestore.FieldValue.serverTimestamp(),
            lastActive: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        // Add medical fields if applicable
        if (medicalQualification) {
            userData.medicalQualification = medicalQualification;
        }
        if (specialization) {
            userData.specialization = specialization;
        }
        if (licenseNumber) {
            userData.licenseNumber = licenseNumber;
        }
        // Add creator tracking
        if (context.auth.uid) {
            userData.createdBy = context.auth.uid;
        }
        // Add password info if temporary (non-pharmacist without password)
        if (!password) {
            userData.temporaryPassword = finalPassword;
            userData.mustChangePassword = true;
        }
        await getDb().collection('users').doc(authUser.uid).set(userData);
        // Log the creation
        await getDb().collection('auditLogs').add({
            action: 'INSTITUTION_USER_CREATED',
            performedBy: context.auth.uid,
            targetUserId: authUser.uid,
            institutionId,
            details: {
                userName: displayName,
                userEmail: email,
                userType: effectiveUserType
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Institution user created successfully: ${authUser.uid}`);
        return {
            success: true,
            uid: authUser.uid,
            email,
            temporaryPassword: !password ? finalPassword : null,
            userData
        };
    }
    catch (error) {
        console.error('Error creating institution user:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', `Failed to create institution user: ${error.message}`);
    }
});
/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const specialChars = '!@#$%&*';
    let password = 'Care Master';
    // Add 6 random characters
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Add one special character
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
    return password;
}
//# sourceMappingURL=institutionUserManagement.js.map