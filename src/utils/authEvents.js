/**
 * Global auth-expired handler.
 *
 * database.js calls this function when it receives a 401/403 so the app can
 * sign the user out and redirect without the API layer knowing about routing.
 *
 * The function is set by App.js when the router is available.
 */
let authExpiredHandler = null;

export function setAuthExpiredHandler(handler) {
  authExpiredHandler = handler;
}

export function getAuthExpiredHandler() {
  return authExpiredHandler;
}

export function onAuthExpired() {
  if (authExpiredHandler) {
    authExpiredHandler();
  }
}
