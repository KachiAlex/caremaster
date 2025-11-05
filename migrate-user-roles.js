// User Roles Migration Script
// Ensures all users have consistent role data and supports multi-role structure

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'elderx-f5c2b'
  });
}

const db = admin.firestore();

async function migrateUserRoles() {
  try {
    console.log('🔧 Starting user roles migration...\n');

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 Found ${usersSnapshot.size} users to check\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Skip if user already has roles array that's properly set
      if (Array.isArray(userData.roles) && userData.roles.length > 0 && 
          userData.userType === userData.roles[0]) {
        console.log(`✓ Skipping ${userData.email || userId} - already migrated`);
        skippedCount++;
        continue;
      }
      
      console.log(`\n📝 Migrating user: ${userData.email || userId}`);
      console.log('   Current data:', {
        userType: userData.userType,
        type: userData.type,
        role: userData.role,
        roles: userData.roles,
        medicalQualification: userData.medicalQualification
      });
      
      // Determine primary role
      let primaryRole = userData.role || userData.userType || userData.type || 'client';
      
      // Check medical qualification for doctors
      const medicalQual = (userData.medicalQualification || '').toLowerCase();
      if (medicalQual.includes('doctor') || medicalQual.includes('physician') || medicalQual.includes('md')) {
        primaryRole = 'doctor';
      } else if (medicalQual.includes('nurse')) {
        primaryRole = 'nurse';
      }
      
      // Build roles array
      let roles = [];
      
      // Add primary role
      if (primaryRole) {
        roles.push(primaryRole);
      }
      
      // Add any additional roles from existing data
      if (userData.roles && Array.isArray(userData.roles)) {
        userData.roles.forEach(role => {
          if (!roles.includes(role)) {
            roles.push(role);
          }
        });
      }
      
      // Check for admin privileges
      if (userData.isAdmin || userData.institutionAdmin) {
        if (!roles.includes('admin')) {
          roles.push('admin');
        }
      }
      
      // Ensure at least one role
      if (roles.length === 0) {
        roles = ['client'];
        primaryRole = 'client';
      }
      
      console.log('   Updating to:', {
        userType: primaryRole,
        type: primaryRole,
        role: primaryRole,
        roles: roles
      });
      
      // Update the user document
      await db.collection('users').doc(userId).update({
        userType: primaryRole,
        type: primaryRole,
        role: primaryRole,
        roles: roles,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`   ✅ Migrated successfully`);
      migratedCount++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users`);
    console.log(`   📝 Total: ${usersSnapshot.size} users`);
    console.log('='.repeat(60) + '\n');
    
    console.log('✅ User roles migration complete!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
migrateUserRoles()
  .then(() => {
    console.log('\n🎉 Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });

