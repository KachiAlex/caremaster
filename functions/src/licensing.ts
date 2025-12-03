import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

type CreateInstitutionRequest = {
  name: string;
  domain?: string;
  notes?: string;
};

type CreateLicenseRequest = {
  institutionId: string;
  plan: 'basic' | 'standard' | 'enterprise';
  seats: number;
  startsAt?: string; // ISO date
  endsAt: string; // ISO date
  licenseKey?: string; // License key
  features?: Record<string, boolean>;
};

type AssignAdminRequest = {
  institutionId: string;
  email: string;
  displayName?: string;
  password?: string;
};

const getDb = () => admin.firestore();

// Get base URL - ALWAYS use UltimateCare domain (ignore environment variables)
const getBaseURL = () => {
  // FORCE UltimateCare domain - do not use environment variables
  const baseURL = 'https://ultimatecare-2025.web.app';
  console.log('🔍 getBaseURL - FORCED UltimateCare domain:', baseURL);
  console.log('🔍 getBaseURL - Environment check:', {
    APP_BASE_URL: process.env.APP_BASE_URL,
    REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL,
    using: baseURL
  });
  return baseURL;
};

export const createInstitution = functions.https.onCall(async (data: CreateInstitutionRequest, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can create institutions');
  }

  const { name, domain, notes } = data || {};
  if (!name || typeof name !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'name is required');
  }

  const now = admin.firestore.Timestamp.now();
  const institutionRef = getDb().collection('institutions').doc();
  
  // Generate unique access slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const uniqueSlug = `${slug}-${institutionRef.id.substring(0, 8)}`;
  
  // Generate institution portal URLs - ALWAYS use UltimateCare domain
  const baseURL = getBaseURL();
  const accessLink = `${baseURL}/onboard?institution=${institutionRef.id}`;
  const loginLink = `${baseURL}/institution/login?institution=${institutionRef.id}`;
  
  console.log('🏢 Creating institution with URLs:', {
    institutionId: institutionRef.id,
    baseURL,
    accessLink,
    loginLink
  });
  
  const institution = {
    name,
    domain: domain || null,
    slug: uniqueSlug,
    accessLink,
    loginLink,
    notes: notes || null,
    createdAt: now,
    updatedAt: now,
    active: true
  };
  await institutionRef.set(institution);
  return { id: institutionRef.id, ...institution };
});

export const createLicense = functions.https.onCall(async (data: CreateLicenseRequest, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can create licenses');
  }

  const { institutionId, plan, seats, startsAt, endsAt, licenseKey, features } = data || {};
  if (!institutionId || !plan || !seats || !endsAt) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId, plan, seats, endsAt are required');
  }

  const institutionSnap = await getDb().collection('institutions').doc(institutionId).get();
  if (!institutionSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Institution not found');
  }

  const licenseRef = getDb().collection('licenses').doc();
  const now = admin.firestore.Timestamp.now();
  const license = {
    institutionId,
    plan,
    seats,
    licenseKey: licenseKey || null,
    startsAt: startsAt ? admin.firestore.Timestamp.fromDate(new Date(startsAt)) : now,
    endsAt: admin.firestore.Timestamp.fromDate(new Date(endsAt)),
    features: features || {},
    status: 'active', // active | suspended | expired
    active: true, // Boolean flag for quick checks
    createdAt: now,
    updatedAt: now
  };
  await licenseRef.set(license);
  return { id: licenseRef.id, ...license };
});

