import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

/**
 * Standardized user type mapping
 * Ensures consistent user classification across the system
 */
const USER_TYPE_MAPPINGS = {
  caregiver: {
    userType: 'caregiver',
    type: 'caregiver',
    roles: ['caregiver'],
    defaultStatus: 'active'
  },
  doctor: {
    userType: 'doctor',
    type: 'doctor',
    roles: ['doctor', 'caregiver'], // Doctors can also be caregivers
    defaultStatus: 'active',
    requiresMedicalLicense: true
  },
  nurse: {
    userType: 'nurse',
    type: 'nurse',
    roles: ['nurse', 'caregiver'], // Nurses can also be caregivers
    defaultStatus: 'active',
    requiresMedicalLicense: true
  },
  pharmacist: {
    userType: 'pharmacist',
    type: 'pharmacist',
    roles: ['pharmacist'],
    defaultStatus: 'active',
    requiresMedicalLicense: true
  },
  admin: {
    userType: 'admin',
    type: 'admin',
    roles: ['admin'],
    defaultStatus: 'active',
    adminTier: 'secondary' // Default to secondary admin
  },
  'primary-admin': {
    userType: 'admin',
    type: 'admin',
    roles: ['admin', 'primary-admin'],
    defaultStatus: 'active',
    adminTier: 'primary',
    cannotBeDeleted: true
  },
  'secondary-admin': {
    userType: 'admin',
    type: 'admin',
    roles: ['admin', 'secondary-admin'],
    defaultStatus: 'active',
    adminTier: 'secondary'
  },
  client: {
    userType: 'client',
    type: 'client',
    roles: ['client'],
    defaultStatus: 'active'
  },
  // Legacy mapping retained for backwards compatibility with existing "elderly" records.
  elderly: {
    userType: 'patient',
    type: 'patient',
    roles: ['patient'],
    defaultStatus: 'active'
  }
};

/**
 * Create a standardized user document
 * @param {Object} userData - User data from form
 * @param {Object} options - Additional options (institutionId, createdBy, etc.)
 * @returns {Object} - Standardized user document
 */
export function createStandardizedUserData(userData, options = {}) {
  const {
    userType,
    medicalQualification,
    firstName,
    lastName,
    email,
    phone,
    ...rest
  } = userData;

  // Determine the actual user type
  let effectiveUserType = userType || 'caregiver';
  
  // For healthcare workers with medical qualifications
  if (medicalQualification) {
    const qual = medicalQualification.toLowerCase();
    if (qual.includes('doctor') || qual.includes('physician') || qual.includes('md')) {
      effectiveUserType = 'doctor';
    } else if (qual.includes('nurse') || qual.includes('rn') || qual.includes('lpn')) {
      effectiveUserType = 'nurse';
    } else if (qual.includes('pharmacist')) {
      effectiveUserType = 'pharmacist';
    }
  }

  // Get the type mapping
  const typeMapping = USER_TYPE_MAPPINGS[effectiveUserType] || USER_TYPE_MAPPINGS.caregiver;

  // Build standardized user document
  const standardizedData = {
    id: options.uid,
    uid: options.uid, // Some parts of the app use uid
    
    // Name fields
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    displayName: `${firstName} ${lastName}`,
    
    // Contact
    email,
    phone: phone || '',
    
    // Core type fields - ALL THREE ARE SET
    userType: typeMapping.userType,
    type: typeMapping.type,
    role: typeMapping.userType, // Legacy support
    roles: [...typeMapping.roles], // Array of roles
    
    // Admin tier (if applicable)
    ...(typeMapping.adminTier && { 
      adminTier: typeMapping.adminTier,
      isPrimaryAdmin: typeMapping.adminTier === 'primary',
      cannotBeDeleted: typeMapping.cannotBeDeleted || false
    }),
    
    // Status
    status: typeMapping.defaultStatus,
    isActive: true,
    
    // Timestamps
    createdAt: serverTimestamp(),
    joinDate: serverTimestamp(),
    lastActive: serverTimestamp(),
    updatedAt: serverTimestamp(),
    
    // Medical qualification (for healthcare workers)
    ...(medicalQualification && { medicalQualification }),
    
    // Institution affiliation
    ...(options.institutionId && { institutionId: options.institutionId }),
    
    // Creator tracking
    ...(options.createdBy && { createdBy: options.createdBy }),
    
    // Account type
    accountType: options.accountType || 'admin_created',
    
    // Onboarding
    onboardingComplete: options.onboardingComplete !== false, // Default true for admin-created
    
    // Additional user data
    ...rest
  };

  return standardizedData;
}

/**
 * Create a complete user account (Auth + Firestore)
 * @param {Object} userData - User data including email, password, userType, etc.
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Created user object
 */
export async function createCompleteUserAccount(userData, options = {}) {
  try {
    const { email, password, firstName, lastName, temporaryPassword, ...rest } = userData;
    
    // Generate password if not provided
    const finalPassword = password || temporaryPassword || generateTemporaryPassword();
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
    const user = userCredential.user;
    
    // Update Auth profile
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });
    
    // Create standardized Firestore document
    const standardizedData = createStandardizedUserData(
      { ...userData, firstName, lastName, email },
      { ...options, uid: user.uid }
    );
    
    // Add password info if temporary
    if (!password) {
      standardizedData.temporaryPassword = finalPassword;
      standardizedData.mustChangePassword = true;
    }
    
    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), standardizedData);
    
    console.log('✅ User created successfully:', {
      uid: user.uid,
      email,
      userType: standardizedData.userType,
      type: standardizedData.type,
      roles: standardizedData.roles
    });
    
    return {
      uid: user.uid,
      email,
      temporaryPassword: !password ? finalPassword : null,
      userData: standardizedData
    };
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

/**
 * Generate a secure temporary password
 * @returns {string}
 */
export function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%&*';
  let password = 'UltimateCare';
  
  // Add 6 random characters
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Add one special character
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  
  return password;
}

/**
 * Update an existing user to have standardized fields
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateUserWithStandardFields(userId, updates) {
  try {
    const userRef = doc(db, 'users', userId);
    
    // If userType is being updated, ensure all related fields are updated
    if (updates.userType) {
      const typeMapping = USER_TYPE_MAPPINGS[updates.userType] || USER_TYPE_MAPPINGS.caregiver;
      updates.type = typeMapping.type;
      updates.role = typeMapping.userType;
      updates.roles = [...typeMapping.roles];
    }
    
    updates.updatedAt = serverTimestamp();
    
    await setDoc(userRef, updates, { merge: true });
    
    console.log('✅ User updated with standardized fields:', userId);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  }
}

export default {
  createStandardizedUserData,
  createCompleteUserAccount,
  generateTemporaryPassword,
  updateUserWithStandardFields,
  USER_TYPE_MAPPINGS
};

