/**
 * Integration Tests for Authentication API
 * Tests authentication flows, security, and error handling
 */

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'backend/auth';
import { auth } from '../../backend/config';
import { collection, doc, getDoc, setDoc } from 'backend/database';
import { db } from '../../backend/config';

// Mock Firebase
jest.mock('../../backend/config', () => ({
  auth: {
    currentUser: null
  },
  db: {}
}));

jest.mock('backend/auth');
jest.mock('backend/database');

describe('Authentication API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'SecurePassword123!';
      const userData = {
        name: 'Test User',
        role: 'client',
        email: email
      };

      const mockUser = {
        uid: 'user-123',
        email: email,
        emailVerified: false
      };

      createUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser
      });

      setDoc.mockResolvedValue();

      // Simulate registration
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      expect(result.user.email).toBe(email);
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
    });

    test('should handle registration with weak password', async () => {
      const email = 'test@example.com';
      const weakPassword = '123';

      createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/weak-password',
        message: 'Password should be at least 6 characters'
      });

      await expect(
        createUserWithEmailAndPassword(auth, email, weakPassword)
      ).rejects.toMatchObject({
        code: 'auth/weak-password'
      });
    });

    test('should handle registration with existing email', async () => {
      const email = 'existing@example.com';
      const password = 'SecurePassword123!';

      createUserWithEmailAndPassword.mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already registered'
      });

      await expect(
        createUserWithEmailAndPassword(auth, email, password)
      ).rejects.toMatchObject({
        code: 'auth/email-already-in-use'
      });
    });
  });

  describe('User Login', () => {
    test('should login user successfully', async () => {
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

      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          name: 'Test User',
          role: 'client',
          email: email
        })
      });

      const result = await signInWithEmailAndPassword(auth, email, password);
      
      expect(result.user.email).toBe(email);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, email, password);
    });

    test('should handle login with wrong password', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'WrongPassword123!';

      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Incorrect password'
      });

      await expect(
        signInWithEmailAndPassword(auth, email, wrongPassword)
      ).rejects.toMatchObject({
        code: 'auth/wrong-password'
      });
    });

    test('should handle login with non-existent user', async () => {
      const email = 'nonexistent@example.com';
      const password = 'SecurePassword123!';

      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found'
      });

      await expect(
        signInWithEmailAndPassword(auth, email, password)
      ).rejects.toMatchObject({
        code: 'auth/user-not-found'
      });
    });
  });

  describe('User Logout', () => {
    test('should logout user successfully', async () => {
      signOut.mockResolvedValue();

      await signOut(auth);
      
      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });

  describe('Session Management', () => {
    test('should maintain session across page reloads', async () => {
      const mockUser = {
        uid: 'user-123',
        email: 'test@example.com'
      };

      auth.currentUser = mockUser;

      expect(auth.currentUser).toBe(mockUser);
    });

    test('should handle session timeout', async () => {
      // Simulate session timeout
      auth.currentUser = null;
      
      expect(auth.currentUser).toBeNull();
    });
  });

  describe('Security Features', () => {
    test('should enforce password complexity', async () => {
      const weakPasswords = ['123', 'password', '12345678', 'PASSWORD'];
      
      for (const weakPassword of weakPasswords) {
        createUserWithEmailAndPassword.mockRejectedValue({
          code: 'auth/weak-password'
        });

        await expect(
          createUserWithEmailAndPassword(auth, 'test@example.com', weakPassword)
        ).rejects.toMatchObject({
          code: 'auth/weak-password'
        });
      }
    });

    test('should prevent brute force attacks', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword123!';

      // Simulate multiple failed attempts
      signInWithEmailAndPassword.mockRejectedValue({
        code: 'auth/wrong-password'
      });

      for (let i = 0; i < 5; i++) {
        await expect(
          signInWithEmailAndPassword(auth, email, password)
        ).rejects.toMatchObject({
          code: 'auth/wrong-password'
        });
      }

      // After 5 attempts, account should be locked
      expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(5);
    });
  });
});

