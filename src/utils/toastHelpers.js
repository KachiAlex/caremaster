/**
 * Centralized toast notification helpers.
 *
 * Features:
 * - Deduplication: identical messages within 3s are shown only once
 * - Simpler, consistent language (no "successfully" suffix, no verbose details)
 * - Max 3 toasts visible at once (older ones are dismissed)
 * - Consistent autoClose timing by type
 */
import { toast } from 'react-toastify';

const DEDUP_WINDOW_MS = 3000;
const MAX_VISIBLE = 3;

// Track recent toast messages to deduplicate
const recentMessages = new Map(); // key: `${type}:${message}` -> timestamp

// Track active toast IDs so we can dismiss oldest when exceeding MAX_VISIBLE
const activeToastIds = [];

/**
 * Prune the recent-messages map of expired entries.
 */
function pruneRecent() {
  const now = Date.now();
  for (const [key, ts] of recentMessages) {
    if (now - ts > DEDUP_WINDOW_MS) {
      recentMessages.delete(key);
    }
  }
}

/**
 * Dismiss oldest toasts if we're at the visible limit.
 */
function enforceMaxVisible() {
  while (activeToastIds.length >= MAX_VISIBLE) {
    const oldestId = activeToastIds.shift();
    try { toast.dismiss(oldestId); } catch { /* noop */ }
  }
}

/**
 * Core: show a deduplicated toast.
 * @param {'success'|'error'|'info'|'warning'} type
 * @param {string} message - already-simplified message
 * @param {object} [options] - extra react-toastify options
 */
function showToast(type, message, options = {}) {
  const key = `${type}:${message}`;
  const now = Date.now();

  pruneRecent();

  // Deduplicate: if the same message was shown recently, skip
  if (recentMessages.has(key)) {
    return;
  }
  recentMessages.set(key, now);

  enforceMaxVisible();

  const autoClose = options.autoClose
    ?? (type === 'error' ? 6000 : type === 'warning' ? 6000 : 4000);

  const toastId = toast[type](message, {
    ...options,
    autoClose,
    onClose: () => {
      const idx = activeToastIds.indexOf(toastId);
      if (idx > -1) activeToastIds.splice(idx, 1);
      if (options.onClose) options.onClose();
    },
  });

  activeToastIds.push(toastId);
}

/**
 * Public helpers — use these everywhere instead of raw `toast.success(...)` etc.
 * Messages should be short and action-focused, e.g. "Care log saved", not
 * "Care log saved successfully".
 */
export const notify = {
  success: (message, options) => showToast('success', message, options),
  error: (message, options) => showToast('error', message, options),
  info: (message, options) => showToast('info', message, options),
  warning: (message, options) => showToast('warning', message, options),

  /** Show a toast from an Error object. */
  errorFrom: (error, fallback = 'Something went wrong', options) => {
    const msg = error?.message || fallback;
    showToast('error', msg, options);
  },
};

export default notify;
