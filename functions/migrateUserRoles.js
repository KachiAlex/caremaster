/**
 * Cloud Function to migrate user roles
 * This runs server-side and bypasses Firestore security rules
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  CAREGIVER: 'caregiver',
  CLIENT: 'client',
  ELDERLY: 'elderly'
};

function inferRole(userData) {
  // Check for superadmin first
  if (userData.email === 'superadmin@Care Master.com') return 'super-admin';
  
  // Priority 1: Explicit role field
  if (userData.role) return userData.role;
  
  // Priority 2: userType
  if (userData.userType) {
    if (userData.userType === 'elderly') return ROLES.ELDERLY;
    return userData.userType;
  }
  
  // Priority 3: type
  if (userData.type) {
    if (userData.type === 'elderly') return ROLES.ELDERLY;
    return userData.type;
  }
  
  // Priority 4: Infer from medicalQualification
  if (userData.medicalQualification) {
    const qual = userData.medicalQualification.toLowerCase();
    if (qual.includes('doctor') || qual.includes('md')) return ROLES.DOCTOR;
    if (qual.includes('nurse') || qual.includes('rn') || qual.includes('lpn')) return ROLES.NURSE;
    if (qual.includes('pharmacist')) return ROLES.PHARMACIST;
  }
  
  // Default based on context
  if (userData.assignedCaregiver || userData.assignedDoctor) return ROLES.ELDERLY;
  
  return ROLES.CAREGIVER;
}

exports.migrateUserRoles = functions.https.onCall(async (data, context) => {
  try {
    console.log('Starting user role migration...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    const results = {
      total: usersSnapshot.size,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Process users in batches
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Skip if already migrated
      if (userData.roleMigrated) {
        results.skipped++;
        continue;
      }
      
      try {
        const inferredRole = inferRole(userData);
        
        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, {
          role: inferredRole,
          roleMigrated: true,
          roleMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.details.push({
          userId: doc.id,
          email: userData.email,
          name: userData.name,
          oldRole: userData.role,
          newRole: inferredRole,
          success: true
        });
        
        results.migrated++;
        batchCount++;
        
        // Commit batch if we reach the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`Error migrating user ${doc.id}:`, error);
        results.errors++;
        results.details.push({
          userId: doc.id,
          email: userData.email,
          error: error.message,
          success: false
        });
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('Migration complete:', results);
    return results;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// HTTP endpoint version (callable without authentication)
exports.migrateUserRolesHttp = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  
  try {
    console.log('Starting user role migration via HTTP...');
    
    const usersSnapshot = await db.collection('users').get();
    
    const results = {
      total: usersSnapshot.size,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      if (userData.roleMigrated) {
        results.skipped++;
        continue;
      }
      
      try {
        const inferredRole = inferRole(userData);
        
        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, {
          role: inferredRole,
          roleMigrated: true,
          roleMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.details.push({
          userId: doc.id,
          email: userData.email || doc.id,
          newRole: inferredRole
        });
        
        results.migrated++;
        batchCount++;
        
      } catch (error) {
        results.errors++;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    res.status(200).json(results);
    
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: error.message });
  }
});