export const assignInstitutionAdmin = functions.https.onCall(async (data: AssignAdminRequest, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can assign institution admins');
  }

  const { institutionId, email, displayName, password } = data || {};
  if (!institutionId || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId and email are required');
  }

  if (password && password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  // Create or find auth user
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    // Update password if provided for existing user
    if (password) {
      await admin.auth().updateUser(userRecord.uid, { password });
    }
  } catch (e) {
    // Create new user with password if provided
    const createUserData: any = { 
      email, 
      displayName: displayName || email, 
      emailVerified: true 
    };
    if (password) {
      createUserData.password = password;
    }
    userRecord = await admin.auth().createUser(createUserData);
  }

  // Set custom claims to tie user to institution and admin role
  const currentClaims = (userRecord.customClaims as any) || {};
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    ...currentClaims,
    institutionId,
    institutionAdmin: true,
    admin: true
  });

  // Update or create user document in Firestore
  const userDocRef = getDb().collection('users').doc(userRecord.uid);
  const userDoc = await userDocRef.get();
  
  if (userDoc.exists) {
    // Update existing user
    await userDocRef.update({
      institutionId,
      institutionAdmin: true,
      type: 'admin',
      userType: 'admin',
      updatedAt: admin.firestore.Timestamp.now()
    });
  } else {
    // Create new user document
    await userDocRef.set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: displayName || email,
      institutionId,
      institutionAdmin: true,
      type: 'admin',
      userType: 'admin',
      role: 'admin',
      active: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
  }

  // Create mapping document for institution admins
  const now = admin.firestore.Timestamp.now();
  const ref = getDb().collection('institutionAdmins').doc();
  await ref.set({
    institutionId,
    userId: userRecord.uid,
    email: userRecord.email,
    createdAt: now
  });

  // Ensure a basic user profile exists with institution linkage
  await getDb().collection('users').doc(userRecord.uid).set(
    {
      email: userRecord.email,
      displayName: userRecord.displayName || email,
      type: 'admin',
      institutionId,
      updatedAt: now,
      createdAt: now
    },
    { merge: true }
  );

  return { userId: userRecord.uid, email: userRecord.email, institutionId };
});

export const getLicenseStatus = functions.https.onCall(async (data: { institutionId?: string }, context) => {
  const institutionId = data?.institutionId || context.auth?.token?.institutionId;
  if (!institutionId) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId is required');
  }

  const now = admin.firestore.Timestamp.now();
  
  // Find licenses by institutionId (simplified query to avoid index requirements)
  const snap = await getDb()
    .collection('licenses')
    .where('institutionId', '==', institutionId)
    .get();

  if (snap.empty) {
    return { active: false, reason: 'no_license' };
  }
  
  // Find the most recent license by endsAt date
  let mostRecentLicense: any = null;
  let mostRecentDoc: any = null;
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (!mostRecentLicense || data.endsAt.toMillis() > mostRecentLicense.endsAt.toMillis()) {
      mostRecentLicense = data;
      mostRecentDoc = doc;
    }
  });
  
  if (!mostRecentLicense || !mostRecentDoc) {
    return { active: false, reason: 'no_valid_license' };
  }
  
  // Check if license is active based on multiple conditions
  const isActiveStatus = mostRecentLicense.status === 'active' || mostRecentLicense.active === true;
  const isWithinDateRange = mostRecentLicense.startsAt.toMillis() <= now.toMillis() && mostRecentLicense.endsAt.toMillis() >= now.toMillis();
  const active = isActiveStatus && isWithinDateRange;
  
  return { active, license: { id: mostRecentDoc.id, ...mostRecentLicense } };
});

export const setSuperAdminClaim = functions.https.onCall(async (data: { userId: string }, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Only allow existing super-admins or system admins to grant super-admin privileges
  const isCurrentSuperAdmin = context.auth.token.superAdmin === true;
  const isSystemAdmin = context.auth.token.admin === true;

  if (!isCurrentSuperAdmin && !isSystemAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Insufficient privileges to grant super-admin access');
  }

  const { userId } = data;
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  // Verify the target user exists and is an admin
  const userDoc = await getDb().collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const isAdmin = userData?.type === 'admin' || userData?.userType === 'admin';

  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'User must be an admin to receive super-admin privileges');
  }

  // Set super-admin custom claim
  await admin.auth().setCustomUserClaims(userId, {
    superAdmin: true,
    admin: true
  });

  // Log the action
  await getDb().collection('auditLogs').add({
    userId: context.auth.uid,
    action: 'SUPER_ADMIN_CLAIM_GRANTED',
    details: {
      targetUserId: userId,
      targetUserEmail: userData.email,
      grantedBy: context.auth.uid
    },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ipAddress: context.rawRequest.ip
  });

  return { success: true, message: 'Super-admin privileges granted successfully' };
});

