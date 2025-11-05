// Fix User Data Script
// Fixes inconsistent user role data in Firestore

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'elderx-f5c2b'
  });
}

const db = admin.firestore();

async function fixUserData() {
  try {
    console.log('🔧 Starting user data fix...\n');

    // Fix specific user: chinyere@bulah.com
    const userId = '1NYxTAkFm1aOB5Zoi8d1EHaiQUA2';
    
    console.log(`📝 Fixing user: ${userId}`);
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('Current data:', {
      userType: userData.userType,
      type: userData.type,
      role: userData.role,
      roles: userData.roles
    });
    
    // Determine the correct role(s)
    // If they have medicalQualification set to 'Doctor', they should be a doctor
    const medicalQual = userData.medicalQualification?.toLowerCase();
    let primaryRole = 'doctor'; // Default to doctor based on their medical qualification
    let roles = ['doctor']; // Start with doctor role
    
    // If they're also working as a caregiver, add that role
    if (userData.userType === 'caregiver' || userData.type === 'caregiver') {
      roles.push('caregiver');
    }
    
    console.log('\n🔄 Updating to:', {
      userType: primaryRole,
      type: primaryRole,
      role: primaryRole,
      roles: roles
    });
    
    // Update the user document
    await userRef.update({
      userType: primaryRole,
      type: primaryRole,
      role: primaryRole,
      roles: roles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ User data fixed successfully!\n');
    
    // Verify the update
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log('✅ Verified updated data:', {
      userType: updatedData.userType,
      type: updatedData.type,
      role: updatedData.role,
      roles: updatedData.roles
    });
    
    console.log('\n✅ All user data fixes complete!');
    
  } catch (error) {
    console.error('❌ Error fixing user data:', error);
    throw error;
  }
}

// Run the fix
fixUserData()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

