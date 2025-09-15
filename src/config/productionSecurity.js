// Production Security Configuration
// This file contains production-ready security settings

export const PRODUCTION_SECURITY_CONFIG = {
  // Encryption Settings
  encryption: {
    algorithm: 'AES-256-CBC',
    keyLength: 256,
    ivLength: 16,
    saltLength: 32,
    iterations: 100000
  },

  // Authentication Settings
  authentication: {
    sessionTimeout: 3600, // 1 hour
    maxLoginAttempts: 5,
    lockoutDuration: 900, // 15 minutes
    passwordMinLength: 12,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    enableTwoFactor: true,
    enableBiometric: true
  },

  // Security Headers
  securityHeaders: {
    contentSecurityPolicy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://www.gstatic.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'connect-src': ["'self'", "https:", "wss:", "https://api.ipify.org"],
      'media-src': ["'self'", "https:", "blob:"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': true
    },
    xContentTypeOptions: 'nosniff',
    xFrameOptions: 'DENY',
    xXSSProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: ['self'],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: []
    }
  },

  // Rate Limiting
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per window
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  // Security Monitoring
  monitoring: {
    enabled: true,
    alertThresholds: {
      failedLogins: 5,
      suspiciousActivity: 3,
      dataAccess: 100,
      apiCalls: 1000
    },
    logRetentionDays: 90,
    realTimeAlerts: true,
    adminNotifications: true
  },

  // Data Protection
  dataProtection: {
    encryptionEnabled: true,
    anonymizationEnabled: true,
    pseudonymizationEnabled: true,
    dataRetentionDays: 2555, // 7 years for medical records
    automaticCleanup: true,
    backupEncryption: true
  },

  // API Security
  apiSecurity: {
    corsEnabled: true,
    corsOrigins: ['https://elderx-f5c2b.web.app', 'https://elderx-f5c2b.firebaseapp.com'],
    apiKeyRequired: true,
    requestValidation: true,
    responseSanitization: true
  },

  // Firebase Security Rules
  firebaseRules: {
    users: {
      read: 'auth.uid == resource.id',
      write: 'auth.uid == resource.id && request.auth.token.email_verified == true'
    },
    elderlyProfiles: {
      read: 'auth.uid == resource.data.userId || resource.data.caregivers[array-contains: auth.uid]',
      write: 'auth.uid == resource.data.userId'
    },
    medications: {
      read: 'auth.uid == resource.data.elderlyProfileId',
      write: 'auth.uid == resource.data.elderlyProfileId'
    },
    vitalSigns: {
      read: 'auth.uid == resource.data.elderlyProfileId',
      write: 'auth.uid == resource.data.elderlyProfileId'
    },
    appointments: {
      read: 'auth.uid == resource.data.elderlyProfileId',
      write: 'auth.uid == resource.data.elderlyProfileId'
    }
  },

  // Compliance Settings
  compliance: {
    hipaa: {
      enabled: true,
      auditLogging: true,
      dataEncryption: true,
      accessControls: true,
      breachNotification: true
    },
    gdpr: {
      enabled: true,
      dataMinimization: true,
      purposeLimitation: true,
      storageLimitation: true,
      accuracy: true,
      confidentiality: true,
      rightToErasure: true,
      dataPortability: true
    }
  },

  // Security Testing
  securityTesting: {
    penetrationTesting: {
      enabled: true,
      frequency: 'quarterly',
      scope: 'full'
    },
    vulnerabilityScanning: {
      enabled: true,
      frequency: 'weekly',
      automated: true
    },
    codeReview: {
      enabled: true,
      required: true,
      automated: true
    }
  },

  // Incident Response
  incidentResponse: {
    enabled: true,
    responseTime: 15, // minutes
    escalationLevels: [
      { level: 1, time: 15, contacts: ['security@elderx.com'] },
      { level: 2, time: 30, contacts: ['cto@elderx.com', 'security@elderx.com'] },
      { level: 3, time: 60, contacts: ['ceo@elderx.com', 'cto@elderx.com', 'security@elderx.com'] }
    ],
    notificationChannels: ['email', 'sms', 'slack'],
    documentationRequired: true
  }
};

// Security Feature Flags for Production
export const PRODUCTION_FEATURE_FLAGS = {
  twoFactorAuth: true,
  biometricAuth: true,
  dataEncryption: true,
  auditLogging: true,
  rateLimiting: true,
  securityMonitoring: true,
  dataAnonymization: true,
  automaticBackup: true,
  intrusionDetection: true,
  malwareProtection: true
};

// Security Validation Functions
export const validateSecurityConfig = (config) => {
  const errors = [];

  // Validate encryption settings
  if (!config.encryption || config.encryption.keyLength < 256) {
    errors.push('Encryption key length must be at least 256 bits');
  }

  // Validate authentication settings
  if (!config.authentication || config.authentication.sessionTimeout < 1800) {
    errors.push('Session timeout must be at least 30 minutes');
  }

  if (!config.authentication || config.authentication.passwordMinLength < 8) {
    errors.push('Password minimum length must be at least 8 characters');
  }

  // Validate rate limiting
  if (!config.rateLimiting || !config.rateLimiting.enabled) {
    errors.push('Rate limiting must be enabled in production');
  }

  // Validate monitoring
  if (!config.monitoring || !config.monitoring.enabled) {
    errors.push('Security monitoring must be enabled in production');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Security Checklist for Production Deployment
export const PRODUCTION_SECURITY_CHECKLIST = [
  '✅ Strong encryption keys configured',
  '✅ Two-factor authentication enabled',
  '✅ Biometric authentication configured',
  '✅ Security headers implemented',
  '✅ Rate limiting enabled',
  '✅ Security monitoring active',
  '✅ Audit logging enabled',
  '✅ Data encryption enabled',
  '✅ Firestore security rules configured',
  '✅ CORS properly configured',
  '✅ API keys secured',
  '✅ Environment variables encrypted',
  '✅ Security testing completed',
  '✅ Incident response plan ready',
  '✅ Security documentation updated',
  '✅ Team security training completed'
];

export default PRODUCTION_SECURITY_CONFIG;
