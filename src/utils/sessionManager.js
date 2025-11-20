/**
 * Session Manager - Handles multi-tab authentication conflicts
 * 
 * Firebase Auth is shared across all tabs, but we need role-specific sessions.
 * This utility uses sessionStorage (tab-specific) to track the expected role
 * and detects when auth state conflicts with the current tab's role.
 */

const SESSION_ROLE_KEY = 'UltimateCare_tab_role';
const SESSION_USER_ID_KEY = 'UltimateCare_tab_user_id';
const SESSION_INSTITUTION_KEY = 'UltimateCare_tab_institution';

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
  
  // User ID mismatch - different user logged in (this is a real conflict)
  if (currentUser.uid !== tabSession.userId) {
    console.log(`⚠️ User mismatch: expected ${tabSession.userId}, got ${currentUser.uid}`);
    return { 
      valid: false, 
      reason: 'user_mismatch',
      expectedUserId: tabSession.userId,
      currentUserId: currentUser.uid
    };
  }
  
  // For role mismatch, be more lenient - allow same user with different role interpretations
  // This happens when userType, type, and role fields are inconsistent
  if (currentUserRole && currentUserRole !== tabSession.role) {
    console.log(`⚠️ Role mismatch: expected ${tabSession.role}, got ${currentUserRole}`);
    
    // Check if this is just a role interpretation difference (same user, different field)
    const roleEquivalents = {
      'caregiver': ['caregiver', 'nurse', 'doctor'],
      'nurse': ['caregiver', 'nurse'],
      'doctor': ['caregiver', 'doctor'],
      'pharmacist': ['pharmacist'],
      'admin': ['admin', 'institutionAdmin'],
      'institutionAdmin': ['admin', 'institutionAdmin']
    };
    
    const currentRoleEquivalents = roleEquivalents[currentUserRole] || [currentUserRole];
    const expectedRoleEquivalents = roleEquivalents[tabSession.role] || [tabSession.role];
    
    // If roles are equivalent, update the session instead of treating as conflict
    if (currentRoleEquivalents.some(role => expectedRoleEquivalents.includes(role))) {
      console.log('🔄 Role equivalents detected - updating session');
      return { valid: true, needsUpdate: true, newRole: currentUserRole };
    }
    
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
  
  console.log('🚨 Session conflict detected:', validation);
  
  switch (validation.reason) {
    case 'logged_out':
      console.log('🔄 User logged out - clearing session');
      clearTabSession();
      toast.warning('Session expired. Please log in again.');
      navigate('/institution/login');
      break;
      
    case 'user_mismatch':
      console.log('🔄 Different user in another tab - clearing session');
      clearTabSession();
      toast.error('⚠️ Different user logged in another tab. This tab has been reset.');
      setTimeout(() => navigate('/institution/login'), 1500);
      break;
      
    case 'role_mismatch':
      console.log('🔄 Role mismatch - redirecting to correct dashboard');
      clearTabSession();
      toast.warning(`⚠️ You logged in as ${validation.currentRole} in another tab. Redirecting...`);
      const correctPath = getRoleDashboardPath(validation.currentRole);
      setTimeout(() => {
        navigate(correctPath);
      }, 1500);
      break;
      
    default:
      console.log('🔄 Unknown session conflict - clearing session');
      clearTabSession();
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

/**
 * Check if session validation should be bypassed (for development or recovery)
 */
export const shouldBypassSessionValidation = () => {
  // Check for bypass flag in sessionStorage (for development)
  const bypassFlag = sessionStorage.getItem('UltimateCare_bypass_session_validation');
  return bypassFlag === 'true';
};

/**
 * Set session validation bypass (for development)
 */
export const setSessionValidationBypass = (bypass = true) => {
  if (bypass) {
    sessionStorage.setItem('UltimateCare_bypass_session_validation', 'true');
    console.log('🔧 Session validation bypass enabled');
  } else {
    sessionStorage.removeItem('UltimateCare_bypass_session_validation');
    console.log('🔧 Session validation bypass disabled');
  }
};

/**
 * Enhanced session validation with bypass option
 */
export const validateTabSessionEnhanced = (currentUser, currentUserRole) => {
  // Check if validation should be bypassed
  if (shouldBypassSessionValidation()) {
    console.log('🔧 Session validation bypassed');
    return { valid: true, bypassed: true };
  }
  
  // Run normal validation
  return validateTabSession(currentUser, currentUserRole);
};

export default {
  setTabSession,
  getTabSession,
  clearTabSession,
  validateTabSession,
  validateTabSessionEnhanced,
  getRoleDashboardPath,
  handleSessionConflict,
  navigateToRoleDashboard,
  shouldBypassSessionValidation,
  setSessionValidationBypass
};

