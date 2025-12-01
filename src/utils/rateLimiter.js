/**
 * Rate Limiter Utility
 * SECURITY FIX: Implements rate limiting to prevent brute force attacks
 */

import logger from './logger';

class RateLimiter {
  constructor() {
    // Store rate limit data in memory (in production, use Redis or similar)
    this.attempts = new Map();
    this.locks = new Map();
    
    // Default configuration
    this.defaultConfig = {
      maxAttempts: 5,           // Maximum attempts per window
      windowMs: 15 * 60 * 1000, // 15 minutes
      lockoutDuration: 30 * 60 * 1000, // 30 minutes lockout
      cleanupInterval: 60 * 1000 // Cleanup every minute
    };
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if an action is allowed for a given key
   * @param {string} key - Unique identifier (email, IP, etc.)
   * @param {object} config - Rate limit configuration
   * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(key, config = {}) {
    const limitConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    
    // Check if key is locked
    const lockInfo = this.locks.get(key);
    if (lockInfo && lockInfo.until > now) {
      const remaining = Math.ceil((lockInfo.until - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: lockInfo.until,
        locked: true,
        lockoutDuration: remaining
      };
    }
    
    // Remove lock if expired
    if (lockInfo && lockInfo.until <= now) {
      this.locks.delete(key);
    }
    
    // Get or create attempt record
    let attemptRecord = this.attempts.get(key);
    
    if (!attemptRecord) {
      attemptRecord = {
        count: 0,
        resetTime: now + limitConfig.windowMs,
        firstAttempt: now
      };
      this.attempts.set(key, attemptRecord);
    }
    
    // Reset if window expired
    if (now >= attemptRecord.resetTime) {
      attemptRecord.count = 0;
      attemptRecord.resetTime = now + limitConfig.windowMs;
      attemptRecord.firstAttempt = now;
    }
    
    // Check if limit exceeded
    if (attemptRecord.count >= limitConfig.maxAttempts) {
      // Lock the account
      this.lockAccount(key, limitConfig.lockoutDuration);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: attemptRecord.resetTime,
        locked: true,
        lockoutDuration: Math.ceil(limitConfig.lockoutDuration / 1000)
      };
    }
    
    // Increment attempt count
    attemptRecord.count++;
    
    const remaining = Math.max(0, limitConfig.maxAttempts - attemptRecord.count);
    const resetTime = attemptRecord.resetTime;
    
    return {
      allowed: true,
      remaining,
      resetTime,
      locked: false
    };
  }

  /**
   * Lock an account for a specified duration
   * @param {string} key - Unique identifier
   * @param {number} durationMs - Lockout duration in milliseconds
   */
  lockAccount(key, durationMs = null) {
    const lockoutDuration = durationMs || this.defaultConfig.lockoutDuration;
    const until = Date.now() + lockoutDuration;
    
    this.locks.set(key, {
      until,
      lockedAt: Date.now(),
      duration: lockoutDuration
    });
    
    logger.warn('Account locked due to rate limit', {
      key: key.substring(0, 10) + '...',
      until: new Date(until).toISOString(),
      duration: Math.ceil(lockoutDuration / 1000) + 's'
    });
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Unique identifier
   */
  reset(key) {
    this.attempts.delete(key);
    this.locks.delete(key);
    
    logger.info('Rate limit reset', { key: key.substring(0, 10) + '...' });
  }

  /**
   * Get remaining attempts for a key
   * @param {string} key - Unique identifier
   * @returns {object} Rate limit status
   */
  getStatus(key) {
    const lockInfo = this.locks.get(key);
    const attemptRecord = this.attempts.get(key);
    const now = Date.now();
    
    if (lockInfo && lockInfo.until > now) {
      return {
        locked: true,
        remaining: 0,
        lockoutDuration: Math.ceil((lockInfo.until - now) / 1000),
        resetTime: lockInfo.until
      };
    }
    
    if (!attemptRecord || now >= attemptRecord.resetTime) {
      return {
        locked: false,
        remaining: this.defaultConfig.maxAttempts,
        resetTime: now + this.defaultConfig.windowMs
      };
    }
    
    return {
      locked: false,
      remaining: Math.max(0, this.defaultConfig.maxAttempts - attemptRecord.count),
      resetTime: attemptRecord.resetTime
    };
  }

  /**
   * Cleanup expired records
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.defaultConfig.cleanupInterval);
  }

  /**
   * Remove expired rate limit records
   */
  cleanup() {
    const now = Date.now();
    
    // Cleanup expired attempts
    for (const [key, record] of this.attempts.entries()) {
      if (now >= record.resetTime) {
        this.attempts.delete(key);
      }
    }
    
    // Cleanup expired locks
    for (const [key, lockInfo] of this.locks.entries()) {
      if (now >= lockInfo.until) {
        this.locks.delete(key);
      }
    }
  }

  /**
   * Get client IP address (for IP-based rate limiting)
   * @returns {string} IP address
   */
  getClientIP() {
    // In a real application, this would get the IP from the request
    // For client-side, we'll use a placeholder
    return 'client-side';
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;

