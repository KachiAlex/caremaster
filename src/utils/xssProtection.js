/**
 * XSS Protection Utility
 * Provides secure sanitization and escaping to prevent Cross-Site Scripting attacks
 */

// Fallback sanitization if DOMPurify is not available
const fallbackSanitize = (dirty) => {
  const div = document.createElement('div');
  div.textContent = dirty;
  return div.innerHTML;
};

// Safe HTML sanitization using DOMPurify (if available)
export const sanitizeHtml = (dirty, config = {}) => {
  try {
    // Check if DOMPurify is available globally
    if (typeof window !== 'undefined' && window.DOMPurify) {
      return window.DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'title', 'target'],
        ...config
      });
    }
    
    // Fallback: text content only (safest)
    return fallbackSanitize(dirty);
  } catch (error) {
    console.error('Error sanitizing HTML:', error);
    return fallbackSanitize(dirty);
  }
};

// Escape special HTML characters
export const escapeHtml = (text) => {
  if (!text) return '';
  
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return String(text).replace(/[&<>"'\/]/g, char => escapeMap[char]);
};

// Escape attribute values to prevent attribute-based XSS
export const escapeAttribute = (value) => {
  if (!value) return '';
  
  return String(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;');
};

// Sanitize object properties recursively
export const sanitizeObject = (obj, stringFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in sanitized) {
    if (sanitized.hasOwnProperty(key)) {
      const value = sanitized[key];

      if (stringFields.includes(key) && typeof value === 'string') {
        // Sanitize specified string fields
        sanitized[key] = escapeHtml(value);
      } else if (typeof value === 'string') {
        // Escape all strings by default
        sanitized[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value, stringFields);
      }
    }
  }

  return sanitized;
};

// Validate and sanitize URL to prevent javascript: protocol attacks
export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  const urlString = String(url).trim();
  
  // Reject javascript:, data:, vbscript: protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = urlString.toLowerCase();
  
  if (dangerousProtocols.some(proto => lowerUrl.startsWith(proto))) {
    console.warn('Dangerous URL protocol detected:', urlString);
    return '#';
  }
  
  // Allow relative URLs, http, https, mailto
  if (
    urlString.startsWith('/') ||
    urlString.startsWith('http://') ||
    urlString.startsWith('https://') ||
    urlString.startsWith('mailto:') ||
    urlString.startsWith('#')
  ) {
    return encodeURI(urlString);
  }
  
  // Default to relative URL
  return encodeURI('/' + urlString);
};

// Remove all HTML tags from text
export const stripHtmlTags = (html) => {
  if (!html) return '';
  
  const tmp = document.createElement('DIV');
  tmp.innerHTML = escapeHtml(html);
  return tmp.textContent || tmp.innerText || '';
};

// Validate JSON to prevent injection
export const validateAndParseJson = (jsonString) => {
  try {
    // Parse JSON
    const parsed = JSON.parse(jsonString);
    
    // Validate it's safe (no functions, symbols, etc.)
    if (typeof parsed === 'function' || typeof parsed === 'symbol') {
      throw new Error('Invalid parsed type');
    }
    
    return { valid: true, data: parsed };
  } catch (error) {
    console.error('Invalid JSON:', error);
    return { valid: false, data: null, error: error.message };
  }
};

// React component props sanitization
export const sanitizeProps = (props, allowedProps = []) => {
  const sanitized = {};
  
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      const value = props[key];
      
      // Only include allowed props
      if (allowedProps.includes(key)) {
        if (typeof value === 'string') {
          sanitized[key] = escapeHtml(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
  }
  
  return sanitized;
};

// XSS attack detection utility
export const detectXssPatterns = (text) => {
  if (!text || typeof text !== 'string') {
    return { suspicious: false, patterns: [] };
  }
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /on\w+\s*=/gi,  // Event handlers like onclick=
    /javascript:/gi,
    /<iframe[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /eval\(/gi,
    /expression\(/gi
  ];
  
  const patterns = [];
  xssPatterns.forEach((pattern, index) => {
    if (pattern.test(text)) {
      patterns.push(pattern.toString());
    }
  });
  
  return {
    suspicious: patterns.length > 0,
    patterns: patterns,
    severity: patterns.length > 0 ? 'high' : 'low'
  };
};

// Content Security Policy header helper
export const getCSPHeaders = () => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Consider removing unsafe-* in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  };
};

/**
 * Hook for React components to safely render user content
 * Usage: const safeHtml = useSafeHtml(userContent);
 */
export const useSafeHtml = (html) => {
  return sanitizeHtml(html);
};

/**
 * Hook for React components to safely display user text
 * Usage: const safeText = useSafeText(userText);
 */
export const useSafeText = (text) => {
  return escapeHtml(text);
};

export default {
  sanitizeHtml,
  escapeHtml,
  escapeAttribute,
  sanitizeObject,
  sanitizeUrl,
  stripHtmlTags,
  validateAndParseJson,
  sanitizeProps,
  detectXssPatterns,
  getCSPHeaders,
  useSafeHtml,
  useSafeText
};
