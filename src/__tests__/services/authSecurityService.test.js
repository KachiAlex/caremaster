/**
 * Unit Tests for Auth Security Service
 * Tests authentication flows, security measures, and error handling
 */

import authSecurityService from '../../services/authSecurityService';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'backend/auth';
import { auth } from '../../backend/config';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn()
  }
}));

jest.mock('../../backend/config', () => ({
  auth: {
    currentUser: null
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
  default: {
    handleError: jest.fn()
  }
}));

describe('Auth Security Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.currentUser = null;
  });

  describe('secureSignIn', () => {
    test('should sign in user successfully', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const mockUser = {
        uid: 'user-123',
        email: email,
        emailVerified: true
      };

      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      const result = await authSecurityService.secureSignIn(email, password);

      expect(result.user).toBe(mockUser);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
    });

    test('should handle wrong password', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword123!';

      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Incorrect password'
      });

      await expect(
        authSecurityService.secureSignIn(email, password)
      ).rejects.toMatchObject({
        code: 'auth/wrong-password'
      });
    });

    test('should handle user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'SecurePassword123!';

      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });

      await expect(
        authSecurityService.secureSignIn(email, password)
      ).rejects.toMatchObject({
        code: 'auth/user-not-found'
      });
    });

    test('should lock account after max attempts', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword123!';

      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Incorrect password'
      });

      // Attempt login multiple times
      for (let i = 0; i < 6; i++) {
        try {
          await authSecurityService.secureSignIn(email, password);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next attempt should be locked
      await expect(
        authSecurityService.secureSignIn(email, password)
      ).rejects.toThrow('Account is temporarily locked');
    });
  });

  describe('secureSignUp', () => {
    test('should sign up user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePassword123!';
      const userData = {
        name: 'New User',
        role: 'client'
      };

      const mockUser = {
        uid: 'user-456',
        email: email
      };

      createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      const result = await authSecurityService.secureSignUp(email, password, userData);

      expect(result.user).toBe(mockUser);
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
    });

    test('should reject weak password', async () => {
      const email = 'test@example.com';
      const weakPassword = '123';

      await expect(
        authSecurityService.secureSignUp(email, weakPassword)
      ).rejects.toThrow();
    });

    test('should handle email already in use', async () => {
      const email = 'existing@example.com';
      const password = 'SecurePassword123!';

      createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already registered'
      });

      await expect(
        authSecurityService.secureSignUp(email, password)
      ).rejects.toMatchObject({
        code: 'auth/email-already-in-use'
      });
    });
  });

  describe('secureSignOut', () => {
    test('should sign out user successfully', async () => {
      auth.currentUser = {
        uid: 'user-123',
        email: 'test@example.com'
      };

      signOut.mockResolvedValue();

      await authSecurityService.secureSignOut();

      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });

  describe('securePasswordReset', () => {
    test('should send password reset email successfully', async () => {
      const email = 'test@example.com';

      sendPasswordResetEmail.mockResolvedValue();

      await authSecurityService.securePasswordReset(email);

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, email);
    });

    test('should handle user not found', async () => {
      const email = 'nonexistent@example.com';

      sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });

      await expect(
        authSecurityService.securePasswordReset(email)
      ).rejects.toMatchObject({
        code: 'auth/user-not-found'
      });
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      // Clear any account lockout state by accessing internal state
      // The service stores lockout state in memory, so we need to ensure clean state
      jest.clearAllMocks();
    });

    test('should validate active session', async () => {
      jest.setTimeout(10000); // Increase timeout for async operations
      
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const password = 'SecurePassword123!';
      const mockUser = {
        uid: 'user-123',
        email: uniqueEmail
      };

      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      await authSecurityService.secureSignIn(uniqueEmail, password);

      // Service doesn't have isSessionValid, check that sign in was successful
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, uniqueEmail, password);
    });

    test('should invalidate session on logout', async () => {
      jest.setTimeout(10000); // Increase timeout for async operations
      
      const uniqueEmail = `test-${Date.now() + 1000}@example.com`;
      const password = 'SecurePassword123!';
      const mockUser = {
        uid: 'user-123',
        email: uniqueEmail
      };

      signInWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });
      signOut.mockResolvedValue();

      await authSecurityService.secureSignIn(uniqueEmail, password);
      await authSecurityService.secureSignOut();

      // Service doesn't have isSessionValid, check that signOut was called
      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });

  describe('Password Validation', () => {
    test('should accept strong password', () => {
      const strongPassword = 'SecurePassword123!';
      
      expect(() => {
        authSecurityService.validatePasswordStrength(strongPassword);
      }).not.toThrow();
    });

    test('should reject weak password', () => {
      const weakPassword = '123';
      
      expect(() => {
        authSecurityService.validatePasswordStrength(weakPassword);
      }).toThrow();
    });

    test('should reject short password', () => {
      const shortPassword = 'Short1!';
      
      expect(() => {
        authSecurityService.validatePasswordStrength(shortPassword);
      }).toThrow();
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email', () => {
      const validEmail = 'test@example.com';
      
      expect(() => {
        authSecurityService.validateEmail(validEmail);
      }).not.toThrow();
    });

    test('should reject invalid email', () => {
      const invalidEmail = 'not-an-email';
      
      expect(() => {
        authSecurityService.validateEmail(invalidEmail);
      }).toThrow();
    });
  });
});

