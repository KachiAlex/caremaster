/**
 * Browser Compatibility Utilities
 *
 * Provides safe fallbacks for web APIs that are missing or inconsistent
 * across browsers (especially older Safari, Samsung Internet, and IE).
 * Each function checks for feature support before using the native API
 * and falls back to a graceful alternative.
 */

// ─── Clipboard ───────────────────────────────────────────────────────

/**
 * Copy text to clipboard with fallback for browsers without the async
 * Clipboard API (Safari < 13.1, IE, older Samsung Internet).
 */
export async function copyToClipboard(text) {
  // Modern async Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fall through to legacy method (clipboard API can fail in non-secure contexts)
      console.warn('Clipboard API failed, using fallback:', err.message);
    }
  }

  // Legacy fallback using a temporary textarea + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Read text from clipboard with fallback.
 */
export async function readFromClipboard() {
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.warn('Clipboard read failed:', err.message);
      return '';
    }
  }
  return '';
}

// ─── Crypto ──────────────────────────────────────────────────────────

/**
 * Generate a random UUID with fallback for browsers without crypto.randomUUID.
 */
export function generateUUID() {
  // Modern: crypto.randomUUID (Chrome 92+, Safari 15.4+, Firefox 95+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: crypto.getRandomValues + manual UUID v4 formatting
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  // Last resort: Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get random bytes with fallback.
 */
export function getRandomBytes(length) {
  const arr = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return arr;
}

// ─── Intl ────────────────────────────────────────────────────────────

/**
 * Format currency with fallback for browsers without full Intl support
 * (older Safari, IE, some mobile browsers).
 */
export function formatCurrencySafe(amount, currency = 'USD', locale = 'en-US') {
  const value = Number(amount) || 0;

  if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (err) {
      // Fall through to manual formatting
    }
  }

  // Manual fallback
  const symbols = { USD: '$', EUR: '€', GBP: '£', NGN: '₦', KES: 'KSh', GHS: '₵' };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format a date with fallback for browsers without Intl.DateTimeFormat.
 */
export function formatDateSafe(date, options = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      return new Intl.DateTimeFormat(options.locale || 'en-US', options).format(d);
    } catch (err) {
      // Fall through
    }
  }

  // Manual fallback
  return d.toLocaleDateString();
}

// ─── ResizeObserver ──────────────────────────────────────────────────

/**
 * Create a ResizeObserver with fallback for browsers that don't support it.
 * Returns a mock observer that does nothing if the API is unavailable.
 */
export function createResizeObserver(callback) {
  if (typeof ResizeObserver !== 'undefined') {
    return new ResizeObserver(callback);
  }

  // Fallback: poll-based mock (does nothing, prevents crashes)
  return {
    observe() {},
    unobserve() {},
    disconnect() {},
  };
}

// ─── IntersectionObserver ─────────────────────────────────────────────

/**
 * Create an IntersectionObserver with fallback.
 */
export function createIntersectionObserver(callback, options = {}) {
  if (typeof IntersectionObserver !== 'undefined') {
    return new IntersectionObserver(callback, options);
  }

  // Fallback: immediately call callback with isIntersecting=true for all entries
  return {
    observe(target) {
      callback([{ target, isIntersecting: true, intersectionRatio: 1 }], this);
    },
    unobserve() {},
    disconnect() {},
    takeRecords() { return []; },
  };
}

// ─── Smooth Scroll ────────────────────────────────────────────────────

/**
 * Smooth scroll with fallback for browsers without the behavior option.
 */
export function smoothScrollTo(element, options = {}) {
  if (typeof element.scroll === 'function') {
    try {
      element.scroll({ behavior: 'smooth', ...options });
      return;
    } catch (err) {
      // Fall through to manual
    }
  }
  // Fallback: instant jump
  if (options.top !== undefined) element.scrollTop = options.top;
  if (options.left !== undefined) element.scrollLeft = options.left;
}

// ─── Browser Detection ───────────────────────────────────────────────

/**
 * Detect browser and its version from the user agent string.
 * Uses feature detection where possible, falls back to UA sniffing.
 */
export function detectBrowser() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /android/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isChrome = /chrome|crios/i.test(ua) && !/edge|edg/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);
  const isEdge = /edge|edg/i.test(ua);
  const isSamsung = /samsungbrowser/i.test(ua);
  const isIE = /trident|msie/i.test(ua);

  return { isIOS, isAndroid, isSafari, isChrome, isFirefox, isEdge, isSamsung, isIE };
}

/**
 * Check if the current browser supports a given CSS feature.
 */
export function supportsCSS(property, value) {
  if (typeof CSS === 'undefined' || !CSS.supports) {
    return false;
  }
  if (value) {
    return CSS.supports(property, value);
  }
  return CSS.supports(property);
}

/**
 * Check if the viewport matches a media query.
 */
export function matchesMedia(query) {
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(query).matches;
  }
  return false;
}

export default {
  copyToClipboard,
  readFromClipboard,
  generateUUID,
  getRandomBytes,
  formatCurrencySafe,
  formatDateSafe,
  createResizeObserver,
  createIntersectionObserver,
  smoothScrollTo,
  detectBrowser,
  supportsCSS,
  matchesMedia,
};
