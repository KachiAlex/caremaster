/**
 * Multi-Role Authentication Manager
 * 
 * This utility manages authentication for different user roles in separate browser contexts.
 * It uses sessionStorage to maintain role-specific auth states, allowing multiple roles
 * to be logged in simultaneously in different tabs/windows.
 */

import { auth } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  onAuthStateChanged
} from 'firebase/auth';

// Storage keys for different roles
const STORAGE_KEYS = {
  SUPER_ADMIN: 'elderx_super_admin_session',
  ADMIN: 'elderx_admin_session',
  CAREGIVER: 'elderx_caregiver_session',
  DOCTOR: 'elderx_doctor_session',
  NURSE: 'elderx_nurse_session',
  PHARMACIST: 'elderx_pharmacist_session',
  CLIENT: 'elderx_client_session',
  CURRENT_ROLE: 'elderx_current_role'
};

// Get the storage key for a specific role
const getStorageKey = (role) => {
  const normalizedRole = role?.toUpperCase().replace(/-/g, '_');
  return STORAGE_KEYS[normalizedRole] || STORAGE_KEYS.CLIENT;
};

// Store auth session data for a specific role
export const storeRoleSession = (role, sessionData) => {
  try {
    const key = getStorageKey(role);
    sessionStorage.setItem(key, JSON.stringify({
      ...sessionData,
      timestamp: Date.now(),
      role
    }));
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
    console.log(`✅ Stored session for role: ${role}`);
  } catch (error) {
    console.error('Error storing role session:', error);
  }
};

// Get auth session data for a specific role
export const getRoleSession = (role) => {
  try {
    const key = getStorageKey(role);
    const data = sessionStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Check if session is still valid (24 hours)
    const isValid = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
    if (!isValid) {
      clearRoleSession(role);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Error getting role session:', error);
    return null;
  }
};

// Clear auth session for a specific role
export const clearRoleSession = (role) => {
  try {
    const key = getStorageKey(role);
    sessionStorage.removeItem(key);
    console.log(`🗑️ Cleared session for role: ${role}`);
  } catch (error) {
    console.error('Error clearing role session:', error);
  }
};

// Get the currently active role
export const getCurrentRole = () => {
  return sessionStorage.getItem(STORAGE_KEYS.CURRENT_ROLE);
};

// Clear all role sessions
export const clearAllSessions = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    sessionStorage.removeItem(key);
  });
  console.log('🗑️ Cleared all role sessions');
};

/**
 * Sign in with role-specific persistence
 * This allows different roles to maintain separate sessions
 */
export const signInWithRole = async (email, password, role) => {
  try {
    console.log(`🔐 Signing in as ${role}...`);
    
    // Use session persistence for role-based logins
    // This ensures the auth state is maintained per tab/window
    await setPersistence(auth, browserSessionPersistence);
    
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Store the session data for this role
    storeRoleSession(role, {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName,
      lastSignIn: Date.now()
    });
    
    console.log(`✅ Successfully signed in as ${role}`);
    return userCredential;
  } catch (error) {
    console.error(`❌ Error signing in as ${role}:`, error);
    throw error;
  }
};

/**
 * Sign out from current role
 */
export const signOutFromRole = async (role) => {
  try {
    console.log(`🚪 Signing out from ${role}...`);
    
    // Clear the role session
    clearRoleSession(role);
    
    // Only sign out from Firebase if this is the current active session
    const currentRole = getCurrentRole();
    if (currentRole === role) {
      await signOut(auth);
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_ROLE);
    }
    
    console.log(`✅ Successfully signed out from ${role}`);
  } catch (error) {
    console.error(`❌ Error signing out from ${role}:`, error);
    throw error;
  }
};

/**
 * Check if a specific role has an active session
 */
export const hasActiveSession = (role) => {
  const session = getRoleSession(role);
  return session !== null;
};

/**
 * Switch to a different role's session
 * This is useful when you want to switch between already-authenticated roles
 */
export const switchToRole = async (role) => {
  try {
    const session = getRoleSession(role);
    if (!session) {
      console.warn(`⚠️ No active session found for role: ${role}`);
      return false;
    }
    
    console.log(`🔄 Switching to ${role} session...`);
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, role);
    
    // Reload the page to apply the new role context
    window.location.reload();
    
    return true;
  } catch (error) {
    console.error(`❌ Error switching to ${role}:`, error);
    return false;
  }
};

/**
 * Initialize auth manager for the current page
 * This should be called on app initialization
 */
export const initializeAuthManager = () => {
  console.log('🚀 Initializing Auth Manager...');
  
  // Set up auth state listener
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      const currentRole = getCurrentRole();
      if (currentRole) {
        console.log(`👤 User authenticated for role: ${currentRole}`);
        
        // Update the session timestamp
        const session = getRoleSession(currentRole);
        if (session) {
          storeRoleSession(currentRole, {
            ...session,
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          });
        }
      }
    } else {
      console.log('👤 No user authenticated');
    }
  });
  
  return unsubscribe;
};

/**
 * Get debug information about all active sessions
 */
export const getSessionDebugInfo = () => {
  const sessions = {};
  Object.entries(STORAGE_KEYS).forEach(([role, key]) => {
    if (role !== 'CURRENT_ROLE') {
      const session = getRoleSession(role.toLowerCase());
      sessions[role] = session ? {
        email: session.email,
        uid: session.uid?.substring(0, 8) + '...',
        timestamp: new Date(session.timestamp).toLocaleString()
      } : null;
    }
  });
  
  return {
    currentRole: getCurrentRole(),
    activeSessions: sessions
  };
};

export default {
  signInWithRole,
  signOutFromRole,
  storeRoleSession,
  getRoleSession,
  clearRoleSession,
  clearAllSessions,
  getCurrentRole,
  hasActiveSession,
  switchToRole,
  initializeAuthManager,
  getSessionDebugInfo
};

