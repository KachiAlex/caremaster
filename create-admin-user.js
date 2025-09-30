// Script to create an admin user
// Run this in your browser console on the ElderX website

async function createAdminUser() {
  try {
    // Import Firebase functions (these should already be available)
    const { createUserWithEmailAndPassword } = firebase.auth;
    const { doc, setDoc } = firebase.firestore;
    
    const email = prompt("Enter admin email:");
    const password = prompt("Enter admin password:");
    
    if (!email || !password) {
      alert("Email and password are required!");
      return;
    }
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(firebase.auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore with admin role
    await setDoc(doc(firebase.firestore, 'users', user.uid), {
      uid: user.uid,
      email: email,
      displayName: email.split('@')[0],
      userType: 'admin',
      type: 'admin',
      role: 'admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    });
    
    alert(`Admin user created successfully!\nEmail: ${email}\nUID: ${user.uid}\n\nYou can now log in to the admin portal.`);
    
    // Redirect to admin login
    window.location.href = '/admin/login';
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    alert(`Error creating admin user: ${error.message}`);
  }
}

// Run the function
createAdminUser();
