// Debug script to check if caregiver user exists
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCaregiverUser() {
  try {
    const email = 'chinyere@bulah.com';
    
    console.log(`\n🔍 Searching for user with email: ${email}\n`);
    
    // Check users collection
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found in users collection');
    } else {
      console.log(`✅ Found ${usersSnapshot.size} user(s) in users collection:\n`);
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('User ID:', doc.id);
        console.log('Email:', data.email);
        console.log('Name:', data.name);
        console.log('User Type:', data.userType || data.type);
        console.log('Institution ID:', data.institutionId);
        console.log('Has Password:', !!data.password);
        console.log('Password:', data.password ? '***' + data.password.slice(-3) : 'None');
        console.log('Onboarding Complete:', data.onboardingComplete);
        console.log('Status:', data.status);
        console.log('---');
      });
    }
    
    // Check caregivers collection
    const caregiversSnapshot = await db.collection('caregivers')
      .where('email', '==', email)
      .get();
    
    if (caregiversSnapshot.empty) {
      console.log('\n❌ No caregiver found in caregivers collection');
    } else {
      console.log(`\n✅ Found ${caregiversSnapshot.size} caregiver(s) in caregivers collection:\n`);
      caregiversSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Caregiver ID:', doc.id);
        console.log('Email:', data.email);
        console.log('Name:', data.name);
        console.log('User Type:', data.userType);
        console.log('Institution ID:', data.institutionId);
        console.log('Status:', data.status);
        console.log('---');
      });
    }
    
    // Check Firebase Auth
    try {
      const authUser = await admin.auth().getUserByEmail(email);
      console.log('\n✅ Firebase Auth account exists:');
      console.log('UID:', authUser.uid);
      console.log('Email:', authUser.email);
      console.log('Email Verified:', authUser.emailVerified);
      console.log('Disabled:', authUser.disabled);
    } catch (authError) {
      console.log('\n❌ No Firebase Auth account found');
      console.log('Error:', authError.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkCaregiverUser();

