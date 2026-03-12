#!/usr/bin/env node

/**
 * List All Super Admin Accounts
 * 
 * This script lists all super admin accounts in the system.
 * 
 * Usage:
 *   node list-superadmins.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('./firebase-service-account.json');
} catch (error) {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.error('❌ Error: Could not find Firebase service account file.');
    console.log('Please ensure one of these files exists:');
    console.log('  - firebase-service-account.json');
    console.log('  - serviceAccountKey.json');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function listSuperAdmins() {
  try {
    console.log('\n🔐 Listing all Super Admin accounts...\n');
    console.log('═'.repeat(60));
    
    // Query for super admins in Firestore
    const superAdminQuery = await db.collection('users')
      .where('isSuperAdmin', '==', true)
      .get();
    
    // Also check for role-based super admins
    const roleQuery = await db.collection('users')
      .where('role', '==', 'super-admin')
      .get();
    
    // Combine results and remove duplicates
    const allSuperAdmins = new Map();
    
    superAdminQuery.forEach(doc => {
      const data = doc.data();
      allSuperAdmins.set(doc.id, {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        isSuperAdmin: data.isSuperAdmin,
        createdAt: data.createdAt
      });
    });
    
    roleQuery.forEach(doc => {
      if (!allSuperAdmins.has(doc.id)) {
        const data = doc.data();
        allSuperAdmins.set(doc.id, {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role,
          isSuperAdmin: data.isSuperAdmin,
          createdAt: data.createdAt
        });
      }
    });
    
    if (allSuperAdmins.size === 0) {
      console.log('❌ No Super Admin accounts found.\n');
      console.log('💡 To create a Super Admin, run:');
      console.log('   node create-super-admin.js\n');
      return;
    }
    
    console.log(`\n✅ Found ${allSuperAdmins.size} Super Admin account(s):\n`);
    console.log('═'.repeat(60));
    
    let index = 1;
    for (const [uid, adminData] of allSuperAdmins) {
      console.log(`\n${index}. Super Admin Account:`);
      console.log(`   📧 Email: ${adminData.email || '(not set)'}`);
      console.log(`   👤 Display Name: ${adminData.displayName || '(not set)'}`);
      console.log(`   🆔 UID: ${uid}`);
      console.log(`   🎭 Role: ${adminData.role || '(not set)'}`);
      console.log(`   ✅ isSuperAdmin: ${adminData.isSuperAdmin || false}`);
      
      if (adminData.createdAt) {
        const createdDate = adminData.createdAt.toDate ? 
          adminData.createdAt.toDate().toLocaleString() : 
          adminData.createdAt;
        console.log(`   📅 Created: ${createdDate}`);
      }
      
      // Check custom claims
      try {
        const userRecord = await auth.getUser(uid);
        const claims = userRecord.customClaims || {};
        console.log(`   🔐 Custom Claims:`);
        console.log(`      - superAdmin: ${claims.superAdmin || false}`);
        console.log(`      - admin: ${claims.admin || false}`);
      } catch (error) {
        console.log(`   ⚠️  Could not fetch custom claims: ${error.message}`);
      }
      
      index++;
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n💡 Login URL: https://elderx-f5c2b.web.app/super-admin/login\n');
    
  } catch (error) {
    console.error('\n❌ Error listing Super Admins:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

listSuperAdmins();

