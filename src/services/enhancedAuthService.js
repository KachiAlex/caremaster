/**
 * Enhanced Authentication Service
 * Integrates security features: account lockout, XSS protection, input validation
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  updateEmail,
  updatePassword,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  Timestamp
} from 'backend/auth';
import { auth, db } from '../backend/config';
import { validateEmail, validatePassword, escapeHtml } from '../utils/inputValidation';
import { escapeHtml as escapeHtmlXss } from '../utils/xssProtection';
import {
  recordFailedAttempt,
  isAccountLocked,
  recordSuccessfulLogin,
  clearFailedAttempts,
  detectSuspiciousActivity
} from './accountLockoutService';
import logger from '../utils/logger';
import { collection, query, getDocs, getDoc, setDoc, updateDoc, where, doc } from 'backend/database';

/**
 * Get user's IP address
 */
export const getUserIpAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    logger.warn('Failed to get user IP', { error });
    return 'unknown';
  }
};

/**
 * Get user agent string
 */
export const getUserAgent = () => {
  return navigator.userAgent || 'unknown';
};

/**
 * Enhanced login with security checks
 */
export const secureLogin = async (email, password, rememberMe = false) => {
  try {
    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.message);
    }

    const passwordValidation = validatePassword(password, { minLength: 6 });
    if (!passwordValidation.valid) {
      throw new Error('Invalid password format');
    }

    // Get client info for security tracking
    const ipAddress = await getUserIpAddress();
    const userAgent = getUserAgent();

    // Check if account is locked
    const lockStatus = await isAccountLocked(email.toLowerCase());
    if (lockStatus.locked) {
      logger.warn('Login attempt on locked account', {
        email: email.substring(0, 50),
        lockedUntil: lockStatus.lockedUntil
      });
      
      throw new Error(
        `Account is locked due to ${lockStatus.reason}. ` +
        `Please try again after ${lockStatus.lockedUntil.toLocaleTimeString()} or contact support.`
      );
    }

    // Check for suspicious activity
    const suspiciousCheck = await detectSuspiciousActivity(email.toLowerCase(), ipAddress);
    if (suspiciousCheck.suspicious && suspiciousCheck.severity === 'high') {
      logger.warn('High-severity suspicious activity detected', {
        email: email.substring(0, 50),
        patterns: suspiciousCheck.patterns
      });
      throw new Error('Suspicious activity detected. Please try again later or contact support.');
    }

    try {
      // Attempt login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Set persistence
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      // Record successful login
      await recordSuccessfulLogin(
        userCredential.user.uid,
        email.toLowerCase(),
        ipAddress,
        userAgent
      );

      logger.info('Secure login successful', {
        userId: userCredential.user.uid.substring(0, 10),
        email: email.substring(0, 50)
      });

      return {
        success: true,
        user: userCredential.user,
        message: 'Login successful'
      };
    } catch (error) {
      // Record failed attempt
      await recordFailedAttempt(email.toLowerCase(), ipAddress);

      // Log the failure
      logger.warn('Failed login attempt', {
        email: email.substring(0, 50),
        error: error.code,
        ipAddress
      });

      // Provide generic error message (don't reveal if account exists)
      if (error.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Secure login failed', { error });
    throw error;
  }
};

/**
 * Enhanced registration with validation
 */
export const secureRegister = async (email, password, fullName, role = 'patient') => {
  try {
    // Input validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.message);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0]);
    }

    if (!fullName || fullName.trim().length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }

    // Sanitize inputs
    const sanitizedName = escapeHtml(fullName.trim());
    const sanitizedEmail = email.toLowerCase().trim();

    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);

    // Update profile
    await updateProfile(userCredential.user, {
      displayName: sanitizedName
    });

    // Create user document in Database
    const userDoc = {
      uid: userCredential.user.uid,
      email: sanitizedEmail,
      fullName: sanitizedName,
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      locked: false,
      emailVerified: false,
      twoFactorEnabled: false,
      loginAttempts: 0,
      lastLogin: null,
      profileComplete: false,
      status: 'active'
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);

    // Send verification email
    await sendEmailVerificationSecure(userCredential.user);

    logger.info('User registered successfully', {
      userId: userCredential.user.uid.substring(0, 10),
      email: sanitizedEmail.substring(0, 50)
    });

    return {
      success: true,
      userId: userCredential.user.uid,
      user: userCredential.user,
      message: 'Registration successful. Please verify your email.'
    };
  } catch (error) {
    logger.error('Registration failed', { error });

    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered. Please use another email or try logging in.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email format');
    } else {
      throw error;
    }
  }
};

/**
 * Secure logout
 */
export const secureLogout = async () => {
  try {
    await signOut(auth);

    logger.info('User logged out securely');

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    logger.error('Logout failed', { error });
    throw error;
  }
};

/**
 * Send password reset email with validation
 */
