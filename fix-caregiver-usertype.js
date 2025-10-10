/**
 * Script to fix caregiver userType issues
 * Corrects users with caregiver IDs but incorrect userType
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://elderx-f5c2b.firebaseio.com'
});

const db = admin.firestore();

async function fixCaregiverUserType(userId) {
  try {
    console.log(`\n🔧 Fixing user: ${userId}`);
    
    // Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('Current user data:', {
      userType: userData.userType,
      type: userData.type,
      role: userData.role,
      email: userData.email
    });
    
    // Check if user ID starts with 'caregiver_'
    if (userId.startsWith('caregiver_')) {
      // Update userType to caregiver
      await userRef.update({
        userType: 'caregiver',
        type: 'caregiver', // Also update type field for consistency
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Updated userType to caregiver');
      
      // Also check/update caregivers collection
      const caregiverRef = db.collection('caregivers').doc(userId);
      const caregiverDoc = await caregiverRef.get();
      
      if (caregiverDoc.exists()) {
        console.log('✅ Caregiver document exists');
      } else {
        console.log('⚠️ Caregiver document not found - creating it');
        await caregiverRef.set({
          id: userId,
          userId: userId,
          email: userData.email,
          name: userData.name,
          phone: userData.phone || '',
          institutionId: userData.institutionId,
          status: userData.status || 'pending',
          onboardingComplete: userData.onboardingComplete || false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Created caregiver document');
      }
    } else {
      console.log('ℹ️ User ID does not start with "caregiver_" - skipping');
    }
    
  } catch (error) {
    console.error('Error fixing user:', error);
  }
}

async function fixAllCaregivers() {
  try {
    console.log('🔍 Finding all users with caregiver IDs...\n');
    
    const usersSnapshot = await db.collection('users').get();
    let fixed = 0;
    let checked = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();
      
      if (userId.startsWith('caregiver_')) {
        checked++;
        console.log(`\n📋 Checking: ${userId}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Current userType: ${userData.userType || 'not set'}`);
        
        if (userData.userType !== 'caregiver' && userData.type !== 'caregiver') {
          await fixCaregiverUserType(userId);
          fixed++;
        } else {
          console.log('   ✅ Already correct');
        }
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`   Checked: ${checked} caregivers`);
    console.log(`   Fixed: ${fixed} caregivers`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Fix specific user
    const userId = args[0];
    console.log(`Fixing specific user: ${userId}`);
    await fixCaregiverUserType(userId);
  } else {
    // Fix all caregivers
    console.log('Fixing all caregivers with incorrect userType...\n');
    await fixAllCaregivers();
  }
  
  console.log('\n✅ Done!');
  process.exit(0);
}

main();

