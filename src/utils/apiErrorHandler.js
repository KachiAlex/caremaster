/**
 * API Error Handler Utility
 * Provides consistent error handling for all API calls
 */

import errorHandler from './errorHandler';
import logger from './logger';

/**
 * Standard API error response format
 */
export class APIError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: true,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Handle API errors consistently
 * @param {Error} error - The error object
 * @param {string} context - Context of the API call
 * @param {object} options - Additional options
 * @returns {APIError} Standardized API error
 */
export function handleAPIError(error, context = 'api_call', options = {}) {
  const { 
    defaultMessage = 'An error occurred while processing your request',
    logError = true,
    throwError = true
  } = options;

  let apiError;

  // Handle Firebase errors
  if (error.code) {
    apiError = handleFirebaseError(error, context, defaultMessage);
  } 
  // Handle network errors
  else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    apiError = new APIError(
      'Network error. Please check your connection and try again.',
      'NETWORK_ERROR',
      503,
      { originalError: error.message }
    );
  }
  // Handle validation errors
  else if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    apiError = new APIError(
      error.message || 'Invalid input data',
      'VALIDATION_ERROR',
      400,
      { originalError: error.message }
    );
  }
  // Handle unknown errors
  else {
    apiError = new APIError(
      error.message || defaultMessage,
      'UNKNOWN_ERROR',
      500,
      { originalError: error.message }
    );
  }

  // Log error if requested
  if (logError) {
    logger.error('API Error', {
      context,
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      details: apiError.details
    });
  }

  // Handle error via error handler
  errorHandler.handleError(apiError, { context, apiError: true });

  // Throw error if requested
  if (throwError) {
    throw apiError;
  }

  return apiError;
}

/**
 * Handle Firebase-specific errors
 */
function handleFirebaseError(error, context, defaultMessage) {
  const errorMap = {
    'permission-denied': {
      message: 'You don\'t have permission to perform this action.',
      code: 'PERMISSION_DENIED',
      statusCode: 403
    },
    'not-found': {
      message: 'The requested resource was not found.',
      code: 'NOT_FOUND',
      statusCode: 404
    },
    'already-exists': {
      message: 'This resource already exists.',
      code: 'ALREADY_EXISTS',
      statusCode: 409
    },
    'unavailable': {
      message: 'Service is temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503
    },
    'deadline-exceeded': {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
      statusCode: 504
    },
    'resource-exhausted': {
      message: 'Service is temporarily unavailable due to high demand.',
      code: 'RESOURCE_EXHAUSTED',
      statusCode: 503
    },
    'failed-precondition': {
      message: 'Operation cannot be completed in the current state.',
      code: 'FAILED_PRECONDITION',
      statusCode: 400
    },
    'aborted': {
      message: 'Operation was aborted. Please try again.',
      code: 'ABORTED',
      statusCode: 409
    },
    'out-of-range': {
      message: 'Requested value is out of range.',
      code: 'OUT_OF_RANGE',
      statusCode: 400
    },
    'unimplemented': {
      message: 'This feature is not yet implemented.',
      code: 'NOT_IMPLEMENTED',
      statusCode: 501
    },
    'internal': {
      message: 'An internal error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      statusCode: 500
    },
    'invalid-argument': {
      message: 'Invalid argument provided.',
      code: 'INVALID_ARGUMENT',
      statusCode: 400
    }
  };

  const errorInfo = errorMap[error.code] || {
    message: error.message || defaultMessage,
    code: 'UNKNOWN_FIREBASE_ERROR',
    statusCode: 500
  };

  return new APIError(
    errorInfo.message,
    errorInfo.code,
    errorInfo.statusCode,
    { 
      firebaseCode: error.code,
      originalError: error.message 
    }
  );
}

/**
 * Validate API request parameters
 * @param {object} params - Parameters to validate
 * @param {object} schema - Validation schema
 * @throws {APIError} If validation fails
 */
export function validateAPIRequest(params, schema) {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];

    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${key} must be of type ${rules.type}`);
      continue;
    }

    // String length validation
    if (rules.type === 'string' && rules.minLength && value.length < rules.minLength) {
      errors.push(`${key} must be at least ${rules.minLength} characters`);
      continue;
    }

    if (rules.type === 'string' && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${key} must be at most ${rules.maxLength} characters`);
      continue;
    }

    // Number range validation
    if (rules.type === 'number' && rules.min !== undefined && value < rules.min) {
      errors.push(`${key} must be at least ${rules.min}`);
      continue;
    }

    if (rules.type === 'number' && rules.max !== undefined && value > rules.max) {
      errors.push(`${key} must be at most ${rules.max}`);
      continue;
    }

    // Custom validation function
    if (rules.validate && typeof rules.validate === 'function') {
      const validationResult = rules.validate(value);
      if (validationResult !== true) {
        errors.push(validationResult || `${key} validation failed`);
      }
    }
  }

  if (errors.length > 0) {
    throw new APIError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      { errors }
    );
  }
}

/**
 * Standardize API response format
 * @param {any} data - Response data
 * @param {object} meta - Metadata
 * @returns {object} Standardized response
 */
export function formatAPIResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * Wrap API function with error handling
 * @param {Function} apiFunction - The API function to wrap
 * @param {string} context - Context for error handling
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(apiFunction, context = 'api_call') {
  return async (...args) => {
    try {
      const result = await apiFunction(...args);
      return formatAPIResponse(result);
    } catch (error) {
      return handleAPIError(error, context, { throwError: false });
    }
  };
}

/**
 * Retry API call with exponential backoff
 * @param {Function} apiFunction - The API function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise} Result of API call
 */
export async function retryAPICall(apiFunction, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 'PERMISSION_DENIED' || error.code === 'VALIDATION_ERROR') {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logger.warn(`API call failed, retrying... (attempt ${attempt + 1}/${maxRetries})`, {
        error: error.message,
        delay
      });
    }
  }
  
  throw lastError;
}

export default {
  APIError,
  handleAPIError,
  validateAPIRequest,
  formatAPIResponse,
  withErrorHandling,
  retryAPICall
};

