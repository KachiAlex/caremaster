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
    test('should handle Firebase errors', () => {
      const firebaseError = {
        code: 'auth/user-not-found',
        message: 'User not found'
      };
      
      errorHandler.handleError(firebaseError, { context: 'login' });
      
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle network errors', () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      errorHandler.handleError(networkError, { context: 'api_call' });
      
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle validation errors', () => {
      const validationError = {
        name: 'ValidationError',
        message: 'Invalid input data',
        fields: ['email', 'password']
      };
      
      errorHandler.handleError(validationError, { context: 'form_validation' });
      
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle unknown errors gracefully', () => {
      const unknownError = new Error('Unknown error occurred');
      
      errorHandler.handleError(unknownError, { context: 'unknown' });
      
      expect(console.error).toHaveBeenCalled();
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

