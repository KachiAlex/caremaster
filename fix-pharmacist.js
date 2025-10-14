const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBxH5xQJxQJxQJxQJxQJxQJxQJxQJxQJxQ",
  authDomain: "elderx-f5c2b.firebaseapp.com",
  projectId: "elderx-f5c2b",
  storageBucket: "elderx-f5c2b.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixPharmacist() {
  try {
    console.log('🔧 Fixing jaypharm@bulah.com user type...');
    
    const userId = 'Rrd9XfBGcOPKhvaboHvFMbTVXAV2';
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      userType: 'pharmacist',
      type: 'pharmacist',
      institutionId: 'YlRg0VHMK9BrvPQuYXqm',
      status: 'active',
      active: true,
      name: 'Jay Pharm',
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Successfully updated jaypharm@bulah.com to pharmacist!');
    console.log('📋 Updated fields:');
    console.log('   - userType: "elderly" → "pharmacist"');
    console.log('   - type: undefined → "pharmacist"');
    console.log('   - institutionId: undefined → "YlRg0VHMK9BrvPQuYXqm"');
    console.log('   - status: undefined → "active"');
    console.log('   - active: undefined → true');
    console.log('   - name: "User" → "Jay Pharm"');
    
  } catch (error) {
    console.error('❌ Error updating pharmacist:', error);
  }
}

fixPharmacist();
