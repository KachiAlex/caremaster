// Script to fix user roles in Firestore
// Run this in the browser console on your admin dashboard

const fixUserRoles = async () => {
  console.log('🔧 Fixing user roles...');
  
  try {
    const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('./src/firebase/config.js');
    
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${usersSnapshot.size} users`);
    
    const updates = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`👤 Checking user: ${userData.email || userId}`);
      console.log(`   Current userType: ${userData.userType}`);
      console.log(`   Current type: ${userData.type}`);
      
      // Fix common role issues
      let needsUpdate = false;
      const updates = {};
      
      // If userType is 'caregiver' but they should be admin
      if (userData.email && userData.email.includes('admin')) {
        if (userData.userType !== 'admin') {
          updates.userType = 'admin';
          updates.type = 'admin';
          needsUpdate = true;
          console.log(`   ⚠️  Should be admin - fixing...`);
        }
      }
      
      // If userType is missing but type exists
      if (!userData.userType && userData.type) {
        updates.userType = userData.type;
        needsUpdate = true;
        console.log(`   ⚠️  Missing userType - copying from type...`);
      }
      
      // If type is missing but userType exists
      if (!userData.type && userData.userType) {
        updates.type = userData.userType;
        needsUpdate = true;
        console.log(`   ⚠️  Missing type - copying from userType...`);
      }
      
      if (needsUpdate) {
        updateDoc(doc(db, 'users', userId), updates)
          .then(() => {
            console.log(`   ✅ Updated user ${userId}`);
          })
          .catch((error) => {
            console.error(`   ❌ Failed to update user ${userId}:`, error);
          });
      } else {
        console.log(`   ✅ User role is correct`);
      }
    });
    
    console.log('🎉 Role fixing complete! Refresh the page to see changes.');
    
  } catch (error) {
    console.error('❌ Error fixing user roles:', error);
  }
};

// Run the fix function
fixUserRoles();
