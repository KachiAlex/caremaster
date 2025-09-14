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
    // Critical errors
    if (error.code === 'auth/network-request-failed' && context.critical) {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    if (error.type === ERROR_TYPES.PERMISSION_ERROR && context.sensitive) {
      return ERROR_SEVERITY.CRITICAL;
    }
    
    // High severity errors
    if (error.type === ERROR_TYPES.AUTHENTICATION_ERROR) {
      return ERROR_SEVERITY.HIGH;
    }
    
    if (error.type === ERROR_TYPES.SERVER_ERROR) {
      return ERROR_SEVERITY.HIGH;
    }
    
    // Medium severity errors
    if (error.type === ERROR_TYPES.NETWORK_ERROR) {
      return ERROR_SEVERITY.MEDIUM;
    }
    
    if (error.type === ERROR_TYPES.VALIDATION_ERROR) {
      return ERROR_SEVERITY.MEDIUM;
    }
    
    // Low severity errors
    return ERROR_SEVERITY.LOW;
  }

  // Generate user-friendly error message
  generateUserMessage(error, context) {
    const errorType = this.determineErrorType(error);
    
    switch (errorType) {
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        return 'Please check your login credentials and try again.';
      
      case ERROR_TYPES.PERMISSION_ERROR:
        return 'You don\'t have permission to perform this action.';
      
      case ERROR_TYPES.NETWORK_ERROR:
        return 'Please check your internet connection and try again.';
      
      case ERROR_TYPES.VALIDATION_ERROR:
        return 'Please check your input and try again.';
      
      case ERROR_TYPES.SERVER_ERROR:
        return 'Our servers are experiencing issues. Please try again later.';
      
      default:
        return 'Something went wrong. Please try again.';
    }
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
      localStorage.setItem('elderx_error_log', JSON.stringify(this.errorLog));
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
      // This would integrate with services like Sentry, LogRocket, etc.
      // For now, we'll just log to console
      console.log('Reporting error to monitoring service:', errorInfo);
      
      // Example integration with external monitoring:
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorInfo)
      // });
    } catch (e) {
      console.error('Failed to report error to monitoring service:', e);
    }
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
    localStorage.removeItem('elderx_error_log');
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
}

// Create singleton instance
const errorHandler = new ErrorHandler();

export default errorHandler;
export { ERROR_TYPES, ERROR_SEVERITY };
