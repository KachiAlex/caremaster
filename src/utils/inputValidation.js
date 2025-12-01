/**
 * Input Validation Utility
 * SECURITY FIX: Comprehensive input validation and sanitization
 */

import DOMPurify from 'dompurify';
import logger from '../utils/logger';

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check for common email injection attempts
  const dangerousPatterns = [
    /[<>]/,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(email)) {
      logger.warn('Potentially malicious email detected', { email: email.substring(0, 50) });
      return { valid: false, error: 'Invalid email format' };
    }
  }
  
  return { valid: true };
}

/**
 * Validate phone number
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Check for valid phone number format (international format)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true, cleaned };
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (maximum 128 characters)' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/.test(password);
  
  const requirements = [];
  if (!hasUpperCase) requirements.push('uppercase letter');
  if (!hasLowerCase) requirements.push('lowercase letter');
  if (!hasNumbers) requirements.push('number');
  if (!hasSpecialChars) requirements.push('special character');
  
  if (requirements.length > 0) {
    return { 
      valid: false, 
      error: `Password must contain at least one ${requirements.join(', ')}` 
    };
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'password123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common. Please choose a stronger password' };
  }
  
  return { valid: true };
}

/**
 * Sanitize HTML input to prevent XSS
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [], // No HTML tags allowed by default
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  } catch (error) {
    logger.error('HTML sanitization failed', { error });
    // Fallback: escape HTML entities
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * Sanitize text input (remove potentially dangerous characters)
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Remove null bytes and control characters
  let sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Validate date
 */
export function validateDate(dateString) {
  if (!dateString) {
    return { valid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Check for reasonable date range (not too far in past or future)
  const now = new Date();
  const minDate = new Date('1900-01-01');
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow 1 year in future
  
  if (date < minDate || date > maxDate) {
    return { valid: false, error: 'Date is out of valid range' };
  }
  
  return { valid: true, date };
}

/**
 * Validate numeric input
 */
export function validateNumber(value, min = null, max = null) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Number is required' };
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number format' };
  }
  
  if (min !== null && num < min) {
    return { valid: false, error: `Number must be at least ${min}` };
  }
  
  if (max !== null && num > max) {
    return { valid: false, error: `Number must be at most ${max}` };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate patient ID format
 */
export function validatePatientId(patientId) {
  if (!patientId || typeof patientId !== 'string') {
    return { valid: false, error: 'Patient ID is required' };
  }
  
  // UC-YYYY-NNNN or UC-XXXX-YYYY-NNNN format
  const patientIdRegex = /^UC-([A-Z0-9]{0,4}-)?\d{4}-\d{4}$/;
  if (!patientIdRegex.test(patientId)) {
    return { valid: false, error: 'Invalid patient ID format' };
  }
  
  return { valid: true };
}

/**
 * Validate and sanitize all form inputs
 */
export function validateFormInputs(inputs, schema) {
  const errors = {};
  const sanitized = {};
  
  for (const [field, value] of Object.entries(inputs)) {
    const fieldSchema = schema[field];
    if (!fieldSchema) continue;
    
    // Sanitize first
    let sanitizedValue = value;
    if (fieldSchema.sanitize) {
      sanitizedValue = sanitizeText(value);
    }
    
    // Validate
    if (fieldSchema.required && (!sanitizedValue || sanitizedValue.trim() === '')) {
      errors[field] = `${fieldSchema.label || field} is required`;
      continue;
    }
    
    if (sanitizedValue && fieldSchema.type) {
      let validation;
      switch (fieldSchema.type) {
        case 'email':
          validation = validateEmail(sanitizedValue);
          break;
        case 'phone':
          validation = validatePhone(sanitizedValue);
          if (validation.valid && validation.cleaned) {
            sanitizedValue = validation.cleaned;
          }
          break;
        case 'password':
          validation = validatePassword(sanitizedValue);
          break;
        case 'date':
          validation = validateDate(sanitizedValue);
          break;
        case 'number':
          validation = validateNumber(sanitizedValue, fieldSchema.min, fieldSchema.max);
          break;
        case 'patientId':
          validation = validatePatientId(sanitizedValue);
          break;
        default:
          validation = { valid: true };
      }
      
      if (!validation.valid) {
        errors[field] = validation.error;
        continue;
      }
    }
    
    sanitized[field] = sanitizedValue;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

export default {
  validateEmail,
  validatePhone,
  validatePassword,
  sanitizeHTML,
  sanitizeText,
  validateDate,
  validateNumber,
  validatePatientId,
  validateFormInputs
};

