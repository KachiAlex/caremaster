#!/usr/bin/env node

/**
 * Fix Admin UserType Script
 * 
 * This script fixes users who have role: 'admin' but userType: 'caregiver'
 * It ensures userType matches the role field
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('⚠️  Could not find firebase-service-account.json');
  console.log('Trying default credentials...');
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function fixAdminUserTypes() {
  console.log('\n🔧 Fixing Admin UserType Mismatches\n');
  console.log('═'.repeat(60));
  
  try {
    // Get all users with role 'admin' but userType is not 'admin'
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    let fixedCount = 0;
    const updates = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const role = data.role;
      const userType = data.userType || data.type;
      
      // Check if user has admin role but wrong userType
      if (role === 'admin' && userType !== 'admin' && userType !== 'institutionAdmin') {
        console.log(`\n❌ Found mismatch for ${data.email || doc.id}:`);
        console.log(`   Current userType: ${userType}`);
        console.log(`   Role field: ${role}`);
        console.log(`   → Will update userType to 'admin'`);
        
        updates.push({
          id: doc.id,
          email: data.email,
          currentUserType: userType,
          update: {
            userType: 'admin',
            type: 'admin',
            updatedAt: new Date().toISOString(),
            fixedBy: 'fix-admin-usertype-script'
          }
        });
      }
      
      // Also check if userType is 'admin' or 'institutionAdmin' but no role field
      if ((userType === 'admin' || userType === 'institutionAdmin') && !role) {
        console.log(`\n⚠️  Found admin without role field: ${data.email || doc.id}`);
        console.log(`   → Will set role to 'admin'`);
        
        updates.push({
          id: doc.id,
          email: data.email,
          currentUserType: userType,
          update: {
            role: 'admin',
            updatedAt: new Date().toISOString(),
            fixedBy: 'fix-admin-usertype-script'
          }
        });
      }
    });
    
    if (updates.length === 0) {
      console.log('\n✅ No mismatches found! All users have consistent role/userType fields.');
      console.log('═'.repeat(60) + '\n');
      process.exit(0);
      return;
    }
    
    console.log(`\n📝 Found ${updates.length} user(s) to fix\n`);
    console.log('═'.repeat(60));
    
    // Apply updates
    for (const update of updates) {
      try {
        await db.collection('users').doc(update.id).update(update.update);
        console.log(`✅ Fixed: ${update.email || update.id}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Error fixing ${update.email || update.id}:`, error.message);
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n✅ Fixed ${fixedCount} out of ${updates.length} users\n`);
    console.log('🔄 Users need to log out and log back in for changes to take effect.');
    console.log('═'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixAdminUserTypes();

