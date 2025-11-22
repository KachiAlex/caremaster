import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Multi-tenant management utilities for UltimateCare.
 *
 * DESIGN GOALS:
 * - Use a simple Firestore schema that mirrors existing "institution" usage.
 * - Minimize reads/writes and Cloud Function invocations to keep billing low.
 * - All tenant-aware data uses institutionId as the tenantId field.
 *
 * COLLECTIONS:
 * - institutions (tenant registry)
 * - userTenants (user ↔ tenant memberships)
 */

type TenantRole =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'caregiver'
  | 'admin'
  | 'tenant-admin';

interface Institution {
  name: string;
  type: 'hospital' | 'clinic' | 'lab' | 'telemed' | 'health-system';
  active: boolean;
  timeZone?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  settings?: Record<string, unknown>;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

interface UserTenantMembership {
  userId: string;
  institutionId: string; // tenantId for this project
  roles: TenantRole[];
  primary: boolean;
  status: 'active' | 'suspended';
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

const getDb = () => admin.firestore();

/**
 * Helper: assert caller is a super admin.
 * Super admin is a platform-level role, not per-tenant.
 */
const assertSuperAdmin = (context: functions.https.CallableContext) => {
  if (!context.auth || context.auth.token.superAdmin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only super admins can perform this action.'
    );
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
export const createTenantWithAdmin = functions.https.onCall(
  async (
    data: {
      institution: {
        name: string;
        type?: Institution['type'];
        timeZone?: string;
        branding?: Institution['branding'];
        settings?: Institution['settings'];
        contactInfo?: Institution['contactInfo'];
      };
      adminUserId: string;
    },
    context
  ) => {
    assertSuperAdmin(context);

    const { institution, adminUserId } = data || {};

    if (!institution?.name || !adminUserId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'institution.name and adminUserId are required.'
      );
    }

    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create institution doc
    const institutionRef = db.collection('institutions').doc();
    const institutionData: Institution = {
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
    const membershipRef = db.collection('userTenants').doc(
      `${institutionRef.id}_${adminUserId}`
    );
    const membershipData: UserTenantMembership = {
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
      tx.set(
        userRef,
        {
          primaryInstitutionId: institutionRef.id,
          institutionId: institutionRef.id,
          institutionMemberships: admin.firestore.FieldValue.arrayUnion({
            institutionId: institutionRef.id,
            roles: membershipData.roles,
            primary: true,
          }),
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return {
      success: true,
      institutionId: institutionRef.id,
    };
  }
);

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
export const setCurrentTenant = functions.https.onCall(
  async (
    data: {
      institutionId: string;
    },
    context
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const { institutionId } = data || {};
    const userId = context.auth.uid;

    if (!institutionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'institutionId is required.'
      );
    }

    const db = getDb();

    // Load membership for this user and institution
    const membershipSnap = await db
      .collection('userTenants')
      .doc(`${institutionId}_${userId}`)
      .get();

    if (!membershipSnap.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User does not have access to this institution.'
      );
    }

    const membership = membershipSnap.data() as UserTenantMembership;
    if (membership.status !== 'active') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Membership is not active for this institution.'
      );
    }

    // Build role flags for custom claims based on this membership
    const roleFlags: Record<string, boolean> = {};
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
    const existingClaims = (userRecord.customClaims || {}) as Record<
      string,
      unknown
    >;

    const updatedClaims = {
      ...existingClaims,
      institutionId, // used by existing firestore.rules helper userInstitution()
      currentTenantId: institutionId,
      admin: Boolean(roleFlags.admin),
      doctor: Boolean(roleFlags.doctor),
      nurse: Boolean(roleFlags.nurse),
      pharmacist: Boolean(roleFlags.pharmacist),
      caregiver: Boolean(roleFlags.caregiver),
    };

    await auth.setCustomUserClaims(userId, updatedClaims);

    return {
      success: true,
      institutionId,
      roles: membership.roles,
    };
  }
);

/**
 * Callable: getTenants
 * 
 * Returns a list of all institutions (tenants) that the caller has access to.
 * For super admins, returns all institutions.
 * For regular users, returns only institutions they're members of.
 */
export const getTenants = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated.'
      );
    }

    const db = getDb();
    const userId = context.auth.uid;
    const isSuperAdmin = context.auth.token.superAdmin === true;

    try {
      if (isSuperAdmin) {
        // Super admins can see all institutions
        const institutionsSnapshot = await db.collection('institutions').get();
        const institutions = institutionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        }));
        return { success: true, tenants: institutions };
      } else {
        // Regular users only see institutions they're members of
        const membershipsSnapshot = await db
          .collection('userTenants')
          .where('userId', '==', userId)
          .where('status', '==', 'active')
          .get();

        if (membershipsSnapshot.empty) {
          return { success: true, tenants: [] };
        }

        const institutionIds = membershipsSnapshot.docs.map(
          doc => doc.data().institutionId
        );

        // Fetch institution details
        const institutions = await Promise.all(
          institutionIds.map(async (institutionId) => {
            const institutionDoc = await db
              .collection('institutions')
              .doc(institutionId)
              .get();
            if (institutionDoc.exists) {
              return {
                id: institutionDoc.id,
                ...institutionDoc.data(),
                createdAt: institutionDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
                updatedAt: institutionDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
              };
            }
            return null;
          })
        );

        return {
          success: true,
          tenants: institutions.filter(Boolean),
        };
      }
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to fetch tenants: ${error.message}`
      );
    }
  }
);

/**
 * HTTP: getTenantsHTTP
 * 
 * REST endpoint for fetching tenants. Used by frontend at /api/tenants
 * This handles the case where frontend calls /api/tenants as a REST endpoint
 */
export const getTenantsHTTP = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = admin.auth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const isSuperAdmin = decodedToken.superAdmin === true;

    const db = getDb();

    if (isSuperAdmin) {
      // Super admins can see all institutions
      const institutionsSnapshot = await db.collection('institutions').get();
      const institutions = institutionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      }));
      res.status(200).json({ success: true, tenants: institutions });
    } else {
      // Regular users only see institutions they're members of
      const membershipsSnapshot = await db
        .collection('userTenants')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      if (membershipsSnapshot.empty) {
        res.status(200).json({ success: true, tenants: [] });
        return;
      }

      const institutionIds = membershipsSnapshot.docs.map(
        doc => doc.data().institutionId
      );

      // Fetch institution details
      const institutions = await Promise.all(
        institutionIds.map(async (institutionId) => {
          const institutionDoc = await db
            .collection('institutions')
            .doc(institutionId)
            .get();
          if (institutionDoc.exists) {
            return {
              id: institutionDoc.id,
              ...institutionDoc.data(),
              createdAt: institutionDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
              updatedAt: institutionDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
            };
          }
          return null;
        })
      );

      res.status(200).json({
        success: true,
        tenants: institutions.filter(Boolean),
      });
    }
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    
    // Provide more specific error messages
    if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-credential') {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token' 
      });
    } else if (error.code === 'permission-denied') {
      res.status(403).json({ 
        error: 'Permission denied',
        message: 'You do not have permission to access tenants' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch tenants',
        message: error.message || 'An unexpected error occurred',
        code: error.code || 'unknown'
      });
    }
  }
});
