import environmentConfig from '../config/environment';

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

class Logger {
  constructor() {
    this.logLevel = environmentConfig.isDevelopment() ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
    this.logs = [];
    this.maxLogSize = 1000;
  }

  // Set log level
  setLogLevel(level) {
    this.logLevel = level;
  }

  // Debug logging
  debug(message, data = {}) {
    this.log(LOG_LEVELS.DEBUG, 'DEBUG', message, data);
  }

  // Info logging
  info(message, data = {}) {
    this.log(LOG_LEVELS.INFO, 'INFO', message, data);
  }

  // Warning logging
  warn(message, data = {}) {
    this.log(LOG_LEVELS.WARN, 'WARN', message, data);
  }

  // Error logging
  error(message, data = {}) {
    this.log(LOG_LEVELS.ERROR, 'ERROR', message, data);
  }

  // Critical logging
  critical(message, data = {}) {
    this.log(LOG_LEVELS.CRITICAL, 'CRITICAL', message, data);
  }

  // Main logging method
  log(level, levelName, message, data = {}) {
    if (level < this.logLevel) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId()
    };

    // Add to internal log
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Console logging
    this.consoleLog(levelName, message, data);

    // Store in localStorage for persistence
    this.persistLog(logEntry);

    // Send to remote logging service in production
    if (environmentConfig.isProduction() && level >= LOG_LEVELS.ERROR) {
      this.sendToRemoteService(logEntry);
    }
  }

  // Console logging with appropriate methods
  consoleLog(level, message, data) {
    const logMessage = `[${level}] ${message}`;
    
    switch (level) {
      case 'DEBUG':
        console.debug(logMessage, data);
        break;
      case 'INFO':
        console.info(logMessage, data);
        break;
      case 'WARN':
        console.warn(logMessage, data);
        break;
      case 'ERROR':
      case 'CRITICAL':
        console.error(logMessage, data);
        break;
      default:
        console.log(logMessage, data);
    }
  }

  // Persist log to localStorage
  persistLog(logEntry) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('elderx_logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only recent logs
      if (existingLogs.length > this.maxLogSize) {
        existingLogs.splice(0, existingLogs.length - this.maxLogSize);
      }
      
      localStorage.setItem('elderx_logs', JSON.stringify(existingLogs));
    } catch (e) {
      console.warn('Could not persist log to localStorage:', e);
    }
  }

  // Send log to remote service
  async sendToRemoteService(logEntry) {
    try {
      // This would integrate with logging services like LogRocket, DataDog, etc.
      console.log('Sending log to remote service:', logEntry);
      
      // Example integration:
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
    } catch (e) {
      console.error('Failed to send log to remote service:', e);
    }
  }

  // Get current user ID
  getCurrentUserId() {
    try {
      // This would get the current user ID from your auth context
      const user = JSON.parse(localStorage.getItem('elderx_user') || '{}');
      return user.uid || 'anonymous';
    } catch (e) {
      return 'anonymous';
    }
  }

  // Get logs
  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-limit);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    localStorage.removeItem('elderx_logs');
  }

  // Performance logging
  time(label) {
    console.time(label);
  }

  timeEnd(label) {
    console.timeEnd(label);
  }

  // Group logging
  group(label) {
    console.group(label);
  }

  groupEnd() {
    console.groupEnd();
  }

  // Table logging
  table(data) {
    console.table(data);
  }

  // Trace logging
  trace(message) {
    console.trace(message);
  }

  // Count logging
  count(label) {
    console.count(label);
  }

  // Assert logging
  assert(condition, message) {
    console.assert(condition, message);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { LOG_LEVELS };