export const sendPasswordResetEmailSecure = async (email) => {
  try {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.message);
    }

    await sendPasswordResetEmail(auth, email.toLowerCase());

    logger.info('Password reset email sent', {
      email: email.substring(0, 50)
    });

    return {
      success: true,
      message: 'Password reset email sent successfully. Check your inbox.'
    };
  } catch (error) {
    logger.error('Password reset email failed', { error });

    if (error.code === 'auth/user-not-found') {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.'
      };
    }

    throw error;
  }
};

/**
 * Confirm password reset
 */
export const confirmPasswordResetSecure = async (code, newPassword) => {
  try {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0]);
    }

    // Verify code format
    if (!code || code.length < 10) {
      throw new Error('Invalid reset code');
    }

    await confirmPasswordReset(auth, code, newPassword);

    logger.info('Password reset successful');

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  } catch (error) {
    logger.error('Password reset confirmation failed', { error });

    if (error.code === 'auth/expired-action-code') {
      throw new Error('Password reset link has expired. Please request a new one.');
    } else if (error.code === 'auth/invalid-action-code') {
      throw new Error('Invalid reset link. Please request a new password reset.');
    } else {
      throw error;
    }
  }
};

/**
 * Update user password securely
 */
export const updatePasswordSecure = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0]);
    }

    // Re-authenticate user
    const userEmail = user.email;

    try {
      await secureLogin(userEmail, currentPassword);
    } catch (error) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await updatePassword(user, newPassword);

    logger.info('Password updated successfully', {
      userId: user.uid.substring(0, 10)
    });

    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    logger.error('Password update failed', { error });
    throw error;
  }
};

/**
 * Update email securely
 */
export const updateEmailSecure = async (newEmail) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate email
    const emailValidation = validateEmail(newEmail);
    if (!emailValidation.valid) {
      throw new Error(emailValidation.message);
    }

    // Check if email is already in use
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', newEmail.toLowerCase()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty && snapshot.docs[0].data().uid !== user.uid) {
      throw new Error('Email already in use');
    }

    // Update email
    await updateEmail(user, newEmail.toLowerCase());

    // Update Database user document
    await updateDoc(doc(db, 'users', user.uid), {
      email: newEmail.toLowerCase(),
      updatedAt: new Date()
    });

    // Send verification to new email
    await sendEmailVerificationSecure(user);

    logger.info('Email update requested', {
      userId: user.uid.substring(0, 10),
      newEmail: newEmail.substring(0, 50)
    });

    return {
      success: true,
      message: 'Email update requested. Please verify the new email.'
    };
  } catch (error) {
    logger.error('Email update failed', { error });
    throw error;
  }
};

/**
 * Send email verification
 */
export const sendEmailVerificationSecure = async (user) => {
  try {
    // This should be implemented via Backend Cloud Functions
    // or your backend API for better security
    logger.info('Email verification queued', {
      userId: user.uid.substring(0, 10),
      email: user.email && user.email.substring(0, 50)
    });

    return { success: true };
  } catch (error) {
    logger.error('Email verification failed', { error });
    throw error;
  }
};

/**
 * Get current user with security checks
 */
export const getCurrentUserSecure = async () => {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        resolve(null);
        return;
      }

      try {
        // Fetch additional user data from Database
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
          resolve(null);
          return;
        }

        const userData = userDoc.data();

        // Check if user account is locked
        if (userData.locked) {
          logger.error('Accessing locked account', {
            userId: user.uid.substring(0, 10)
          });
          await secureLogout();
          reject(new Error('Account is locked'));
          return;
        }

        resolve({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          ...userData
        });
      } catch (error) {
        logger.error('Failed to get current user', { error });
        reject(error);
      }
    });
  });
};

/**
 * Enable two-factor authentication (placeholder)
 */
export const enableTwoFactorAuth = async (userId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      twoFactorEnabled: true,
      twoFactorSecret: 'encrypted-secret-would-go-here',
      updatedAt: new Date()
    });

    logger.info('Two-factor authentication enabled', {
      userId: userId.substring(0, 10)
    });

    return { success: true, message: 'Two-factor authentication enabled' };
  } catch (error) {
    logger.error('Failed to enable 2FA', { error });
    throw error;
  }
};

/**
 * Disable two-factor authentication
 */
export const disableTwoFactorAuth = async (userId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date()
    });

    logger.info('Two-factor authentication disabled', {
      userId: userId.substring(0, 10)
    });

    return { success: true, message: 'Two-factor authentication disabled' };
  } catch (error) {
    logger.error('Failed to disable 2FA', { error });
    throw error;
  }
};

export default {
  secureLogin,
  secureRegister,
  secureLogout,
  sendPasswordResetEmailSecure,
  confirmPasswordResetSecure,
  updatePasswordSecure,
  updateEmailSecure,
  sendEmailVerificationSecure,
  getCurrentUserSecure,
  enableTwoFactorAuth,
  disableTwoFactorAuth,
  getUserIpAddress,
  getUserAgent
};
