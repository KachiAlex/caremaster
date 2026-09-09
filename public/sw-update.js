// Force service worker update on every page load.
// This runs BEFORE the React bundle and ensures the browser always
// checks for a new sw.js (bypassing the 24-hour HTTP cache).
(function () {
  if ('serviceWorker' in navigator) {
    // Check for SW updates immediately
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (reg) {
        // Force update check
        reg.update().then(function() {
          // If there's a waiting worker, force it to activate
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function () {});
    
    // Also listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      // New service worker has taken control - reload to get fresh assets
      window.location.reload();
    });
  }
})();
