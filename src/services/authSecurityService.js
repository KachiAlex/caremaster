import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  multiFactor,
  PhoneAuthProvider,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth } from '../firebase/config';
import encryptionService from './encryptionService';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';
import secureConfigService from './secureConfigService';

class AuthSecurityService {
  constructor() {
    this.maxLoginAttempts = secureConfigService.get('security.maxLoginAttempts');
    this.lockoutDuration = secureConfigService.get('security.lockoutDuration');
    this.sessionTimeout = secureConfigService.get('security.sessionTimeout');
    this.loginAttempts = new Map();
    this.lockedAccounts = new Map();
    this.activeSessions = new Map();
  }

  // Enhanced sign in with security measures
  async secureSignIn(email, password, additionalData = {}) {
    try {
      // Check if account is locked
      if (this.isAccountLocked(email)) {
        throw new Error('Account is temporarily locked due to multiple failed attempts');
      }

      // Check login attempts
      if (this.getLoginAttempts(email) >= this.maxLoginAttempts) {
        this.lockAccount(email);
        throw new Error('Too many failed login attempts. Account locked.');
      }

      logger.info('Attempting secure sign in', { email, userAgent: navigator.userAgent });

      // Attempt sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Reset login attempts on successful login
      this.resetLoginAttempts(email);

      // Create secure session
      const sessionData = {
        userId: user.uid,
        email: user.email,
        loginTime: Date.now(),
        userAgent: navigator.userAgent,
        ipAddress: await this.getClientIP(),
        sessionId: encryptionService.generateSecureToken(),
        ...additionalData
      };

      this.activeSessions.set(user.uid, sessionData);

      // Log successful authentication
      logger.info('Secure sign in successful', { 
        userId: user.uid, 
        email: user.email,
        sessionId: sessionData.sessionId 
      });

      // Set session timeout
      this.setSessionTimeout(user.uid);

      return { user, sessionData };
    } catch (error) {
      // Increment failed login attempts
      this.incrementLoginAttempts(email);
      
      logger.warn('Secure sign in failed', { 
        email, 
        error: error.message,
        attempts: this.getLoginAttempts(email)
      });

      errorHandler.handleError(error, { 
        context: 'secure_sign_in', 
        email,
        attempts: this.getLoginAttempts(email)
      });

      throw error;
    }
  }

  // Enhanced user creation with security validation
  async secureSignUp(email, password, userData = {}) {
    try {
      // Validate password strength
      this.validatePasswordStrength(password);

      // Validate email format
      this.validateEmail(email);

      logger.info('Attempting secure sign up', { email });

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Encrypt sensitive user data
      const encryptedUserData = encryptionService.encryptHealthData(userData);

      // Log user creation
      logger.info('Secure sign up successful', { 
        userId: user.uid, 
        email: user.email 
      });

      return { user, encryptedUserData };
    } catch (error) {
      logger.error('Secure sign up failed', { email, error: error.message });
      errorHandler.handleError(error, { context: 'secure_sign_up', email });
      throw error;
    }
  }

  // Secure sign out with session cleanup
  async secureSignOut() {
    try {
      const user = auth.currentUser;
      if (user) {
        // Clean up session data
        this.activeSessions.delete(user.uid);
        
        logger.info('Secure sign out', { userId: user.uid });
      }

      await signOut(auth);
    } catch (error) {
      logger.error('Secure sign out failed', { error: error.message });
      errorHandler.handleError(error, { context: 'secure_sign_out' });
      throw error;
    }
  }

