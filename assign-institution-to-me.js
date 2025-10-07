const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, doc, updateDoc, addDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "elderx-f5c2b.firebaseapp.com",
  projectId: "elderx-f5c2b",
  storageBucket: "elderx-f5c2b.firebasestorage.app",
  messagingSenderId: "987610993096",
  appId: "1:987610993096:web:97c82732772d1223d3f0fd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const YOUR_EMAIL = 'onyedika.akoma@gmail.com';
const YOUR_PASSWORD = 'superadmin123'; // Change if different

(async () => {
  try {
    console.log('🔐 Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, YOUR_EMAIL, YOUR_PASSWORD);
    const user = userCredential.user;
    console.log('✅ Signed in as:', user.email);
    
    // Check if institutions exist
    console.log('📋 Checking for institutions...');
    const institutionsSnapshot = await getDocs(collection(db, 'institutions'));
    
    let institutionId;
    
    if (institutionsSnapshot.empty) {
      console.log('🏗️ No institutions found. Creating one...');
      
      const newInstitution = {
        name: 'Test Healthcare Institution',
        domain: 'test.healthcare.com',
        slug: 'test-healthcare',
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const institutionRef = await addDoc(collection(db, 'institutions'), newInstitution);
      institutionId = institutionRef.id;
      console.log('✅ Created institution:', institutionId);
      
      // Create a license for this institution
      const license = {
        institutionId,
        plan: 'enterprise',
        seats: 100,
        startsAt: Timestamp.now(),
        endsAt: Timestamp.fromDate(new Date('2026-12-31')),
        features: {},
        status: 'active',
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'licenses'), license);
      console.log('✅ Created license for institution');
      
    } else {
      // Use the first institution
      const firstInstitution = institutionsSnapshot.docs[0];
      institutionId = firstInstitution.id;
      console.log('✅ Found existing institution:', institutionId, '-', firstInstitution.data().name);
    }
    
    // Update user profile with institutionId
    console.log('📝 Updating your user profile...');
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      institutionId,
      institutionAdmin: true,
      type: 'admin',
      userType: 'admin',
      role: 'admin',
      updatedAt: Timestamp.now()
    });
    
    console.log('✅ Successfully assigned you to institution:', institutionId);
    console.log('');
    console.log('🎉 ALL DONE!');
    console.log('💡 Please refresh your browser (hard refresh: Ctrl+Shift+R)');
    console.log('💡 You can now access /institution-admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

