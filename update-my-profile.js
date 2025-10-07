const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

admin.initializeApp({
  credential: applicationDefault()
});

const db = admin.firestore();

// Your email - CHANGE THIS if needed
const EMAIL = 'onyedika.akoma@gmail.com';

(async () => {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(EMAIL);
    console.log('Found user:', userRecord.uid);
    
    // Update Firestore document
    await db.collection('users').doc(userRecord.uid).set({
      email: EMAIL,
      displayName: 'Super Admin',
      type: 'admin',
      userType: 'admin',
      role: 'admin',
      superAdmin: true,
      active: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });
    
    console.log('✅ Firestore profile updated successfully!');
    console.log('✅ You can now access the admin panels');
    console.log('💡 Please refresh your browser (you may need to log out and log back in)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

