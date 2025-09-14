import encryptionService from './encryptionService';
import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';

class SecureConfigService {
  constructor() {
    this.config = this.loadSecureConfig();
    this.validateConfig();
  }

  // Load and validate secure configuration
  loadSecureConfig() {
    const config = {
      // Firebase Configuration (encrypted in production)
      firebase: {
        apiKey: this.getSecureValue('REACT_APP_FIREBASE_API_KEY'),
        authDomain: this.getSecureValue('REACT_APP_FIREBASE_AUTH_DOMAIN'),
        projectId: this.getSecureValue('REACT_APP_FIREBASE_PROJECT_ID'),
        storageBucket: this.getSecureValue('REACT_APP_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.getSecureValue('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.getSecureValue('REACT_APP_FIREBASE_APP_ID')
      },

      // AI API Keys (encrypted)
      ai: {
        openai: this.getSecureValue('REACT_APP_OPENAI_API_KEY'),
        google: this.getSecureValue('REACT_APP_GOOGLE_AI_API_KEY'),
        anthropic: this.getSecureValue('REACT_APP_ANTHROPIC_API_KEY')
      },

      // Security Configuration
      security: {
        encryptionKey: this.getSecureValue('REACT_APP_ENCRYPTION_KEY'),
        jwtSecret: this.getSecureValue('REACT_APP_JWT_SECRET'),
        sessionTimeout: parseInt(this.getSecureValue('REACT_APP_SESSION_TIMEOUT', '3600')),
        maxLoginAttempts: parseInt(this.getSecureValue('REACT_APP_MAX_LOGIN_ATTEMPTS', '5')),
        lockoutDuration: parseInt(this.getSecureValue('REACT_APP_LOCKOUT_DURATION', '900'))
      },

      // Feature Flags
      features: {
        twoFactorAuth: this.getSecureValue('REACT_APP_ENABLE_2FA', 'false') === 'true',
        biometricAuth: this.getSecureValue('REACT_APP_ENABLE_BIOMETRIC', 'false') === 'true',
        dataEncryption: this.getSecureValue('REACT_APP_ENABLE_ENCRYPTION', 'true') === 'true',
        auditLogging: this.getSecureValue('REACT_APP_ENABLE_AUDIT_LOG', 'true') === 'true',
        rateLimiting: this.getSecureValue('REACT_APP_ENABLE_RATE_LIMITING', 'true') === 'true'
      },

      // Environment
      environment: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development'
    };

    return config;
  }

  // Get secure value with fallback and validation
  getSecureValue(key, defaultValue = null) {
    const value = process.env[key] || defaultValue;
    
    // In production, decrypt sensitive values
    if (this.isProduction && this.isEncryptedValue(value)) {
      try {
        return encryptionService.decrypt(value);
      } catch (error) {
        logger.error(`Failed to decrypt config value: ${key}`, { error });
        return defaultValue;
      }
    }
    
    return value;
  }

  // Check if value is encrypted
  isEncryptedValue(value) {
    return typeof value === 'string' && value.startsWith('enc:');
  }

  // Validate configuration
  validateConfig() {
    const requiredKeys = [
      'REACT_APP_FIREBASE_API_KEY',
      'REACT_APP_FIREBASE_PROJECT_ID'
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0) {
      logger.error('Missing required configuration keys', { missingKeys });
      throw new Error(`Missing required configuration: ${missingKeys.join(', ')}`);
    }

    // Validate Firebase config
    if (!this.config.firebase.apiKey || !this.config.firebase.projectId) {
      throw new Error('Invalid Firebase configuration');
    }

    // Validate security config in production
    if (this.config.isProduction) {
      if (!this.config.security.encryptionKey) {
        throw new Error('Encryption key is required in production');
      }
      
      if (!encryptionService.validateKeyStrength(this.config.security.encryptionKey)) {
        throw new Error('Encryption key does not meet security requirements');
      }
    }

    logger.info('Configuration validated successfully');
  }

  // Get configuration value
  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value;
  }

  // Get Firebase config
  getFirebaseConfig() {
    return this.config.firebase;
  }

  // Get AI API keys
  getAIKeys() {
    return this.config.ai;
  }

  // Get security config
  getSecurityConfig() {
    return this.config.security;
  }

  // Get feature flags
  getFeatureFlags() {
    return this.config.features;
  }

  // Check if feature is enabled
  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  // Get environment info
  getEnvironment() {
    return {
      environment: this.config.environment,
      isProduction: this.config.isProduction,
      isDevelopment: this.config.isDevelopment
    };
  }

  // Encrypt sensitive config for storage
  encryptConfig(config) {
    const sensitiveKeys = [
      'apiKey',
      'secret',
      'password',
      'token',
      'key'
    ];

    const encrypted = { ...config };
    
    Object.keys(encrypted).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        if (typeof encrypted[key] === 'string') {
          encrypted[key] = `enc:${encryptionService.encrypt(encrypted[key])}`;
        }
      }
    });

    return encrypted;
  }

  // Decrypt config values
  decryptConfig(encryptedConfig) {
    const decrypted = { ...encryptedConfig };
    
    Object.keys(decrypted).forEach(key => {
      if (typeof decrypted[key] === 'string' && decrypted[key].startsWith('enc:')) {
        try {
          decrypted[key] = encryptionService.decrypt(decrypted[key].substring(4));
        } catch (error) {
          logger.warn(`Failed to decrypt config key: ${key}`, { error });
        }
      }
    });

    return decrypted;
  }

  // Generate secure configuration for deployment
  generateSecureConfig() {
    const config = {
      firebase: this.config.firebase,
      security: {
        sessionTimeout: this.config.security.sessionTimeout,
        maxLoginAttempts: this.config.security.maxLoginAttempts,
        lockoutDuration: this.config.security.lockoutDuration
      },
      features: this.config.features,
      environment: this.config.environment
    };

    return this.encryptConfig(config);
  }
}

// Create singleton instance
const secureConfigService = new SecureConfigService();

export default secureConfigService;
