// Debug script to check users in Firestore
// Run this in the browser console on your admin dashboard

const debugUsers = async () => {
  console.log('🔍 Debugging users in Firestore...');
  
  try {
    // Import Firebase functions (these should be available in your app)
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('./src/firebase/config.js');
    
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Total users found: ${usersSnapshot.size}`);
    
    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        name: userData.name,
        userType: userData.userType,
        type: userData.type,
        medicalQualification: userData.medicalQualification,
        status: userData.status
      });
    });
    
    console.log('👥 All users:', users);
    
    // Check for caregivers/doctors
    const caregivers = users.filter(u => 
      u.userType === 'caregiver' || 
      u.type === 'caregiver' || 
      u.userType === 'doctor' || 
      u.type === 'doctor' || 
      u.medicalQualification
    );
    
    console.log(`🏥 Caregivers/Doctors found: ${caregivers.length}`);
    console.log('👨‍⚕️ Caregivers/Doctors:', caregivers);
    
    // Check current user
    const { auth } = await import('firebase/auth');
    const currentUser = auth.currentUser;
    if (currentUser) {
      const currentUserData = users.find(u => u.id === currentUser.uid);
      console.log('🔐 Current user:', {
        uid: currentUser.uid,
        email: currentUser.email,
        userData: currentUserData
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging users:', error);
  }
};

// Run the debug function
debugUsers();
