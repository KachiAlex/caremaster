import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';
import secureConfigService from '../services/secureConfigService';

class SecurityMonitoringService {
  constructor() {
    this.alerts = [];
    this.threats = [];
    this.monitoringEnabled = true;
    this.alertThresholds = {
      failedLogins: 5,
      suspiciousActivity: 3,
      dataAccess: 100,
      apiCalls: 1000
    };
    this.alertCallbacks = [];
  }

  // Initialize security monitoring
  initialize() {
    try {
      this.setupEventListeners();
      this.startPeriodicChecks();
      logger.info('Security monitoring service initialized');
    } catch (error) {
      logger.error('Security monitoring initialization failed', { error: error.message });
      errorHandler.handleError(error, { context: 'security_monitoring_init' });
    }
  }

  // Setup event listeners for security monitoring
  setupEventListeners() {
    // Monitor authentication events
    window.addEventListener('beforeunload', () => {
      this.logSecurityEvent('SESSION_END', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    });

    // Monitor focus/blur events for session tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logSecurityEvent('SESSION_PAUSE', {
          timestamp: new Date().toISOString()
        });
      } else {
        this.logSecurityEvent('SESSION_RESUME', {
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor network errors
    window.addEventListener('error', (event) => {
      this.logSecurityEvent('CLIENT_ERROR', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      });
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logSecurityEvent('UNHANDLED_REJECTION', {
        reason: event.reason?.toString(),
        timestamp: new Date().toISOString()
      });
    });
  }

  // Start periodic security checks
  startPeriodicChecks() {
    // Check for suspicious activity every 5 minutes
    setInterval(() => {
      this.performSecurityChecks();
    }, 5 * 60 * 1000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 60 * 60 * 1000);
  }

  // Log security events
  logSecurityEvent(eventType, details = {}) {
    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getCurrentUserId(),
        sessionId: this.getSessionId(),
        ...details
      };

      // Store event locally
      this.storeEvent(event);

      // Check for threats
      this.analyzeEvent(event);

      // Send to monitoring service if enabled
      if (this.monitoringEnabled) {
        this.sendToMonitoringService(event);
      }

      logger.debug('Security event logged', { eventType, eventId: event.id });
    } catch (error) {
      logger.error('Failed to log security event', { error: error.message });
    }
  }

  // Analyze events for security threats
  analyzeEvent(event) {
    try {
      const threats = [];

      // Check for multiple failed logins
      if (event.type === 'LOGIN_FAILED') {
        const recentFailures = this.getRecentEvents('LOGIN_FAILED', 15 * 60 * 1000); // 15 minutes
        if (recentFailures.length >= this.alertThresholds.failedLogins) {
          threats.push({
            type: 'BRUTE_FORCE_ATTEMPT',
            severity: 'HIGH',
            description: `Multiple failed login attempts detected (${recentFailures.length})`,
            events: recentFailures
          });
        }
      }

      // Check for suspicious data access patterns
      if (event.type === 'DATA_ACCESS') {
        const recentAccess = this.getRecentEvents('DATA_ACCESS', 60 * 60 * 1000); // 1 hour
        if (recentAccess.length >= this.alertThresholds.dataAccess) {
          threats.push({
            type: 'EXCESSIVE_DATA_ACCESS',
            severity: 'MEDIUM',
            description: `Excessive data access detected (${recentAccess.length} accesses)`,
            events: recentAccess
          });
        }
      }

      // Check for API abuse
      if (event.type === 'API_CALL') {
        const recentCalls = this.getRecentEvents('API_CALL', 60 * 60 * 1000); // 1 hour
        if (recentCalls.length >= this.alertThresholds.apiCalls) {
          threats.push({
            type: 'API_ABUSE',
            severity: 'MEDIUM',
            description: `Excessive API calls detected (${recentCalls.length} calls)`,
            events: recentCalls
          });
        }
      }

      // Check for unusual location access
      if (event.type === 'LOCATION_ACCESS' && event.location) {
        const recentLocations = this.getRecentEvents('LOCATION_ACCESS', 24 * 60 * 60 * 1000); // 24 hours
        const uniqueLocations = new Set(recentLocations.map(e => e.location)).size;
        if (uniqueLocations > 5) {
          threats.push({
            type: 'UNUSUAL_LOCATION_PATTERN',
            severity: 'LOW',
            description: `Unusual location access pattern detected (${uniqueLocations} locations)`,
            events: recentLocations
          });
        }
      }

      // Process detected threats
      threats.forEach(threat => {
        this.handleThreat(threat);
      });

    } catch (error) {
      logger.error('Event analysis failed', { error: error.message });
    }
  }

  // Handle detected threats
  handleThreat(threat) {
    try {
      // Add to threats list
      this.threats.push({
        ...threat,
        id: this.generateEventId(),
        detectedAt: new Date().toISOString(),
        status: 'ACTIVE'
      });

      // Create alert
      const alert = {
        id: this.generateEventId(),
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        message: threat.description,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE',
        actions: this.getRecommendedActions(threat)
      };

      this.alerts.push(alert);

      // Notify callbacks
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          logger.error('Alert callback failed', { error: error.message });
        }
      });

      // Log threat
      logger.warn('Security threat detected', { 
        threatType: threat.type, 
        severity: threat.severity,
        threatId: threat.id 
      });

      // Take immediate action for high severity threats
      if (threat.severity === 'HIGH') {
        this.handleHighSeverityThreat(threat);
      }

    } catch (error) {
      logger.error('Threat handling failed', { error: error.message });
    }
  }

  // Handle high severity threats
  handleHighSeverityThreat(threat) {
    try {
      switch (threat.type) {
        case 'BRUTE_FORCE_ATTEMPT':
          // Lock account temporarily
          this.lockAccount(threat.events[0].userId);
          break;
        
        case 'UNAUTHORIZED_ACCESS':
          // Force logout
          this.forceLogout();
          break;
        
        case 'DATA_BREACH_ATTEMPT':
          // Alert administrators
          this.alertAdministrators(threat);
          break;
        
        default:
          logger.warn('Unknown high severity threat type', { type: threat.type });
      }
    } catch (error) {
      logger.error('High severity threat handling failed', { error: error.message });
    }
  }

  // Get recommended actions for threats
  getRecommendedActions(threat) {
    const actions = [];

    switch (threat.type) {
      case 'BRUTE_FORCE_ATTEMPT':
        actions.push('LOCK_ACCOUNT', 'NOTIFY_USER', 'ALERT_ADMIN');
        break;
      
      case 'EXCESSIVE_DATA_ACCESS':
        actions.push('REVIEW_ACCESS', 'NOTIFY_USER');
        break;
      
      case 'API_ABUSE':
        actions.push('RATE_LIMIT', 'REVIEW_USAGE');
        break;
      
      case 'UNUSUAL_LOCATION_PATTERN':
        actions.push('VERIFY_IDENTITY', 'NOTIFY_USER');
        break;
      
      default:
        actions.push('INVESTIGATE', 'MONITOR');
    }

    return actions;
  }

  // Store event locally
  storeEvent(event) {
    try {
      const events = this.getStoredEvents();
      events.push(event);
      
      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      localStorage.setItem('elderx_security_events', JSON.stringify(events));
    } catch (error) {
      logger.error('Failed to store security event', { error: error.message });
    }
  }

  // Get stored events
  getStoredEvents() {
    try {
      const stored = localStorage.getItem('elderx_security_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to get stored events', { error: error.message });
      return [];
    }
  }

  // Get recent events of a specific type
  getRecentEvents(eventType, timeWindow) {
    const events = this.getStoredEvents();
    const cutoffTime = Date.now() - timeWindow;
    
    return events.filter(event => 
      event.type === eventType && 
      new Date(event.timestamp).getTime() > cutoffTime
    );
  }

  // Send event to monitoring service
  async sendToMonitoringService(event) {
    try {
      // In production, this would send to a real monitoring service
      // For now, we'll just log it
      logger.info('Security event sent to monitoring service', { 
        eventType: event.type,
        eventId: event.id 
      });
    } catch (error) {
      logger.error('Failed to send event to monitoring service', { error: error.message });
    }
  }

  // Perform periodic security checks
  performSecurityChecks() {
    try {
      // Check for inactive sessions
      this.checkInactiveSessions();
      
      // Check for suspicious patterns
      this.checkSuspiciousPatterns();
      
      // Check system integrity
      this.checkSystemIntegrity();
      
    } catch (error) {
      logger.error('Security checks failed', { error: error.message });
    }
  }

  // Check for inactive sessions
  checkInactiveSessions() {
    const lastActivity = this.getLastActivityTime();
    const inactiveTime = Date.now() - lastActivity;
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    if (inactiveTime > maxInactiveTime) {
      this.logSecurityEvent('SESSION_TIMEOUT', {
        inactiveTime: inactiveTime,
        maxInactiveTime: maxInactiveTime
      });
    }
  }

  // Check for suspicious patterns
  checkSuspiciousPatterns() {
    const events = this.getStoredEvents();
    const recentEvents = events.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 60 * 60 * 1000 // Last hour
    );

    // Check for rapid-fire events
    const rapidEvents = this.detectRapidFireEvents(recentEvents);
    if (rapidEvents.length > 0) {
      this.logSecurityEvent('RAPID_FIRE_DETECTED', {
        eventCount: rapidEvents.length,
        timeWindow: '1 hour'
      });
    }
  }

  // Check system integrity
  checkSystemIntegrity() {
    // Check if critical services are running
    const criticalServices = ['auth', 'database', 'encryption'];
    criticalServices.forEach(service => {
      if (!this.isServiceRunning(service)) {
        this.logSecurityEvent('SERVICE_DOWN', {
          service: service,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Detect rapid-fire events
  detectRapidFireEvents(events) {
    const rapidThreshold = 10; // 10 events in 1 minute
    const timeWindow = 60 * 1000; // 1 minute
    
    const rapidEvents = [];
    for (let i = 0; i < events.length; i++) {
      const eventTime = new Date(events[i].timestamp).getTime();
      const windowStart = eventTime - timeWindow;
      const windowEnd = eventTime + timeWindow;
      
      const eventsInWindow = events.filter(e => {
        const eTime = new Date(e.timestamp).getTime();
        return eTime >= windowStart && eTime <= windowEnd;
      });
      
      if (eventsInWindow.length >= rapidThreshold) {
        rapidEvents.push(...eventsInWindow);
      }
    }
    
    return rapidEvents;
  }

  // Utility methods
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getCurrentUserId() {
    // This would get the current user ID from auth context
    return 'current_user_id';
  }

  getSessionId() {
    return sessionStorage.getItem('elderx_session_id') || 'unknown';
  }

  getLastActivityTime() {
    return parseInt(localStorage.getItem('elderx_last_activity') || Date.now());
  }

  isServiceRunning(service) {
    // This would check if the service is actually running
    return true; // Simplified for now
  }

  // Public methods
  addAlertCallback(callback) {
    this.alertCallbacks.push(callback);
  }

  removeAlertCallback(callback) {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  getActiveAlerts() {
    return this.alerts.filter(alert => alert.status === 'ACTIVE');
  }

  getActiveThreats() {
    return this.threats.filter(threat => threat.status === 'ACTIVE');
  }

  dismissAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.status = 'DISMISSED';
      alert.dismissedAt = new Date().toISOString();
    }
  }

  resolveThreat(threatId) {
    const threat = this.threats.find(t => t.id === threatId);
    if (threat) {
      threat.status = 'RESOLVED';
      threat.resolvedAt = new Date().toISOString();
    }
  }

  cleanupOldAlerts() {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
    this.threats = this.threats.filter(threat => 
      new Date(threat.detectedAt).getTime() > cutoffTime
    );
  }

  // Emergency actions
  lockAccount(userId) {
    logger.warn('Account locked due to security threat', { userId });
    // Implementation would lock the account
  }

  forceLogout() {
    logger.warn('Forcing logout due to security threat');
    // Implementation would force logout
  }

  alertAdministrators(threat) {
    logger.error('ALERT: Security threat requiring admin attention', { threat });
    // Implementation would alert administrators
  }
}

// Create singleton instance
const securityMonitoringService = new SecurityMonitoringService();

// Initialize the service
securityMonitoringService.initialize();

export default securityMonitoringService;
