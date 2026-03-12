/**
 * Input Validation Utility
 * SECURITY FIX: Comprehensive input validation and sanitization
 * Enhanced with stricter XSS prevention and encoding
 */

import DOMPurify from 'dompurify';
import logger from '../utils/logger';

// Configure DOMPurify for maximum security
DOMPurify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false
});

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
 * Sanitize user-generated content - removes all HTML by default
 * Use for comments, messages, notes, etc.
 */
export function sanitizeUserContent(content, allowedTags = []) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  try {
    const config = {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    };
    return DOMPurify.sanitize(content, config);
  } catch (error) {
    logger.error('Content sanitization failed', { error });
    return escapeHtml(content);
  }
}

/**
 * Escape HTML entities - prevents rendering of HTML
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Encode Unicode characters to prevent character-based attacks
 */
export function encodeUnicode(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text.split('').map(char => {
    const charCode = char.charCodeAt(0);
    if (charCode > 127) {
      return `&#${charCode};`;
    }
    return char;
  }).join('');
}

/**
 * Validate filename to prevent directory traversal and injection
 */
export function validateFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename is required' };
  }
  
  // Check for directory traversal attempts
  if (filename.includes('../') || filename.includes('..\\') || filename.startsWith('/')) {
    logger.warn('Directory traversal attempt detected', { filename: filename.substring(0, 50) });
    return { valid: false, error: 'Invalid filename' };
  }
  
  // Check for null bytes
  if (filename.includes('\0')) {
    return { valid: false, error: 'Invalid filename' };
  }
  
  // Limit filename length
  if (filename.length > 255) {
    return { valid: false, error: 'Filename is too long' };
  }
  
  // Allow only safe characters
  const filenameRegex = /^[a-zA-Z0-9\-_.()[\] ]+$/;
  if (!filenameRegex.test(filename)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }
  
  return { valid: true, filename: filename.trim() };
}

/**
 * Validate file upload by size and type
 */
export function validateFileUpload(file, maxSizeMB = 10, allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']) {
  if (!file) {
    return { valid: false, error: 'File is required' };
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  // Validate filename
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.valid) {
    return filenameValidation;
  }
  
  return { valid: true };
}

/**
 * Validate URL to prevent JavaScript: and data: URLs
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Prevent javascript: and data: protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(proto => urlObj.protocol.toLowerCase() === proto.replace(':', ''))) {
      logger.warn('Dangerous protocol detected', { protocol: urlObj.protocol });
      return { valid: false, error: 'Invalid URL protocol' };
    }
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    return { valid: true, url: urlObj.toString() };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Sanitize JSON to prevent injection attacks
 */
export function sanitizeJSON(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }
  
  try {
    // First parse to validate JSON
    const parsed = JSON.parse(jsonString);
    
    // Re-stringify to normalize and remove any potential injection vectors
    return JSON.stringify(parsed);
  } catch (error) {
    logger.error('JSON sanitization failed', { error });
    return null;
  }
}

/**
 * Validate and sanitize search query
 */
export function validateSearchQuery(query, maxLength = 100) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Search query is required' };
  }
  
  // Sanitize special characters that could break search
  let sanitized = query.replace(/[*+\-()[\]{}^$|\\]/g, '\\$&');
  
  if (sanitized.length > maxLength) {
    return { valid: false, error: `Search query exceeds ${maxLength} character limit` };
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return { valid: true, query: sanitized.trim() };
}

/**
 * Sanitize SQL-like inputs to prevent injection (for application-level protection)
 */
export function preventSQLInjection(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove common SQL injection patterns
  const dangerous = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|STYLE|IFRAME|OBJECT|EMBED|EVENT|IMG|SVG)\b)/gi,
    /(--|\#|;|\/\*|\*\/|xp_|sp_|;DROP|;DELETE|;INSERT|;UPDATE|;EXEC|;SELECT|javascript:|data:|vbscript:|onload=|onerror=)*$/gi
  ];
  
  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized;
}

/**
 * Validate medical data input (vital signs, measurements)
 */
export function validateMedicalData(data, type) {
  if (!data || data === '') {
    return { valid: false, error: 'Medical data is required' };
  }
  
  const num = typeof data === 'string' ? parseFloat(data) : data;
  
  if (isNaN(num)) {
    return { valid: false, error: 'Medical data must be numeric' };
  }
  
  // Define valid ranges for common vital signs
  const ranges = {
    temperature: { min: 35, max: 42, unit: '°C' },
    bloodPressureSystolic: { min: 50, max: 250, unit: 'mmHg' },
    bloodPressureDiastolic: { min: 30, max: 150, unit: 'mmHg' },
    heartRate: { min: 30, max: 200, unit: 'bpm' },
    respirationRate: { min: 5, max: 60, unit: 'breaths/min' },
    oxygenSaturation: { min: 50, max: 100, unit: '%' },
    bloodGlucose: { min: 30, max: 600, unit: 'mg/dL' },
    weight: { min: 1, max: 300, unit: 'kg' },
    height: { min: 50, max: 250, unit: 'cm' }
  };
  
  const range = ranges[type];
  if (!range) {
    return { valid: true, value: num }; // Unknown type, allow it
  }
  
  if (num < range.min || num > range.max) {
    return { 
      valid: false, 
      error: `${type} must be between ${range.min} and ${range.max} ${range.unit}` 
    };
  }
  
  return { valid: true, value: num };
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

// Export aliases
export { sanitizeUserContent as sanitizeText };
export { sanitizeUserContent as sanitizeHTML };

// Default export
export default {
  validateEmail,
  validatePhone,
  validatePassword,
  sanitizeHTML: sanitizeUserContent,
  sanitizeText: sanitizeUserContent,
  sanitizeUserContent,
  escapeHtml,
  encodeUnicode,
  validateFilename,
  validateFileUpload,
  validateURL,
  sanitizeJSON,
  validateSearchQuery,
  preventSQLInjection,
  validateMedicalData,
  validateDate,
  validateNumber,
  validatePatientId,
  validateFormInputs
};

