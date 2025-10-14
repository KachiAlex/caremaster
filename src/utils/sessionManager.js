/**
 * Session Manager - Handles multi-tab authentication conflicts
 * 
 * Firebase Auth is shared across all tabs, but we need role-specific sessions.
 * This utility uses sessionStorage (tab-specific) to track the expected role
 * and detects when auth state conflicts with the current tab's role.
 */

const SESSION_ROLE_KEY = 'elderx_tab_role';
const SESSION_USER_ID_KEY = 'elderx_tab_user_id';
const SESSION_INSTITUTION_KEY = 'elderx_tab_institution';

/**
 * Set the current tab's role session
 */
export const setTabSession = (role, userId, institutionId = null) => {
  sessionStorage.setItem(SESSION_ROLE_KEY, role);
  sessionStorage.setItem(SESSION_USER_ID_KEY, userId);
  if (institutionId) {
    sessionStorage.setItem(SESSION_INSTITUTION_KEY, institutionId);
  }
  console.log(`🔐 Tab session set: role=${role}, userId=${userId}, institution=${institutionId}`);
};

/**
 * Get the current tab's role session
 */
export const getTabSession = () => {
  return {
    role: sessionStorage.getItem(SESSION_ROLE_KEY),
    userId: sessionStorage.getItem(SESSION_USER_ID_KEY),
    institutionId: sessionStorage.getItem(SESSION_INSTITUTION_KEY)
  };
};

/**
 * Clear the current tab's session
 */
export const clearTabSession = () => {
  sessionStorage.removeItem(SESSION_ROLE_KEY);
  sessionStorage.removeItem(SESSION_USER_ID_KEY);
  sessionStorage.removeItem(SESSION_INSTITUTION_KEY);
  console.log('🔓 Tab session cleared');
};

/**
 * Check if the current Firebase user matches this tab's expected session
 */
export const validateTabSession = (currentUser, currentUserRole) => {
  const tabSession = getTabSession();
  
  // No tab session set yet - first load
  if (!tabSession.role || !tabSession.userId) {
    console.log('📝 No tab session found - initializing...');
    return { valid: true, needsInit: true };
  }
  
  // No current user - logged out
  if (!currentUser) {
    console.log('⚠️ No current user - session invalid');
    return { valid: false, reason: 'logged_out' };
  }
  
  // User ID mismatch - different user logged in
  if (currentUser.uid !== tabSession.userId) {
    console.log(`⚠️ User mismatch: expected ${tabSession.userId}, got ${currentUser.uid}`);
    return { 
      valid: false, 
      reason: 'user_mismatch',
      expectedUserId: tabSession.userId,
      currentUserId: currentUser.uid
    };
  }
  
  // Role mismatch - same user but different role
  if (currentUserRole && currentUserRole !== tabSession.role) {
    console.log(`⚠️ Role mismatch: expected ${tabSession.role}, got ${currentUserRole}`);
    return { 
      valid: false, 
      reason: 'role_mismatch',
      expectedRole: tabSession.role,
      currentRole: currentUserRole
    };
  }
  
  console.log('✅ Tab session valid');
  return { valid: true };
};

/**
 * Get role-specific dashboard path
 */
export const getRoleDashboardPath = (role, institutionId = null) => {
  const institutionParam = institutionId ? `?institution=${institutionId}` : '';
  
  switch (role) {
    case 'admin':
    case 'institutionAdmin':
      return `/institution-admin/dashboard${institutionParam}`;
    case 'caregiver':
    case 'nurse':
      return `/institution-caregiver/dashboard${institutionParam}`;
    case 'doctor':
      return `/institution-caregiver/dashboard${institutionParam}`;
    case 'pharmacist':
      return `/institution-pharmacy/dashboard${institutionParam}`;
    case 'superAdmin':
      return '/super-admin/dashboard';
    default:
      return '/';
  }
};

/**
 * Handle session conflict - redirect to correct dashboard or login
 */
export const handleSessionConflict = (validation, navigate, toast) => {
  if (validation.valid) return true;
  
  clearTabSession();
  
  switch (validation.reason) {
    case 'logged_out':
      toast.warning('Session expired. Please log in again.');
      navigate('/institution/login');
      break;
      
    case 'user_mismatch':
      toast.error('⚠️ Multi-Tab Conflict: Different user logged in another tab. This tab has been reset.');
      setTimeout(() => navigate('/institution/login'), 2000);
      break;
      
    case 'role_mismatch':
      toast.warning(`⚠️ Multi-Tab Conflict: You logged in as ${validation.currentRole} in another tab. Redirecting to correct dashboard...`);
      const correctPath = getRoleDashboardPath(validation.currentRole, validation.institutionId);
      setTimeout(() => navigate(correctPath), 2000);
      break;
      
    default:
      toast.error('Session conflict detected. Please log in again.');
      navigate('/institution/login');
  }
  
  return false;
};

/**
 * Navigate to role-specific dashboard and set session
 */
export const navigateToRoleDashboard = (role, userId, institutionId, navigate) => {
  // Set tab session
  setTabSession(role, userId, institutionId);
  
  // Navigate to appropriate dashboard
  const path = getRoleDashboardPath(role, institutionId);
  navigate(path);
};

export default {
  setTabSession,
  getTabSession,
  clearTabSession,
  validateTabSession,
  getRoleDashboardPath,
  handleSessionConflict,
  navigateToRoleDashboard
};

