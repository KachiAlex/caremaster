# Force Update Institution Links

## Quick Fix - Run from Browser Console

1. Go to: https://elderx-f5c2b.web.app/super-admin
2. Log in as super-admin
3. Press **F12** to open DevTools
4. Go to **Console** tab
5. Paste this code and press Enter:

```javascript
// Force update all institution links
(async () => {
  try {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
    const { initializeApp, getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    
    const functions = getFunctions(getApp(), 'us-central1');
    const migrateLinks = httpsCallable(functions, 'migrateInstitutionLinksFunction');
    
    console.log('🔄 Starting force migration...');
    const result = await migrateLinks({ force: true });
    
    console.log('✅ Success!', result.data);
    alert(`Migration complete! Updated ${result.data.updatedCount} institutions.`);
    
    // Refresh the page to see updated links
    window.location.reload();
  } catch (error) {
    console.error('❌ Error:', error);
    alert('Error: ' + error.message);
  }
})();
```

## OR - Click the Button

Just click the purple **"🔄 Force Update Links"** button on the super-admin page!

It should update all institutions to use `/onboard?institution=xxx` format.