export const getInstitutions = functions.https.onCall(async (data, context) => {
  // LOG IMMEDIATELY to verify function is being called
  console.log('🚀🚀🚀 getInstitutionsFunction CALLED at', new Date().toISOString());
  console.log('🚀 Context auth:', context.auth?.uid);
  console.log('🚀 Context token superAdmin:', context.auth?.token?.superAdmin);
  
  if (!context.auth?.token?.superAdmin) {
    console.error('❌ Permission denied - not super admin');
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can view institutions');
  }

  try {
    console.log('✅ Super admin verified, fetching institutions...');
    const institutionsSnapshot = await getDb().collection('institutions').orderBy('createdAt', 'desc').get();
    console.log(`✅ Found ${institutionsSnapshot.size} institutions in database`);
    
    // HARDCODE the base URL - DO NOT use getBaseURL() or any environment variables
    const baseURL = 'https://ultimatecare-2025.web.app';
    console.log('📋 getInstitutions - HARDCODED baseURL:', baseURL);
    console.log('📋 getInstitutions - Environment check:', {
      APP_BASE_URL: process.env.APP_BASE_URL,
      REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL,
      using: baseURL
    });
    
    const institutions = institutionsSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // ALWAYS regenerate links to ensure they use the correct UltimateCare domain
      // HARDCODE the base URL directly in the template string
      const accessLink = `https://ultimatecare-2025.web.app/onboard?institution=${doc.id}`;
      const loginLink = `https://ultimatecare-2025.web.app/institution/login?institution=${doc.id}`;
      const slug = data.slug || `${data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${doc.id.substring(0, 8)}`;
      
      // Log if we're overwriting old links
      const oldAccessLink = data.accessLink;
      if (oldAccessLink && (oldAccessLink.includes('elderx') || !oldAccessLink.includes('ultimatecare-2025'))) {
        console.log(`🔄 Regenerating link for institution ${doc.id}:`, {
          old: oldAccessLink,
          new: accessLink,
          baseURL: baseURL
        });
      }
      
      // Explicitly construct the return object to ensure old links are overwritten
      const result = {
        id: doc.id,
        name: data.name,
        domain: data.domain,
        slug: slug,
        accessLink: accessLink,  // HARDCODED - Always use UltimateCare domain
        loginLink: loginLink,    // HARDCODED - Always use UltimateCare domain
        notes: data.notes,
        active: data.active,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      };
      
      // Double-check the result before returning
      if (result.accessLink.includes('elderx')) {
        console.error(`❌ CRITICAL ERROR: Institution ${doc.id} accessLink still contains 'elderx'!`, {
          accessLink: result.accessLink,
          loginLink: result.loginLink
        });
        // Force correct link
        result.accessLink = `https://ultimatecare-2025.web.app/onboard?institution=${doc.id}`;
        result.loginLink = `https://ultimatecare-2025.web.app/institution/login?institution=${doc.id}`;
      }
      
      return result;
    });

    console.log(`📋 getInstitutions - Returning ${institutions.length} institutions`);
    institutions.forEach(inst => {
      console.log(`  - ${inst.id}: ${inst.accessLink}`);
    });

    return institutions;
  } catch (error) {
    console.error('Error fetching institutions:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch institutions');
  }
});

export const getLicenses = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can view licenses');
  }

  try {
    const licensesSnapshot = await getDb().collection('licenses').orderBy('createdAt', 'desc').get();
    const licenses = licensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      endsAt: doc.data().endsAt?.toDate?.()?.toISOString() || null
    }));

    return licenses;
  } catch (error) {
    console.error('Error fetching licenses:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch licenses');
  }
});

export const updateInstitution = functions.https.onCall(async (data: { institutionId: string; updates: any }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can update institutions');
  }

  const { institutionId, updates } = data;
  if (!institutionId) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId is required');
  }

  try {
    const institutionRef = getDb().collection('institutions').doc(institutionId);
    await institutionRef.update({
      ...updates,
      updatedAt: admin.firestore.Timestamp.now()
    });

    const updated = await institutionRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    console.error('Error updating institution:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update institution');
  }
});

