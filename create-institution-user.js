// Script to create institution caregiver user
// Run: node create-institution-user.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you may need to adjust this path)
try {
  const serviceAccount = require('./elderx-f5c2b-firebase-adminsdk.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('⚠️  Service account file not found. Using default credentials.');
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

// User details
const USER_EMAIL = 'chinyere@bulah.com';
const USER_PASSWORD = 'BulahCare2024!'; // Change this if needed
const USER_NAME = 'Chinyere Bulah';
const INSTITUTION_ID = 'bulah-health-care-YlRg0VHM'; // Bulah Health Care institution
const USER_ROLE = 'nurse'; // or 'caregiver', 'doctor'

async function createInstitutionUser() {
  try {
    console.log('🔧 Creating institution user...\n');
    
    // Step 1: Create Firebase Auth user
    console.log('1️⃣  Creating Firebase Auth account...');
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: USER_EMAIL,
        password: USER_PASSWORD,
        displayName: USER_NAME,
        emailVerified: true
      });
      console.log('✅ Firebase Auth user created:', userRecord.uid);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.log('⚠️  User already exists in Firebase Auth');
        userRecord = await auth.getUserByEmail(USER_EMAIL);
        console.log('Using existing user:', userRecord.uid);
      } else {
        throw authError;
      }
    }
    
    // Step 2: Create/Update Firestore document
    console.log('\n2️⃣  Creating Firestore user document...');
    const userData = {
      uid: userRecord.uid,
      email: USER_EMAIL,
      name: USER_NAME,
      displayName: USER_NAME,
      userType: USER_ROLE,
      type: USER_ROLE,
      role: USER_ROLE,
      institutionId: INSTITUTION_ID,
      status: 'active',
      onboardingComplete: false,
      onboardingStep: 0,
      password: USER_PASSWORD, // Stored for custom auth
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      phone: '',
      medicalQualification: USER_ROLE === 'nurse' ? 'Registered Nurse' : '',
      specializations: [],
      documents: {}
    };
    
    await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
    console.log('✅ Firestore document created');
    
    // Step 3: Create caregiver document (optional)
    console.log('\n3️⃣  Creating caregiver document...');
    const caregiverData = {
      id: userRecord.uid,
      uid: userRecord.uid,
      name: USER_NAME,
      email: USER_EMAIL,
      userType: USER_ROLE,
      institutionId: INSTITUTION_ID,
      status: 'active',
      specialization: 'General Care',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('caregivers').doc(userRecord.uid).set(caregiverData, { merge: true });
    console.log('✅ Caregiver document created');
    
    // Success message
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 USER CREATED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log('\n📧 Email:', USER_EMAIL);
    console.log('🔑 Password:', USER_PASSWORD);
    console.log('👤 Name:', USER_NAME);
    console.log('🎭 Role:', USER_ROLE);
    console.log('🏢 Institution:', INSTITUTION_ID);
    console.log('🆔 UID:', userRecord.uid);
    console.log('\n🔗 Login URL:');
    console.log(`https://elderx-f5c2b.web.app/institution/login?institution=${INSTITUTION_ID}&role=caregiver`);
    console.log('\n💡 The user can now login and complete onboarding!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating user:', error);
    console.error('\nDetails:', error.message);
    process.exit(1);
  }
}

// Run the function
createInstitutionUser();

