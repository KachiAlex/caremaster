import { toast } from 'react-toastify';
import environmentConfig from '../config/environment';

// Error types and their corresponding actions
const ERROR_TYPES = {
  NETWORK_ERROR: 'network',
  AUTHENTICATION_ERROR: 'auth',
  PERMISSION_ERROR: 'permission',
  VALIDATION_ERROR: 'validation',
  SERVER_ERROR: 'server',
  UNKNOWN_ERROR: 'unknown'
};

// Error severity levels
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineErrors();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Main error handling method
  handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    
    // Log the error
    this.logError(errorInfo);
    
    // Show user notification
    this.showUserNotification(errorInfo);
    
    // Report to monitoring service (if in production)
    if (environmentConfig.isProduction()) {
      this.reportToMonitoring(errorInfo);
    }
    
    return errorInfo;
  }

  // Analyze error and determine type, severity, and user message
  analyzeError(error, context) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || 'An unexpected error occurred',
      stack: error.stack,
      type: this.determineErrorType(error),
      severity: this.determineErrorSeverity(error, context),
      context: context,
      userMessage: this.generateUserMessage(error, context),
      action: this.determineAction(error, context),
      isOnline: this.isOnline
    };

    return errorInfo;
  }

  // Determine error type based on error properties
  determineErrorType(error) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return ERROR_TYPES.AUTHENTICATION_ERROR;
    }
    
    if (error.code === 'permission-denied' || error.code === 'auth/insufficient-permission') {
      return ERROR_TYPES.PERMISSION_ERROR;
    }
    
    if (error.code === 'unavailable' || error.message?.includes('network')) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    
    if (error.code === 'invalid-argument' || error.code === 'failed-precondition') {
      return ERROR_TYPES.VALIDATION_ERROR;
    }
    
    if (error.code?.startsWith('functions/') || error.status >= 500) {
      return ERROR_TYPES.SERVER_ERROR;
    }
    
    return ERROR_TYPES.UNKNOWN_ERROR;
  }

  // Determine error severity
  determineErrorSeverity(error, context) {
    const errorType = this.determineErrorType(error);
    
    // Critical errors
    if (error.code === 'auth/network-request-failed' && context.critical) {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    if (errorType === ERROR_TYPES.PERMISSION_ERROR && context.sensitive) {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    // Data loss or corruption errors are critical
    if (error.code === 'functions/data-loss' || error.code === 'storage/invalid-checksum') {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    // High severity errors
    if (errorType === ERROR_TYPES.AUTHENTICATION_ERROR) {
      // Account disabled or security-related auth errors are critical
      if (error.code === 'auth/user-disabled' || error.code === 'auth/requires-recent-login') {
        return ERROR_SEVERITY.CRITICAL;
      }
      return ERROR_SEVERITY.HIGH;
    }
    
    if (errorType === ERROR_TYPES.SERVER_ERROR) {
      // Resource exhaustion is critical
      if (error.code === 'functions/resource-exhausted') {
        return ERROR_SEVERITY.CRITICAL;
      }
      return ERROR_SEVERITY.HIGH;
    }
    
    // Medium severity errors
    if (errorType === ERROR_TYPES.NETWORK_ERROR) {
      return ERROR_SEVERITY.MEDIUM;
    }
    
    if (errorType === ERROR_TYPES.VALIDATION_ERROR) {
      return ERROR_SEVERITY.MEDIUM;
    }
    
    // Low severity errors
    return ERROR_SEVERITY.LOW;
  }

  // Generate user-friendly error message
  generateUserMessage(error, context = {}) {
    const errorType = this.determineErrorType(error);
    
    // Handle specific Firebase error codes with more detailed messages
    if (error.code) {
      const specificMessage = this.getSpecificErrorMessage(error.code, error.message);
      if (specificMessage) {
        return specificMessage;
      }
    }
    
    switch (errorType) {
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        if (error.code === 'auth/user-not-found') {
          return 'No account found with this email address.';
        }
        if (error.code === 'auth/wrong-password') {
          return 'Incorrect password. Please try again.';
        }
        if (error.code === 'auth/too-many-requests') {
          return 'Too many failed attempts. Please try again later.';
        }
        if (error.code === 'auth/user-disabled') {
          return 'This account has been disabled. Please contact support.';
        }
        return 'Please check your login credentials and try again.';
      
      case ERROR_TYPES.PERMISSION_ERROR:
        if (error.code === 'permission-denied') {
          return 'You don\'t have permission to access this resource.';
        }
        if (error.code === 'auth/insufficient-permission') {
          return 'Your account doesn\'t have the required permissions for this action.';
        }
        return 'You don\'t have permission to perform this action.';
      
      case ERROR_TYPES.NETWORK_ERROR:
        if (error.code === 'unavailable') {
          return 'Service is temporarily unavailable. Please check your connection and try again.';
        }
        if (!this.isOnline) {
          return 'You appear to be offline. Please check your internet connection.';
        }
        return 'Please check your internet connection and try again.';
      
      case ERROR_TYPES.VALIDATION_ERROR:
        if (error.fields && Array.isArray(error.fields)) {
          return `Please check the following fields: ${error.fields.join(', ')}`;
        }
        if (error.message && error.message.includes('required')) {
          return 'Please fill in all required fields.';
        }
        return 'Please check your input and try again.';
      
      case ERROR_TYPES.SERVER_ERROR:
        if (error.status === 503) {
          return 'Service is temporarily unavailable. Please try again in a few moments.';
        }
        if (error.status === 504) {
          return 'Request timed out. Please try again.';
        }
        return 'Our servers are experiencing issues. Please try again later.';
      
      default:
        // Provide more context if available
        if (context.userMessage) {
          return context.userMessage;
        }
        if (error.message && !error.message.includes('Error') && error.message.length < 100) {
          return error.message;
        }
        return 'Something went wrong. Please try again.';
    }
  }

  // Get specific error message for Firebase error codes
  getSpecificErrorMessage(errorCode, defaultMessage) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email address is already registered.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
      'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
      'auth/requires-recent-login': 'Please log out and log back in to perform this action.',
      'auth/network-request-failed': 'Network error. Please check your connection and try again.',
      'auth/internal-error': 'An internal error occurred. Please try again.',
      'functions/not-found': 'The requested function was not found.',
      'functions/permission-denied': 'You don\'t have permission to call this function.',
      'functions/invalid-argument': 'Invalid arguments provided.',
      'functions/deadline-exceeded': 'Request timed out. Please try again.',
      'functions/resource-exhausted': 'Service is temporarily unavailable due to high demand.',
      'functions/failed-precondition': 'Operation cannot be completed in the current state.',
      'functions/aborted': 'Operation was aborted. Please try again.',
      'functions/out-of-range': 'Requested value is out of range.',
      'functions/unimplemented': 'This feature is not yet implemented.',
      'functions/internal': 'An internal error occurred. Please try again later.',
      'functions/unavailable': 'Service is temporarily unavailable.',
      'functions/data-loss': 'Data loss occurred. Please try again.',
      'functions/unauthenticated': 'Please log in to continue.',
      'storage/unauthorized': 'You don\'t have permission to access this file.',
      'storage/canceled': 'Upload was canceled.',
      'storage/unknown': 'An unknown error occurred during file operation.',
      'storage/invalid-checksum': 'File upload failed. Please try again.',
      'storage/no-download-url': 'Unable to generate download URL.',
      'storage/invalid-event-name': 'Invalid event name provided.',
      'storage/invalid-url': 'Invalid file URL provided.',
      'storage/invalid-argument': 'Invalid argument provided for file operation.',
      'storage/no-default-bucket': 'No default storage bucket configured.',
      'storage/cannot-slice-blob': 'Unable to process file. Please try a different file.',
      'storage/server-file-wrong-size': 'File size mismatch. Please try uploading again.'
    };

    return errorMessages[errorCode] || null;
  }

  // Public method to get user-friendly message (for direct access)
  getUserFriendlyMessage(error, context = {}) {
    if (!error) {
      return 'An unexpected error occurred.';
    }
    return this.generateUserMessage(error, context);
  }

  // Determine what action the user should take
  determineAction(error, context) {
    const errorType = this.determineErrorType(error);
    
    switch (errorType) {
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        return { type: 'redirect', path: '/login' };
      
      case ERROR_TYPES.PERMISSION_ERROR:
        return { type: 'redirect', path: '/dashboard' };
      
      case ERROR_TYPES.NETWORK_ERROR:
        return { type: 'retry', delay: 3000 };
      
      case ERROR_TYPES.VALIDATION_ERROR:
        return { type: 'fix_input' };
      
      case ERROR_TYPES.SERVER_ERROR:
        return { type: 'retry', delay: 5000 };
      
      default:
        return { type: 'none' };
    }
  }

  // Show user notification based on error severity
  showUserNotification(errorInfo) {
    const { severity, userMessage, action } = errorInfo;
    
    let toastType = 'error';
    let autoClose = 5000;
    
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        toastType = 'error';
        autoClose = false; // Don't auto-close critical errors
        break;
      
      case ERROR_SEVERITY.HIGH:
        toastType = 'error';
        autoClose = 7000;
        break;
      
      case ERROR_SEVERITY.MEDIUM:
        toastType = 'warning';
        autoClose = 5000;
        break;
      
      case ERROR_SEVERITY.LOW:
        toastType = 'info';
        autoClose = 3000;
        break;
    }
    
    toast[toastType](userMessage, {
      autoClose,
      position: 'top-right',
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    });
    
    // Handle action if specified
    if (action.type === 'redirect') {
      setTimeout(() => {
        window.location.href = action.path;
      }, 2000);
    }
  }

  // Log error locally
  logError(errorInfo) {
    this.errorLog.push(errorInfo);
    
    // Keep only the most recent errors
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('Care Master_error_log', JSON.stringify(this.errorLog));
    } catch (e) {
      console.warn('Could not save error log to localStorage:', e);
    }
    
    // Log to console in development
    if (environmentConfig.isDevelopment()) {
      console.error('Error handled:', errorInfo);
    }
  }

  // Report error to monitoring service
  async reportToMonitoring(errorInfo) {
    try {
      // Log error details (sanitized for security)
      const sanitizedError = {
        id: errorInfo.id,
        timestamp: errorInfo.timestamp,
        type: errorInfo.type,
        severity: errorInfo.severity,
        message: errorInfo.message?.substring(0, 200), // Limit message length
        context: this.sanitizeContext(errorInfo.context),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // In development, log to console
      if (environmentConfig.isDevelopment()) {
        console.log('Reporting error to monitoring service:', sanitizedError);
      }

      // Example integration with external monitoring services:
      // - Sentry: Sentry.captureException(errorInfo)
      // - LogRocket: LogRocket.captureException(errorInfo)
      // - Custom API:
      // try {
      //   await fetch('/api/errors', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(sanitizedError)
      //   });
      // } catch (fetchError) {
      //   console.error('Failed to send error to API:', fetchError);
      // }
    } catch (e) {
      console.error('Failed to report error to monitoring service:', e);
    }
  }

  // Sanitize context to remove sensitive information
  sanitizeContext(context) {
    if (!context || typeof context !== 'object') {
      return {};
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'ssn', 'creditCard'];
    const sanitized = { ...context };

    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  // Sync offline errors when back online
  async syncOfflineErrors() {
    const offlineErrors = this.errorLog.filter(error => !error.isOnline);
    
    for (const error of offlineErrors) {
      await this.reportToMonitoring(error);
    }
  }

  // Get error log
  getErrorLog() {
    return this.errorLog;
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem('Care Master_error_log');
  }

  // Generate unique error ID
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Handle specific error types
  handleNetworkError(error, context) {
    return this.handleError(error, { ...context, type: ERROR_TYPES.NETWORK_ERROR });
  }

  handleAuthError(error, context) {
    return this.handleError(error, { ...context, type: ERROR_TYPES.AUTHENTICATION_ERROR });
  }

  handlePermissionError(error, context) {
    return this.handleError(error, { ...context, type: ERROR_TYPES.PERMISSION_ERROR });
  }

  handleValidationError(error, context) {
    return this.handleError(error, { ...context, type: ERROR_TYPES.VALIDATION_ERROR });
  }

  // Get error recovery suggestions
  getRecoverySuggestions(error, context = {}) {
    const errorType = this.determineErrorType(error);
    const suggestions = [];

    switch (errorType) {
      case ERROR_TYPES.NETWORK_ERROR:
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        if (!this.isOnline) {
          suggestions.push('Wait for connection to be restored');
        }
        break;

      case ERROR_TYPES.AUTHENTICATION_ERROR:
        suggestions.push('Verify your login credentials');
        suggestions.push('Try resetting your password');
        if (error.code === 'auth/too-many-requests') {
          suggestions.push('Wait a few minutes before trying again');
        }
        break;

      case ERROR_TYPES.VALIDATION_ERROR:
        suggestions.push('Review the form fields');
        suggestions.push('Check for required fields');
        if (error.fields) {
          suggestions.push(`Pay special attention to: ${error.fields.join(', ')}`);
        }
        break;

      case ERROR_TYPES.SERVER_ERROR:
        suggestions.push('Wait a moment and try again');
        suggestions.push('Check if the service is experiencing issues');
        if (error.code === 'functions/resource-exhausted') {
          suggestions.push('Try again in a few minutes');
        }
        break;

      case ERROR_TYPES.PERMISSION_ERROR:
        suggestions.push('Contact your administrator for access');
        suggestions.push('Verify your account permissions');
        break;

      default:
        suggestions.push('Try refreshing the page');
        suggestions.push('Contact support if the issue persists');
    }

    return suggestions;
  }

  // Check if error is recoverable
  isRecoverable(error) {
    const errorType = this.determineErrorType(error);
    
    // Network errors are usually recoverable
    if (errorType === ERROR_TYPES.NETWORK_ERROR) {
      return true;
    }
    
    // Validation errors are recoverable
    if (errorType === ERROR_TYPES.VALIDATION_ERROR) {
      return true;
    }
    
    // Some server errors are recoverable
    if (errorType === ERROR_TYPES.SERVER_ERROR) {
      const recoverableCodes = [
        'functions/resource-exhausted',
        'functions/deadline-exceeded',
        'functions/unavailable'
      ];
      return recoverableCodes.includes(error.code);
    }
    
    // Permission and auth errors typically require user action
    return false;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;
export { ERROR_TYPES, ERROR_SEVERITY };