export const deleteInstitution = functions.https.onCall(async (data: { institutionId: string }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can delete institutions');
  }

  const { institutionId } = data;
  if (!institutionId) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId is required');
  }

  try {
    // Delete institution
    await getDb().collection('institutions').doc(institutionId).delete();
    
    // Also delete associated licenses
    const licensesSnapshot = await getDb().collection('licenses').where('institutionId', '==', institutionId).get();
    const batch = getDb().batch();
    licensesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return { success: true, message: 'Institution and associated licenses deleted' };
  } catch (error) {
    console.error('Error deleting institution:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete institution');
  }
});

export const updateLicense = functions.https.onCall(async (data: { licenseId: string; updates: any }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can update licenses');
  }

  const { licenseId, updates } = data;
  if (!licenseId) {
    throw new functions.https.HttpsError('invalid-argument', 'licenseId is required');
  }

  try {
    const licenseRef = getDb().collection('licenses').doc(licenseId);
    
    // Convert date strings to Timestamps if needed
    const updateData: any = {
      ...updates,
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    if (updates.endsAt && typeof updates.endsAt === 'string') {
      updateData.endsAt = admin.firestore.Timestamp.fromDate(new Date(updates.endsAt));
    }
    
    await licenseRef.update(updateData);

    const updated = await licenseRef.get();
    return { id: updated.id, ...updated.data() };
  } catch (error) {
    console.error('Error updating license:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update license');
  }
});

export const suspendLicense = functions.https.onCall(async (data: { licenseId: string }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can suspend licenses');
  }

  const { licenseId } = data;
  if (!licenseId) {
    throw new functions.https.HttpsError('invalid-argument', 'licenseId is required');
  }

  try {
    await getDb().collection('licenses').doc(licenseId).update({
      active: false,
      status: 'suspended',
      suspendedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true, message: 'License suspended successfully' };
  } catch (error) {
    console.error('Error suspending license:', error);
    throw new functions.https.HttpsError('internal', 'Failed to suspend license');
  }
});

export const activateLicense = functions.https.onCall(async (data: { licenseId: string }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can activate licenses');
  }

  const { licenseId } = data;
  if (!licenseId) {
    throw new functions.https.HttpsError('invalid-argument', 'licenseId is required');
  }

  try {
    await getDb().collection('licenses').doc(licenseId).update({
      active: true,
      status: 'active',
      suspendedAt: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    return { success: true, message: 'License activated successfully' };
  } catch (error) {
    console.error('Error activating license:', error);
    throw new functions.https.HttpsError('internal', 'Failed to activate license');
  }
});

export const getInstitutionAdmins = functions.https.onCall(async (data: { institutionId: string }, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can view institution admins');
  }

  const { institutionId } = data;
  if (!institutionId) {
    throw new functions.https.HttpsError('invalid-argument', 'institutionId is required');
  }

  try {
    // Get all users with this institutionId
    const usersSnapshot = await getDb().collection('users')
      .where('institutionId', '==', institutionId)
      .where('type', '==', 'admin')
      .get();
    
    const admins = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      displayName: doc.data().displayName,
      phone: doc.data().phone,
      active: doc.data().active !== false,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
    }));

    return admins;
  } catch (error) {
    console.error('Error fetching institution admins:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch institution admins');
  }
});

