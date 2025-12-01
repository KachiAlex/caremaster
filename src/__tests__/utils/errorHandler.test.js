/**
 * Unit Tests for Error Handler
 * Tests error handling, logging, and user feedback
 */

import errorHandler from '../../utils/errorHandler';

describe('Error Handler Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('handleError', () => {
    // Mock toast
    const mockToast = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn()
    };
    
    beforeEach(() => {
      jest.mock('react-toastify', () => ({
        toast: mockToast
      }));
    });

    test('should handle Firebase errors', () => {
      const firebaseError = {
        code: 'auth/user-not-found',
        message: 'User not found'
      };
      
      const result = errorHandler.handleError(firebaseError, { context: 'login' });
      
      expect(result).toBeTruthy();
      expect(result.type).toBe('auth');
      expect(result.userMessage).toBeTruthy();
    });

    test('should handle network errors', () => {
      const networkError = new Error('network request failed');
      networkError.name = 'NetworkError';
      // errorHandler checks for 'network' in message (case-insensitive via includes)
      
      const result = errorHandler.handleError(networkError, { context: 'api_call' });
      
      expect(result).toBeTruthy();
      expect(result.type).toBe('network');
    });

    test('should handle validation errors', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Invalid input data',
        fields: ['email', 'password'],
        code: 'invalid-argument' // errorHandler checks for this code
      };
      
      const result = errorHandler.handleError(validationError, { context: 'form_validation' });
      
      expect(result).toBeTruthy();
      expect(result.type).toBe('validation');
    });

    test('should handle unknown errors gracefully', () => {
      const unknownError = new Error('Unknown error occurred');
      
      const result = errorHandler.handleError(unknownError, { context: 'unknown' });
      
      expect(result).toBeTruthy();
      expect(result.type).toBe('unknown');
    });
  });

  describe('getUserFriendlyMessage', () => {
    test('should return user-friendly message for auth errors', () => {
      const error = { code: 'auth/wrong-password' };
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
    });

    test('should return user-friendly message for permission errors', () => {
      const error = { code: 'permission-denied' };
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBeTruthy();
    });

    test('should return generic message for unknown errors', () => {
      const error = { code: 'unknown-error' };
      const message = errorHandler.getUserFriendlyMessage(error);
      
      expect(message).toBeTruthy();
    });
  });
});

