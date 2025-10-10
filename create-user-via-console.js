// Run this script in your BROWSER CONSOLE while on the ElderX site
// This will create the user for chinyere@bulah.com

(async function createUser() {
  try {
    console.log('🔧 Creating user: chinyere@bulah.com\n');
    
    // Import Firebase (should already be available)
    const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { auth, db } = window;
    
    const userData = {
      email: 'chinyere@bulah.com',
      password: 'BulahCare2024!',
      name: 'Chinyere Bulah',
      institutionId: 'bulah-health-care-YlRg0VHM',
      role: 'nurse'
    };
    
    // Create Firebase Auth user
    console.log('1️⃣ Creating Firebase Auth account...');
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    
    console.log('✅ Auth account created:', userCredential.user.uid);
    
    // Create Firestore document
    console.log('2️⃣ Creating Firestore document...');
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: userData.email,
      name: userData.name,
      displayName: userData.name,
      userType: userData.role,
      type: userData.role,
      role: userData.role,
      institutionId: userData.institutionId,
      status: 'active',
      onboardingComplete: false,
      onboardingStep: 0,
      password: userData.password,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Firestore document created');
    
    // Create caregiver document
    console.log('3️⃣ Creating caregiver document...');
    await setDoc(doc(db, 'caregivers', userCredential.user.uid), {
      id: userCredential.user.uid,
      uid: userCredential.user.uid,
      name: userData.name,
      email: userData.email,
      userType: userData.role,
      institutionId: userData.institutionId,
      status: 'active',
      specialization: 'General Care',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Caregiver document created');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📧 Email: chinyere@bulah.com');
    console.log('🔑 Password: BulahCare2024!');
    console.log('👤 Name: Chinyere Bulah');
    console.log('🎭 Role: nurse');
    console.log('🏢 Institution: bulah-health-care-YlRg0VHM');
    console.log('🆔 UID:', userCredential.user.uid);
    console.log('\n🔗 Login URL:');
    console.log('https://elderx-f5c2b.web.app/institution/login?institution=bulah-health-care-YlRg0VHM&role=caregiver');
    console.log('\n✅ User can now login!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.log('\n⚠️ User already exists! Try logging in.');
    }
  }
})();