export const migrateInstitutionLinks = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can migrate data');
  }

  const { force } = data || {};
  console.log('🔍 Migration called with data:', JSON.stringify(data));
  console.log('🔍 Force parameter:', force, typeof force);

  try {
    const institutionsSnapshot = await getDb().collection('institutions').get();
    
    // HARDCODE the base URL - DO NOT use getBaseURL() or any environment variables
    const CORRECT_BASE_URL = 'https://ultimatecare-2025.web.app';
    console.log('🔍 Using HARDCODED base URL:', CORRECT_BASE_URL);
    
    // Collect all institutions that need updating
    const institutionsToUpdate: Array<{ ref: admin.firestore.DocumentReference; institutionId: string; name: string; oldAccessLink: string; oldLoginLink: string; newAccessLink: string; newLoginLink: string; newSlug: string }> = [];
    
    institutionsSnapshot.docs.forEach(doc => {
      const docData = doc.data();
      const institutionId = doc.id;
      
      // HARDCODE the correct links
      const correctAccessLink = `${CORRECT_BASE_URL}/onboard?institution=${institutionId}`;
      const correctLoginLink = `${CORRECT_BASE_URL}/institution/login?institution=${institutionId}`;
      const slug = docData.slug || `${docData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${institutionId.substring(0, 8)}`;
      
      // Check for ANY variation of elderx domain (case-insensitive)
      const accessLinkLower = (docData.accessLink || '').toLowerCase();
      const loginLinkLower = (docData.loginLink || '').toLowerCase();
      const hasOldDomain = accessLinkLower.includes('elderx') || loginLinkLower.includes('elderx');
      
      // Check if links don't match correct base URL
      const doesntMatchCorrect = (docData.accessLink !== correctAccessLink) || (docData.loginLink !== correctLoginLink);
      
      // ALWAYS update if force=true, otherwise update if links contain old domain, don't match correct URL, or are missing
      const shouldUpdate = force === true || hasOldDomain || doesntMatchCorrect || !docData.accessLink || !docData.loginLink;
      
      if (shouldUpdate) {
        console.log('✅ Will update institution:', {
          institutionId: institutionId,
          name: docData.name,
          oldAccessLink: docData.accessLink,
          newAccessLink: correctAccessLink,
          oldLoginLink: docData.loginLink,
          newLoginLink: correctLoginLink,
          hasOldDomain,
          doesntMatchCorrect
        });
        
        institutionsToUpdate.push({
          ref: doc.ref,
          institutionId: institutionId,
          name: docData.name || 'Unknown',
          oldAccessLink: docData.accessLink || 'missing',
          oldLoginLink: docData.loginLink || 'missing',
          newAccessLink: correctAccessLink,
          newLoginLink: correctLoginLink,
          newSlug: slug
        });
      } else {
        console.log('⏭️ Skipping institution (already correct):', {
          institutionId: institutionId,
          name: docData.name,
          accessLink: docData.accessLink
        });
      }
    });

    console.log(`📊 Migration summary: ${institutionsToUpdate.length} institutions to update out of ${institutionsSnapshot.size} total`);
    
    if (institutionsToUpdate.length === 0) {
      return { success: true, message: 'No institutions need updating - all links are already correct', updatedCount: 0 };
    }

    // Firestore batch limit is 500 operations, so we need to split into multiple batches if needed
    const BATCH_LIMIT = 500;
    let totalUpdated = 0;
    
    for (let i = 0; i < institutionsToUpdate.length; i += BATCH_LIMIT) {
      const batch = getDb().batch();
      const batchItems = institutionsToUpdate.slice(i, i + BATCH_LIMIT);
      
      console.log(`💾 Processing batch ${Math.floor(i / BATCH_LIMIT) + 1} (${batchItems.length} institutions)...`);
      
      batchItems.forEach(item => {
        console.log(`  - Updating ${item.institutionId} (${item.name}):`, {
          oldAccess: item.oldAccessLink,
          newAccess: item.newAccessLink
        });
        batch.update(item.ref, {
          slug: item.newSlug,
          accessLink: item.newAccessLink,  // HARDCODED correct URL
          loginLink: item.newLoginLink,     // HARDCODED correct URL
          updatedAt: admin.firestore.Timestamp.now()
        });
      });
      
      console.log(`💾 Committing batch ${Math.floor(i / BATCH_LIMIT) + 1}...`);
      await batch.commit();
      totalUpdated += batchItems.length;
      console.log(`✅ Batch ${Math.floor(i / BATCH_LIMIT) + 1} committed successfully (${totalUpdated}/${institutionsToUpdate.length} total)`);
    }

    // Verify the updates worked by reading back from database
    console.log('🔍 Verifying updates by reading from database...');
    const verifySnapshot = await getDb().collection('institutions').get();
    let verifiedCount = 0;
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.accessLink?.includes('ultimatecare-2025') && data.loginLink?.includes('ultimatecare-2025')) {
        verifiedCount++;
      } else {
        console.error(`❌ Verification failed for ${doc.id}:`, {
          accessLink: data.accessLink,
          loginLink: data.loginLink
        });
      }
    });
    console.log(`✅ Verification: ${verifiedCount}/${verifySnapshot.size} institutions have correct links`);

    console.log(`✅ Migration complete! Updated ${totalUpdated} institutions`);
    return { 
      success: true, 
      message: `Successfully migrated ${totalUpdated} institutions. Verified: ${verifiedCount}/${verifySnapshot.size} have correct links.`, 
      updatedCount: totalUpdated,
      verifiedCount: verifiedCount,
      totalCount: verifySnapshot.size
    };
  } catch (error: any) {
    console.error('❌ Error migrating institutions:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', `Failed to migrate institutions: ${error.message}`);
  }
});

