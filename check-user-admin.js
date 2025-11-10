/**
 * Script to check and fix user admin role
 * Run with: node check-user-admin.js <user-email>
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkAndFixUserAdmin(email) {
  try {
    console.log(`\n🔍 Checking user: ${email}`);
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user: ${userRecord.uid}`);
    
    // Get user document
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found in Firestore');
      return;
    }
    
    const userData = userDoc.data();
    console.log('\n📋 Current user data:');
    console.log('   userType:', userData.userType || '(not set)');
    console.log('   type:', userData.type || '(not set)');
    console.log('   role:', userData.role || '(not set)');
    console.log('   institutionId:', userData.institutionId || '(not set)');
    console.log('   institutionAdmin:', userData.institutionAdmin || false);
    
    // Check if user is admin
    const isAdmin = userData.userType === 'admin' || 
                    userData.type === 'admin' || 
                    userData.role === 'admin';
    
    if (isAdmin) {
      console.log('\n✅ User already has admin role set');
    } else {
      console.log('\n⚠️  User does NOT have admin role set');
      
      rl.question('\nDo you want to set admin role? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            // Update user document
            await db.collection('users').doc(userRecord.uid).update({
              userType: 'admin',
              type: 'admin',
              role: 'admin',
              institutionAdmin: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Set custom claims
            await auth.setCustomUserClaims(userRecord.uid, {
              admin: true,
              institutionAdmin: true
            });
            
            console.log('\n✅ Admin role set successfully!');
            console.log('\n⚠️  IMPORTANT: User must log out and log back in for changes to take effect');
          } catch (error) {
            console.error('❌ Error setting admin role:', error);
          }
        }
        rl.close();
        process.exit(0);
      });
      return;
    }
    
    // Check custom claims
    const customClaims = userRecord.customClaims || {};
    console.log('\n📋 Custom claims:');
    console.log('   admin:', customClaims.admin || false);
    console.log('   institutionAdmin:', customClaims.institutionAdmin || false);
    
    if (!customClaims.admin) {
      console.log('\n⚠️  Custom claims not set');
      rl.question('\nDo you want to set custom claims? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          try {
            await auth.setCustomUserClaims(userRecord.uid, {
              admin: true,
              institutionAdmin: true
            });
            console.log('\n✅ Custom claims set successfully!');
            console.log('\n⚠️  IMPORTANT: User must log out and log back in for changes to take effect');
          } catch (error) {
            console.error('❌ Error setting custom claims:', error);
          }
        }
        rl.close();
        process.exit(0);
      });
      return;
    }
    
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

// Get email from command line or prompt
const email = process.argv[2];

if (email) {
  checkAndFixUserAdmin(email);
} else {
  rl.question('Enter user email: ', (email) => {
    checkAndFixUserAdmin(email);
  });
}

