/**
 * Script to directly update Firestore database
 * Forces all institution links to use UltimateCare domain
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You may need to download this

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ultimatecare-2025'
  });
}

const db = admin.firestore();

async function fixAllInstitutionLinks() {
  try {
    console.log('🔍 Fetching all institutions from Firestore...');
    const institutionsSnapshot = await db.collection('institutions').get();
    
    if (institutionsSnapshot.empty) {
      console.log('ℹ️ No institutions found');
      return;
    }

    console.log(`📋 Found ${institutionsSnapshot.size} institutions`);
    
    const batch = db.batch();
    let updateCount = 0;
    const CORRECT_BASE_URL = 'https://ultimatecare-2025.web.app';

    institutionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const institutionId = doc.id;
      
      // Generate correct links
      const correctAccessLink = `${CORRECT_BASE_URL}/onboard?institution=${institutionId}`;
      const correctLoginLink = `${CORRECT_BASE_URL}/institution/login?institution=${institutionId}`;
      
      // Check if update is needed
      const needsUpdate = 
        data.accessLink !== correctAccessLink || 
        data.loginLink !== correctLoginLink ||
        data.accessLink?.includes('elderx') ||
        data.loginLink?.includes('elderx');
      
      if (needsUpdate) {
        console.log(`🔧 Updating institution ${institutionId} (${data.name}):`);
        console.log(`   Old accessLink: ${data.accessLink}`);
        console.log(`   New accessLink: ${correctAccessLink}`);
        console.log(`   Old loginLink: ${data.loginLink}`);
        console.log(`   New loginLink: ${correctLoginLink}`);
        
        batch.update(doc.ref, {
          accessLink: correctAccessLink,
          loginLink: correctLoginLink,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      } else {
        console.log(`✅ Institution ${institutionId} (${data.name}) already has correct links`);
      }
    });

    if (updateCount > 0) {
      console.log(`\n💾 Committing ${updateCount} updates to Firestore...`);
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} institutions in database!`);
    } else {
      console.log('ℹ️ All institutions already have correct links');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating institutions:', error);
    process.exit(1);
  }
}

// Run the fix
fixAllInstitutionLinks();

