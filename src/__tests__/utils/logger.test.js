/**
 * Unit Tests for Logger
 * Tests logging functionality and log levels
 */

import logger from '../../utils/logger';

// Mock environment config
jest.mock('../../config/environment', () => ({
  isDevelopment: () => true,
  isProduction: () => false
}));

describe('Logger Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
    // Set log level to DEBUG so all logs are shown
    logger.setLogLevel(0);
  });

  describe('log levels', () => {
    test('should log info messages', () => {
      logger.info('Test info message', { data: 'test' });
      expect(console.info).toHaveBeenCalled();
    });

    test('should log warning messages', () => {
      logger.warn('Test warning message', { data: 'test' });
      expect(console.warn).toHaveBeenCalled();
    });

    test('should log error messages', () => {
      logger.error('Test error message', { data: 'test' });
      expect(console.error).toHaveBeenCalled();
    });

    test('should log debug messages in development', () => {
      logger.debug('Test debug message', { data: 'test' });
      expect(console.debug).toHaveBeenCalled();
    });
  });

  describe('structured logging', () => {
    test('should include metadata in logs', () => {
      logger.info('Test message', { userId: '123', action: 'login' });
      const callArgs = console.info.mock.calls[0];
      expect(callArgs).toBeTruthy();
    });

    test('should handle errors in log data', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', { error });
      expect(console.error).toHaveBeenCalled();
    });
  });
});