/**
 * Force update ALL institution links in database
 * This function directly overwrites all accessLink and loginLink fields
 * regardless of their current value
 */
export const forceUpdateAllInstitutionLinks = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only super-admin can force update links');
  }

  console.log('🚀🚀🚀 FORCE UPDATE ALL INSTITUTION LINKS CALLED');
  
  try {
    const institutionsSnapshot = await getDb().collection('institutions').get();
    
    // HARDCODE the base URL - DO NOT use any environment variables
    const CORRECT_BASE_URL = 'https://ultimatecare-2025.web.app';
    console.log('🔍 FORCE UPDATE: Using HARDCODED base URL:', CORRECT_BASE_URL);
    console.log(`📋 FORCE UPDATE: Found ${institutionsSnapshot.size} institutions to update`);
    
    if (institutionsSnapshot.size === 0) {
      return { success: true, message: 'No institutions found', updatedCount: 0 };
    }

    // Firestore batch limit is 500 operations
    const BATCH_LIMIT = 500;
    let totalUpdated = 0;
    const allUpdates: Array<{ id: string; name: string; oldAccess: string; oldLogin: string; newAccess: string; newLogin: string; slug: string }> = [];
    
    // First pass: collect all updates
    institutionsSnapshot.docs.forEach(doc => {
      const docData = doc.data();
      const institutionId = doc.id;
      
      // HARDCODE the correct links
      const correctAccessLink = `${CORRECT_BASE_URL}/onboard?institution=${institutionId}`;
      const correctLoginLink = `${CORRECT_BASE_URL}/institution/login?institution=${institutionId}`;
      const slug = docData.slug || `${docData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${institutionId.substring(0, 8)}`;
      
      allUpdates.push({
        id: institutionId,
        name: docData.name || 'Unknown',
        oldAccess: docData.accessLink || 'missing',
        oldLogin: docData.loginLink || 'missing',
        newAccess: correctAccessLink,
        newLogin: correctLoginLink,
        slug: slug
      });
    });

    // Second pass: apply updates in batches
    for (let i = 0; i < allUpdates.length; i += BATCH_LIMIT) {
      const batch = getDb().batch();
      const batchItems = allUpdates.slice(i, i + BATCH_LIMIT);
      
      console.log(`💾 FORCE UPDATE: Processing batch ${Math.floor(i / BATCH_LIMIT) + 1} (${batchItems.length} institutions)...`);
      
      batchItems.forEach(item => {
        const docRef = getDb().collection('institutions').doc(item.id);
        console.log(`  - FORCE UPDATING ${item.id} (${item.name}):`, {
          oldAccess: item.oldAccess,
          newAccess: item.newAccess,
          oldLogin: item.oldLogin,
          newLogin: item.newLogin
        });
        
        batch.update(docRef, {
          slug: item.slug,
          accessLink: item.newAccess,  // HARDCODED correct URL
          loginLink: item.newLogin,     // HARDCODED correct URL
          updatedAt: admin.firestore.Timestamp.now()
        });
      });
      
      console.log(`💾 FORCE UPDATE: Committing batch ${Math.floor(i / BATCH_LIMIT) + 1}...`);
      await batch.commit();
      totalUpdated += batchItems.length;
      console.log(`✅ FORCE UPDATE: Batch ${Math.floor(i / BATCH_LIMIT) + 1} committed (${totalUpdated}/${allUpdates.length} total)`);
    }

    // Verify the updates worked by reading back from database
    console.log('🔍 FORCE UPDATE: Verifying updates by reading from database...');
    const verifySnapshot = await getDb().collection('institutions').get();
    let verifiedCount = 0;
    const failedVerifications: Array<{ id: string; accessLink: string; loginLink: string }> = [];
    
    verifySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.accessLink?.includes('ultimatecare-2025') && data.loginLink?.includes('ultimatecare-2025')) {
        verifiedCount++;
      } else {
        failedVerifications.push({
          id: doc.id,
          accessLink: data.accessLink || 'missing',
          loginLink: data.loginLink || 'missing'
        });
        console.error(`❌ FORCE UPDATE: Verification failed for ${doc.id}:`, {
          accessLink: data.accessLink,
          loginLink: data.loginLink
        });
      }
    });
    
    console.log(`✅ FORCE UPDATE: Verification complete - ${verifiedCount}/${verifySnapshot.size} institutions have correct links`);
    if (failedVerifications.length > 0) {
      console.error(`❌ FORCE UPDATE: ${failedVerifications.length} institutions failed verification:`, failedVerifications);
    }

    console.log(`✅ FORCE UPDATE: Complete! Updated ${totalUpdated} institutions`);
    return { 
      success: true, 
      message: `Force updated ${totalUpdated} institutions. Verified: ${verifiedCount}/${verifySnapshot.size} have correct links.`, 
      updatedCount: totalUpdated,
      verifiedCount: verifiedCount,
      totalCount: verifySnapshot.size,
      failedVerifications: failedVerifications.length > 0 ? failedVerifications : undefined
    };
  } catch (error: any) {
    console.error('❌ FORCE UPDATE: Error updating institutions:', error);
    console.error('Error stack:', error.stack);
    throw new functions.https.HttpsError('internal', `Failed to force update institutions: ${error.message}`);
  }
});