  // Password strength validation
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      throw new Error('Password must contain at least one number');
    }

    if (!hasSpecialChars) {
      throw new Error('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new Error('Password is too common. Please choose a stronger password');
    }
  }

  // Email validation
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  // Two-factor authentication setup
  async setupTwoFactorAuth(phoneNumber) {
    try {
      if (!secureConfigService.isFeatureEnabled('twoFactorAuth')) {
        throw new Error('Two-factor authentication is not enabled');
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be signed in to setup 2FA');
      }

      // Setup phone authentication
      const multiFactorSession = await multiFactor(user).getSession();
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      
      // Send verification code
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneNumber,
        new RecaptchaVerifier('recaptcha-container', {
          size: 'invisible'
        })
      );

      logger.info('2FA setup initiated', { userId: user.uid, phoneNumber });
      return verificationId;
    } catch (error) {
      logger.error('2FA setup failed', { error: error.message });
      errorHandler.handleError(error, { context: 'setup_2fa' });
      throw error;
    }
  }

  // Verify 2FA code
  async verifyTwoFactorAuth(verificationId, verificationCode) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User must be signed in');
      }

      const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = multiFactor(user).assertion(phoneCredential);
      
      await multiFactor(user).enroll(multiFactorAssertion);

      logger.info('2FA verification successful', { userId: user.uid });
      return true;
    } catch (error) {
      logger.error('2FA verification failed', { error: error.message });
      errorHandler.handleError(error, { context: 'verify_2fa' });
      throw error;
    }
  }

  // Session management
  setSessionTimeout(userId) {
    setTimeout(() => {
      if (this.activeSessions.has(userId)) {
        this.activeSessions.delete(userId);
        logger.info('Session expired', { userId });
        
        // Auto sign out if user is still active
        if (auth.currentUser?.uid === userId) {
          this.secureSignOut();
        }
      }
    }, this.sessionTimeout * 1000);
  }

  // Check if session is valid
  isSessionValid(userId) {
    return this.activeSessions.has(userId);
  }

  // Get active session data
  getSessionData(userId) {
    return this.activeSessions.get(userId);
  }

  // Login attempt tracking
  incrementLoginAttempts(email) {
    const attempts = this.getLoginAttempts(email) + 1;
    this.loginAttempts.set(email, {
      count: attempts,
      lastAttempt: Date.now()
    });
  }

  getLoginAttempts(email) {
    const data = this.loginAttempts.get(email);
    return data ? data.count : 0;
  }

  resetLoginAttempts(email) {
    this.loginAttempts.delete(email);
  }

  // Account locking
  lockAccount(email) {
    this.lockedAccounts.set(email, Date.now());
    logger.warn('Account locked due to failed attempts', { email });
  }

  isAccountLocked(email) {
    const lockTime = this.lockedAccounts.get(email);
    if (!lockTime) return false;

    const timeSinceLock = Date.now() - lockTime;
    if (timeSinceLock > this.lockoutDuration * 1000) {
      this.lockedAccounts.delete(email);
      return false;
    }

    return true;
  }

  // Get client IP (simplified)
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Password reset with security
  async securePasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Password reset failed', { email, error: error.message });
      errorHandler.handleError(error, { context: 'password_reset', email });
      throw error;
    }
  }

  // Change password with re-authentication
  async securePasswordChange(currentPassword, newPassword) {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('User must be signed in');
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Validate new password
      this.validatePasswordStrength(newPassword);

      // Update password
      await updatePassword(user, newPassword);

      logger.info('Password changed successfully', { userId: user.uid });
    } catch (error) {
      logger.error('Password change failed', { error: error.message });
      errorHandler.handleError(error, { context: 'password_change' });
      throw error;
    }
  }

  // Security audit log
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userId: auth.currentUser?.uid,
      userAgent: navigator.userAgent,
      ipAddress: this.getClientIP(),
      ...details
    };

    logger.info('Security event', logEntry);
    
    // In production, send to security monitoring service
    if (secureConfigService.get('isProduction')) {
      this.sendSecurityAlert(logEntry);
    }
  }

  // Send security alert
  async sendSecurityAlert(logEntry) {
    try {
      // Implementation would send to security monitoring service
      console.log('Security Alert:', logEntry);
    } catch (error) {
      logger.error('Failed to send security alert', { error: error.message });
    }
  }
}

// Create singleton instance
const authSecurityService = new AuthSecurityService();

export default authSecurityService;
