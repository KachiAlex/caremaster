/**
 * Content Security Policy (CSP) Configuration
 * SECURITY FIX: Implements CSP headers to prevent XSS attacks
 */

/**
 * Generate CSP header value
 * @returns {string} CSP header value
 */
export function generateCSPHeader() {
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for React
      "'unsafe-eval'", // Required for some Backend features
      'https://www.gstatic.com',
      'https://www.google.com',
      'https://apis.google.com',
      'https://www.googletagmanager.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for React inline styles
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'https:',
      'blob:'
    ],
    'connect-src': [
      "'self'",
      'https://*.backendio.com',
      'https://*.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'wss://*.backendio.com'
    ],
    'frame-src': [
      "'self'",
      'https://www.google.com',
      'https://www.gstatic.com'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };

  // Convert to CSP string
  const cspParts = Object.entries(cspDirectives).map(([directive, sources]) => {
    if (directive === 'upgrade-insecure-requests') {
      return directive;
    }
    return `${directive} ${sources.join(' ')}`;
  });

  return cspParts.join('; ');
}

/**
 * Get CSP meta tag content
 * @returns {string} CSP meta tag content
 */
export function getCSPMetaContent() {
  return generateCSPHeader();
}

/**
 * Security headers configuration
 * @returns {object} Security headers object
 */
export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': generateCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

export default {
  generateCSPHeader,
  getCSPMetaContent,
  getSecurityHeaders
};

