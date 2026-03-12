/**
 * Backfill caregiver user documents to ensure role fields are set correctly.
 * This fixes Firestore permission issues where caregivers can't read assignments.
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
}

const db = admin.firestore();

const CAREGIVER_ROLE_FIELDS = {
  userType: 'caregiver',
  type: 'caregiver',
  role: 'caregiver',
};

async function backfillCaregiverRoles() {
  console.log('🔍 Loading caregivers list...');
  const caregiverSnapshot = await db.collection('caregivers').get();

  if (caregiverSnapshot.empty) {
    console.log('ℹ️ No caregivers found. Nothing to backfill.');
    return;
  }

  console.log(`📋 Found ${caregiverSnapshot.size} caregivers. Checking user documents...`);

  let updatedCount = 0;
  let missingUsers = 0;

  for (const caregiverDoc of caregiverSnapshot.docs) {
    const caregiverData = caregiverDoc.data();
    const userId = caregiverData.userId || caregiverData.uid || caregiverDoc.id;

    if (!userId) {
      console.warn(`⚠️ Caregiver ${caregiverDoc.id} has no userId/uid. Skipping.`);
      continue;
    }

    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.warn(`⚠️ User document missing for caregiver ${caregiverDoc.id} (userId=${userId}).`);
      missingUsers++;
      continue;
    }

    const userData = userSnap.data() || {};
    const needsUpdate =
      userData.userType !== 'caregiver' ||
      userData.type !== 'caregiver' ||
      userData.role !== 'caregiver' ||
      !Array.isArray(userData.roles) ||
      !userData.roles.includes('caregiver');

    if (needsUpdate) {
      await userRef.set(
        {
          ...CAREGIVER_ROLE_FIELDS,
          roles: Array.from(new Set([...(userData.roles || []), 'caregiver'])),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      updatedCount++;
      console.log(`✅ Updated user ${userId} for caregiver ${caregiverDoc.id}`);
    }
  }

  console.log('🎯 Backfill complete.');
  console.log(`   Updated caregivers: ${updatedCount}`);
  console.log(`   Caregivers with missing user docs: ${missingUsers}`);
}

backfillCaregiverRoles()
  .then(() => {
    console.log('✅ Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
