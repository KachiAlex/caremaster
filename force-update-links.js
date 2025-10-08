const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

admin.initializeApp({
  credential: applicationDefault(),
  projectId: 'elderx-f5c2b'
});

const db = admin.firestore();

(async () => {
  try {
    console.log('🔄 Force updating all institution links...');
    
    const baseURL = 'https://elderx-f5c2b.web.app';
    const institutionsSnapshot = await db.collection('institutions').get();
    
    if (institutionsSnapshot.empty) {
      console.log('ℹ️ No institutions found');
      process.exit(0);
    }
    
    console.log(`📋 Found ${institutionsSnapshot.size} institutions`);
    
    const batch = db.batch();
    let updatedCount = 0;
    
    institutionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const slug = data.slug || `${data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${doc.id.substring(0, 8)}`;
      const accessLink = `${baseURL}/onboard?institution=${doc.id}`;
      const loginLink = `${baseURL}/institution/login?institution=${doc.id}`;
      
      console.log(`  Updating: ${data.name} (${doc.id})`);
      console.log(`    Old link: ${data.accessLink || 'none'}`);
      console.log(`    New link: ${accessLink}`);
      
      batch.update(doc.ref, {
        slug,
        accessLink,
        loginLink,
        updatedAt: admin.firestore.Timestamp.now()
      });
      updatedCount++;
    });
    
    await batch.commit();
    
    console.log('');
    console.log(`✅ Successfully updated ${updatedCount} institutions!`);
    console.log('💡 All institution links now point to /onboard format');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

