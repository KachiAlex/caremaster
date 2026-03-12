/**
 * Cleanup caregivers that have no matching users/{uid} document.
 * Removes the caregiver doc plus related assignments/careTasks to avoid dangling data.
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

async function deleteDocsWhere(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, '==', value).get();
  if (snapshot.empty) {
    return 0;
  }

  let deleted = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchOps += 1;
    deleted += 1;

    if (batchOps === 450) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  if (deleted > 0) {
    console.log(`   • Removed ${deleted} docs from ${collectionName} for caregiverId=${value}`);
  }

  return deleted;
}

async function cleanupOrphanCaregivers() {
  console.log('🔍 Scanning caregivers collection for orphaned entries...');
  const caregiversSnapshot = await db.collection('caregivers').get();
  if (caregiversSnapshot.empty) {
    console.log('ℹ️ No caregivers found.');
    return;
  }

  let deletedCaregivers = 0;
  let relatedDeletes = 0;

  for (const caregiverDoc of caregiversSnapshot.docs) {
    const caregiverData = caregiverDoc.data();
    const userId = caregiverData.userId || caregiverData.uid || caregiverDoc.id;

    if (!userId) {
      console.warn(`⚠️ Caregiver ${caregiverDoc.id} has no userId/uid. Skipping.`);
      continue;
    }

    const userSnap = await db.collection('users').doc(userId).get();
    if (userSnap.exists) {
      continue; // caregiver has a valid user record
    }

    console.warn(`🗑️ Caregiver ${caregiverDoc.id} (userId=${userId}) has no matching users doc. Cleaning up...`);

    await caregiverDoc.ref.delete();
    deletedCaregivers += 1;

    relatedDeletes += await deleteDocsWhere('assignments', 'caregiverId', userId);
    relatedDeletes += await deleteDocsWhere('caregiverAssignments', 'caregiverId', userId);
    relatedDeletes += await deleteDocsWhere('careTasks', 'caregiverId', userId);
  }

  console.log('✅ Orphan cleanup complete.');
  console.log(`   Caregivers deleted: ${deletedCaregivers}`);
  console.log(`   Related docs removed: ${relatedDeletes}`);
}

cleanupOrphanCaregivers()
  .then(() => {
    console.log('🎯 Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