export const removeInstitutionAdmin = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated and is a super admin
  if (!context.auth?.token?.superAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Super admin privileges required');
  }

  const { institutionId, adminId } = data || {};

  if (!institutionId || !adminId) {
    throw new functions.https.HttpsError('invalid-argument', 'Institution ID and Admin ID are required');
  }

  try {
    // Get admin user record
    const adminUserRecord = await admin.auth().getUser(adminId);
    const adminEmail = adminUserRecord.email;

    // Remove institution-specific claims from the admin user
    const currentClaims = (adminUserRecord.customClaims as any) || {};
    const updatedClaims = { ...currentClaims };
    
    // Remove institution admin claims
    delete updatedClaims.institutionId;
    delete updatedClaims.institutionAdmin;
    
    // If they only had admin claims for this institution, remove admin claim entirely
    if (currentClaims.institutionId === institutionId && !currentClaims.superAdmin) {
      delete updatedClaims.admin;
    }

    await admin.auth().setCustomUserClaims(adminId, updatedClaims);

    // Update user document in Firestore
    const userDocRef = getDb().collection('users').doc(adminId);
    const userDoc = await userDocRef.get();
    
    if (userDoc.exists) {
      const updateData: any = {
        updatedAt: admin.firestore.Timestamp.now()
      };

      // Remove institution-specific fields
      updateData.institutionId = admin.firestore.FieldValue.delete();
      updateData.institutionAdmin = admin.firestore.FieldValue.delete();

      // If they were only an institution admin (not super admin), remove admin fields
      const userData = userDoc.data();
      if (userData?.institutionId === institutionId && !userData?.superAdmin) {
        updateData.type = 'caregiver'; // Default to caregiver
        updateData.userType = 'caregiver';
        updateData.role = 'caregiver';
      }

      await userDocRef.update(updateData);
    }

    console.log(`Admin ${adminEmail} removed from institution ${institutionId}`);
    return { 
      success: true, 
      message: `Admin ${adminEmail} removed from institution successfully` 
    };

  } catch (error) {
    console.error('Error removing institution admin:', error);
    throw new functions.https.HttpsError('internal', 'Failed to remove institution admin');
  }
});

