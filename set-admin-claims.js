#!/usr/bin/env node
/**
 * Set Admin Custom Claims
 * 
 * This script sets custom claims for a user to grant them admin access.
 * 
 * Usage:
 *   node set-admin-claims.js USER_EMAIL
 * 
 * Example:
 *   node set-admin-claims.js admin@institution.com
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Make sure you have the service account key or are authenticated
try {
  admin.initializeApp({
    projectId: 'elderx-f5c2b'
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  console.log('\nMake sure you are authenticated with Firebase:');
  console.log('  firebase login');
  console.log('  or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Set admin claims for a user
 */
async function setAdminClaims(email) {
  try {
    console.log(`\n🔍 Looking up user: ${email}`);
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);
    
    // Set custom claims
    console.log('🔧 Setting admin custom claims...');
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      institutionAdmin: true
    });
    console.log('✅ Custom claims set successfully');
    
    // Update Firestore document
    console.log('🔧 Updating Firestore user document...');
    const userRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userRef.get();
    
    const updates = {
      type: 'admin',
      userType: 'admin',
      institutionAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (userDoc.exists()) {
      await userRef.update(updates);
      console.log('✅ Firestore document updated');
    } else {
      await userRef.set({
        ...updates,
        email: email,
        displayName: userRecord.displayName || 'Admin User',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Firestore document created');
    }
    
    console.log('\n✅ SUCCESS! Admin permissions granted to:', email);
    console.log('\nThe user should:');
    console.log('1. Log out of the application');
    console.log('2. Log back in (to get fresh token with new claims)');
    console.log('3. All admin features should now be accessible');
    
    // Display current user info
    console.log('\n📋 User Information:');
    console.log('   UID:', userRecord.uid);
    console.log('   Email:', userRecord.email);
    console.log('   Display Name:', userRecord.displayName || '(not set)');
    
    const updatedDoc = await userRef.get();
    if (updatedDoc.exists()) {
      const data = updatedDoc.data();
      console.log('   Institution ID:', data.institutionId || '(not set)');
      console.log('   User Type:', data.userType || data.type || '(not set)');
    }
    
  } catch (error) {
    console.error('\n❌ Error setting admin claims:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log('\nUser not found. Please check the email address.');
      console.log('You can create a new user in Firebase Console:');
      console.log('https://console.firebase.google.com/project/elderx-f5c2b/authentication/users');
    }
    
    process.exit(1);
  }
}

/**
 * List all admin users
 */
async function listAdminUsers() {
  try {
    console.log('\n📋 Listing all admin users...\n');
    
    const usersSnapshot = await db.collection('users')
      .where('userType', '==', 'admin')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('No admin users found.');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} admin user(s):\n`);
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.email || data.displayName || doc.id}`);
      console.log(`    UID: ${doc.id}`);
      console.log(`    Type: ${data.type || data.userType}`);
      console.log(`    Institution: ${data.institutionId || '(none)'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error listing admin users:', error.message);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log('Usage:');
  console.log('  node set-admin-claims.js USER_EMAIL        - Grant admin access to user');
  console.log('  node set-admin-claims.js --list            - List all admin users');
  console.log('');
  console.log('Examples:');
  console.log('  node set-admin-claims.js admin@institution.com');
  console.log('  node set-admin-claims.js --list');
  process.exit(0);
}

if (command === '--list' || command === '-l') {
  listAdminUsers().then(() => process.exit(0));
} else {
  setAdminClaims(command).then(() => process.exit(0));
}

