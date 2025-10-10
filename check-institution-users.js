// Script to check what users exist in your Firestore database
// Run: node check-institution-users.js

const admin = require('firebase-admin');
const serviceAccount = require('./elderx-f5c2b-firebase-adminsdk.json'); // You'll need this file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in Firestore...\n');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`📊 Total users found: ${usersSnapshot.size}\n`);
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in database!\n');
      console.log('💡 You need to create users first.\n');
      return;
    }
    
    console.log('👥 Users in database:\n');
    console.log('━'.repeat(80));
    
    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      console.log(`
📧 Email: ${user.email || 'N/A'}
👤 Name: ${user.name || user.displayName || 'N/A'}
🎭 Role: ${user.userType || user.type || 'N/A'}
🏢 Institution: ${user.institutionId || 'N/A'}
📝 Status: ${user.status || 'N/A'}
🆔 UID: ${doc.id}
      `);
      console.log('─'.repeat(80));
    });
    
    // Check for specific email
    console.log('\n🔎 Searching for: chinyere@bulah.com');
    const chinQuery = await db.collection('users')
      .where('email', '==', 'chinyere@bulah.com')
      .get();
    
    if (chinQuery.empty) {
      console.log('❌ User chinyere@bulah.com NOT FOUND\n');
      console.log('💡 This user needs to be created in the database.\n');
    } else {
      console.log('✅ User chinyere@bulah.com FOUND!');
      chinQuery.forEach(doc => {
        console.log('User data:', doc.data());
      });
    }
    
    // Check for institution admins
    console.log('\n🛡️ Checking for institution admins...');
    const adminsQuery = await db.collection('users')
      .where('userType', '==', 'admin')
      .get();
    
    console.log(`Found ${adminsQuery.size} admin(s)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();

