/**
 * User Role Constants
 * 
 * These are the standard role values used across the application.
 * Always use these constants when checking or setting user roles.
 */

export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PHARMACIST: 'pharmacist',
  CAREGIVER: 'caregiver',
  CLIENT: 'client',
  PHYSIOTHERAPIST: 'physiotherapist',
  PSYCHOLOGIST: 'psychologist',
  LAB_TECHNICIAN: 'lab-technician'
};

/**
 * Medical Qualification Templates
 * Used for additional context beyond the role
 */
export const MEDICAL_QUALIFICATIONS = {
  DOCTOR: 'Doctor (MD)',
  DOCTOR_SPECIALIST: 'Doctor (MD - Specialist)',
  NURSE_RN: 'Nurse (RN)',
  NURSE_LPN: 'Nurse (LPN)',
  PHARMACIST: 'Pharmacist',
  PHYSIOTHERAPIST: 'Physiotherapist',
  PSYCHOLOGIST: 'Psychologist',
  LAB_TECH: 'Lab Technician',
  CAREGIVER: 'Caregiver (Non-Medical)'
};

/**
 * Check if a user has a specific role
 * @param {Object} userProfile - User profile object
 * @param {string} role - Role to check (use ROLES constant)
 * @returns {boolean}
 */
export const hasRole = (userProfile, role) => {
  if (!userProfile) return false;
  
  // Primary check: role field (standardized)
  if (userProfile.role === role) return true;
  
  // Fallback checks for backward compatibility
  if (userProfile.userType === role) return true;
  if (userProfile.type === role) return true;
  
  // Special case: check medicalQualification for doctors and nurses
  if (role === ROLES.DOCTOR && userProfile.medicalQualification?.includes('Doctor')) return true;
  if (role === ROLES.NURSE && userProfile.medicalQualification?.includes('Nurse')) return true;
  
  return false;
};

/**
 * Check if user has any of the specified roles
 * @param {Object} userProfile - User profile object
 * @param {Array<string>} roles - Array of roles to check
 * @returns {boolean}
 */
export const hasAnyRole = (userProfile, roles) => {
  return roles.some(role => hasRole(userProfile, role));
};

/**
 * Get the primary role of a user
 * @param {Object} userProfile - User profile object
 * @returns {string|null}
 */
export const getPrimaryRole = (userProfile) => {
  if (!userProfile) return null;
  
  // Priority: role > userType > type > medicalQualification inference
  if (userProfile.role) return userProfile.role;
  if (userProfile.userType) return userProfile.userType;
  if (userProfile.type) return userProfile.type;
  
  // Infer from medicalQualification
  if (userProfile.medicalQualification?.includes('Doctor')) return ROLES.DOCTOR;
  if (userProfile.medicalQualification?.includes('Nurse')) return ROLES.NURSE;
  
  return null;
};

/**
 * Check if user is a medical professional (doctor or nurse)
 * @param {Object} userProfile - User profile object
 * @returns {boolean}
 */
export const isMedicalProfessional = (userProfile) => {
  return hasAnyRole(userProfile, [ROLES.DOCTOR, ROLES.NURSE]);
};

/**
 * Get user-friendly role display name
 * @param {string} role - Role constant
 * @returns {string}
 */
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.DOCTOR]: 'Doctor',
    [ROLES.NURSE]: 'Nurse',
    [ROLES.PHARMACIST]: 'Pharmacist',
    [ROLES.CAREGIVER]: 'Caregiver',
    [ROLES.CLIENT]: 'Client',
    [ROLES.PHYSIOTHERAPIST]: 'Physiotherapist',
    [ROLES.PSYCHOLOGIST]: 'Psychologist',
    [ROLES.LAB_TECHNICIAN]: 'Lab Technician'
  };
  
  return displayNames[role] || role;
};

