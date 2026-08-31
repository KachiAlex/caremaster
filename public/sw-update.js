// Force service worker update on every page load.
// This runs BEFORE the React bundle and ensures the browser always
// checks for a new sw.js (bypassing the 24-hour HTTP cache).
(function () {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (reg) {
        reg.update();
      });
    }).catch(function () {});
  }
})();
