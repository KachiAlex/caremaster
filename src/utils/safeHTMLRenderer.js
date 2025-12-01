/**
 * Safe HTML Renderer Utility
 * SECURITY FIX: Provides safe HTML rendering to prevent XSS attacks
 */

import DOMPurify from 'dompurify';
import { sanitizeText } from './inputValidation';
import logger from './logger';

/**
 * Sanitize HTML content using DOMPurify
 * @param {string} html - HTML string to sanitize
 * @param {object} options - DOMPurify options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    const defaultOptions = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'span', 'div'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true
    };

    const sanitizeOptions = { ...defaultOptions, ...options };
    return DOMPurify.sanitize(html, sanitizeOptions);
  } catch (error) {
    logger.error('HTML sanitization failed', { error: error.message });
    // Fallback: escape HTML entities
    return escapeHTML(html);
  }
}

/**
 * Escape HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Safely render user-generated content
 * @param {string} content - User-generated content
 * @param {object} options - Rendering options
 * @returns {object} React props for safe rendering
 */
export function safeRender(content, options = {}) {
  if (!content) {
    return { children: '' };
  }

  const { allowHTML = false, sanitize = true } = options;

  if (allowHTML && sanitize) {
    // Sanitize HTML before rendering
    const sanitized = sanitizeHTML(content);
    return {
      dangerouslySetInnerHTML: { __html: sanitized }
    };
  } else {
    // Escape and render as plain text
    const escaped = escapeHTML(content);
    return { children: escaped };
  }
}

/**
 * Sanitize and render text content (no HTML)
 * @param {string} text - Text content
 * @returns {string} Sanitized text
 */
export function safeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // First sanitize to remove any HTML
  const sanitized = sanitizeText(text);
  // Then escape any remaining special characters
  return escapeHTML(sanitized);
}

/**
 * Create a safe React component for rendering user content
 * @param {string} content - Content to render
 * @param {object} options - Rendering options
 * @returns {JSX.Element} Safe React element
 */
export function SafeContent({ content, allowHTML = false, className = '', ...props }) {
  if (!content) {
    return null;
  }

  if (allowHTML) {
    const sanitized = sanitizeHTML(content);
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitized }}
        {...props}
      />
    );
  } else {
    const safe = safeText(content);
    return (
      <div className={className} {...props}>
        {safe}
      </div>
    );
  }
}

/**
 * Sanitize object properties that might contain user-generated content
 * @param {object} obj - Object to sanitize
 * @param {array} fields - Fields to sanitize (if empty, sanitize all string fields)
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj, fields = []) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  if (fields.length === 0) {
    // Sanitize all string fields
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string') {
        sanitized[key] = safeText(value);
      }
    }
  } else {
    // Sanitize only specified fields
    for (const field of fields) {
      if (sanitized[field] && typeof sanitized[field] === 'string') {
        sanitized[field] = safeText(sanitized[field]);
      }
    }
  }

  return sanitized;
}

export default {
  sanitizeHTML,
  escapeHTML,
  safeRender,
  safeText,
  SafeContent,
  sanitizeObject
};

