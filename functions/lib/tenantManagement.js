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
exports.setCurrentTenant = exports.createTenantWithAdmin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
/**
 * Helper: assert caller is a super admin.
 * Super admin is a platform-level role, not per-tenant.
 */
const assertSuperAdmin = (context) => {
    if (!context.auth || context.auth.token.superAdmin !== true) {
        throw new functions.https.HttpsError('permission-denied', 'Only super admins can perform this action.');
    }
};
/**
 * Callable: createTenantWithAdmin
 *
 * Creates a new institution (tenant) and an initial tenant admin membership
 * for an existing user. This keeps billing low by:
 * - Using a single write for the institution.
 * - A single write for the membership.
 * - No additional lookups besides basic validation.
 */
exports.createTenantWithAdmin = functions.https.onCall(async (data, context) => {
    assertSuperAdmin(context);
    const { institution, adminUserId } = data || {};
    if (!(institution === null || institution === void 0 ? void 0 : institution.name) || !adminUserId) {
        throw new functions.https.HttpsError('invalid-argument', 'institution.name and adminUserId are required.');
    }
    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();
    // Create institution doc
    const institutionRef = db.collection('institutions').doc();
    const institutionData = {
        name: institution.name,
        type: institution.type || 'hospital',
        active: true,
        timeZone: institution.timeZone || 'UTC',
        branding: institution.branding || {},
        settings: institution.settings || {},
        contactInfo: institution.contactInfo || {},
        createdAt: now,
        updatedAt: now,
    };
    // Create membership doc (userTenants)
    const membershipRef = db.collection('userTenants').doc(`${institutionRef.id}_${adminUserId}`);
    const membershipData = {
        userId: adminUserId,
        institutionId: institutionRef.id,
        roles: ['admin', 'tenant-admin'],
        primary: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
    };
    await db.runTransaction(async (tx) => {
        tx.set(institutionRef, institutionData);
        tx.set(membershipRef, membershipData);
        // Optional: denormalize primaryInstitutionId on user doc for faster reads
        const userRef = db.collection('users').doc(adminUserId);
        tx.set(userRef, {
            primaryInstitutionId: institutionRef.id,
            institutionId: institutionRef.id,
            institutionMemberships: admin.firestore.FieldValue.arrayUnion({
                institutionId: institutionRef.id,
                roles: membershipData.roles,
                primary: true,
            }),
            updatedAt: now,
        }, { merge: true });
    });
    return {
        success: true,
        institutionId: institutionRef.id,
    };
});
/**
 * Callable: setCurrentTenant
 *
 * Sets the caller's current tenant (institution) in custom claims
 * and updates per-tenant role flags for Firestore rules.
 *
 * Cost control:
 * - Reads exactly one membership document.
 * - Writes custom claims only when switching tenant.
 */
exports.setCurrentTenant = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { institutionId } = data || {};
    const userId = context.auth.uid;
    if (!institutionId) {
        throw new functions.https.HttpsError('invalid-argument', 'institutionId is required.');
    }
    const db = getDb();
    // Load membership for this user and institution
    const membershipSnap = await db
        .collection('userTenants')
        .doc(`${institutionId}_${userId}`)
        .get();
    if (!membershipSnap.exists) {
        throw new functions.https.HttpsError('permission-denied', 'User does not have access to this institution.');
    }
    const membership = membershipSnap.data();
    if (membership.status !== 'active') {
        throw new functions.https.HttpsError('permission-denied', 'Membership is not active for this institution.');
    }
    // Build role flags for custom claims based on this membership
    const roleFlags = {};
    membership.roles.forEach((role) => {
        if (role === 'tenant-admin' || role === 'admin') {
            roleFlags.admin = true;
        }
        if (role === 'doctor') {
            roleFlags.doctor = true;
        }
        if (role === 'nurse') {
            roleFlags.nurse = true;
        }
        if (role === 'pharmacist') {
            roleFlags.pharmacist = true;
        }
        if (role === 'caregiver') {
            roleFlags.caregiver = true;
        }
        if (role === 'patient') {
            // No special flag needed; patients are default users
        }
    });
    // Merge with existing claims to avoid overwriting platform-level flags
    const auth = admin.auth();
    const userRecord = await auth.getUser(userId);
    const existingClaims = (userRecord.customClaims || {});
    const updatedClaims = Object.assign(Object.assign({}, existingClaims), { institutionId, currentTenantId: institutionId, admin: Boolean(roleFlags.admin), doctor: Boolean(roleFlags.doctor), nurse: Boolean(roleFlags.nurse), pharmacist: Boolean(roleFlags.pharmacist), caregiver: Boolean(roleFlags.caregiver) });
    await auth.setCustomUserClaims(userId, updatedClaims);
    return {
        success: true,
        institutionId,
        roles: membership.roles,
    };
});
//# sourceMappingURL=tenantManagement.js.map