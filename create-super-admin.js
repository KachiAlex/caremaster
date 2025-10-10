#!/usr/bin/env node

/**
 * ElderX Super Admin Account Creator
 * 
 * This script creates or promotes a user to Super Admin status.
 * Super Admins have full system access to manage institutions, licenses, and all platform features.
 * 
 * Usage:
 *   node create-super-admin.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createSuperAdmin() {
  console.log('\n🔐 ElderX Super Admin Account Creator\n');
  console.log('═'.repeat(60));
  console.log('This tool will create or promote a user to Super Admin status.');
  console.log('Super Admins have full system access.\n');
  console.log('═'.repeat(60));
  console.log();

  try {
    // Ask for email
    const email = await question('Enter email address: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      return;
    }

    // Check if user exists
    let user;
    let userExists = true;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`\n✅ User found: ${user.uid}`);
    } catch (error) {
      userExists = false;
      console.log('\n⚠️  User not found. Creating new account...');
    }

    // If user doesn't exist, create them
    if (!userExists) {
      const displayName = await question('Enter display name: ');
      const password = await question('Enter password (min 6 characters): ');

      if (!password || password.length < 6) {
        console.error('❌ Password must be at least 6 characters');
        rl.close();
        return;
      }

      // Create user in Firebase Auth
      user = await auth.createUser({
        email,
        password,
        displayName: displayName || 'Super Admin',
        emailVerified: true
      });

      console.log(`✅ User created with UID: ${user.uid}`);

      // Create user profile in Firestore
      await db.collection('users').doc(user.uid).set({
        id: user.uid,
        email,
        displayName: displayName || 'Super Admin',
        userType: 'admin',
        type: 'admin',
        role: 'super-admin',
        isSuperAdmin: true,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
        permissions: ['all']
      });

      console.log('✅ User profile created in Firestore');
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, {
      superAdmin: true,
      admin: true
    });

    console.log('✅ Super Admin custom claims set');

    // Update Firestore profile to ensure super admin flag is set
    await db.collection('users').doc(user.uid).set({
      userType: 'admin',
      type: 'admin',
      role: 'super-admin',
      isSuperAdmin: true,
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      permissions: ['all']
    }, { merge: true });

    console.log('✅ Firestore profile updated');

    // Log the action
    await db.collection('auditLogs').add({
      type: 'super_admin_created',
      userId: user.uid,
      email: user.email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      action: userExists ? 'promoted_to_super_admin' : 'created_as_super_admin',
      performedBy: 'system_script'
    });

    console.log('✅ Action logged to audit logs');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ SUCCESS! Super Admin account ready\n');
    console.log('📧 Email:', email);
    console.log('🆔 User ID:', user.uid);
    console.log('🔗 Login URL: https://elderx-f5c2b.web.app/super-admin/login');
    console.log('═'.repeat(60) + '\n');

    console.log('⚠️  IMPORTANT: The user must log out and log back in for custom claims to take effect.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Batch create super admins (optional advanced usage)
async function batchCreateSuperAdmins(admins) {
  console.log('\n🔐 Batch Super Admin Creation\n');
  console.log('═'.repeat(60));
  
  for (const adminData of admins) {
    try {
      console.log(`\nProcessing: ${adminData.email}...`);
      
      let user;
      try {
        user = await auth.getUserByEmail(adminData.email);
        console.log(`  ✓ User exists: ${user.uid}`);
      } catch (error) {
        user = await auth.createUser({
          email: adminData.email,
          password: adminData.password || 'ChangeMe123!',
          displayName: adminData.displayName || 'Super Admin',
          emailVerified: true
        });
        console.log(`  ✓ User created: ${user.uid}`);
      }

      // Set custom claims
      await auth.setCustomUserClaims(user.uid, {
        superAdmin: true,
        admin: true
      });

      // Update Firestore
      await db.collection('users').doc(user.uid).set({
        id: user.uid,
        email: adminData.email,
        displayName: adminData.displayName || 'Super Admin',
        userType: 'admin',
        type: 'admin',
        role: 'super-admin',
        isSuperAdmin: true,
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
        permissions: ['all']
      }, { merge: true });

      console.log(`  ✓ Super Admin created: ${adminData.email}`);
    } catch (error) {
      console.error(`  ✗ Error with ${adminData.email}:`, error.message);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Batch creation complete\n');
}

// Check if running in batch mode
const batchMode = process.argv.includes('--batch');

if (batchMode) {
  // Example batch configuration
  const admins = [
    {
      email: 'superadmin@elderx.com',
      password: 'SuperAdmin2024!',
      displayName: 'ElderX Super Administrator'
    }
    // Add more admins here as needed
  ];
  
  batchCreateSuperAdmins(admins).then(() => process.exit(0));
} else {
  createSuperAdmin();
}

