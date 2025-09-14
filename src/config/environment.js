// Environment configuration service
class EnvironmentConfig {
  constructor() {
    this.config = {
      // Firebase Configuration
      firebase: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID
      },

      // AI Service Configuration
      ai: {
        openai: {
          apiKey: process.env.REACT_APP_OPENAI_API_KEY,
          model: 'gpt-4'
        },
        googleAI: {
          apiKey: process.env.REACT_APP_GOOGLE_AI_API_KEY
        },
        anthropic: {
          apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY
        }
      },

      // Agora Video Calling
      agora: {
        appId: process.env.REACT_APP_AGORA_APP_ID,
        appCertificate: process.env.REACT_APP_AGORA_APP_CERTIFICATE
      },

      // Environment
      environment: process.env.REACT_APP_ENVIRONMENT || 'development',
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL,

      // Feature Flags
      features: {
        aiFeatures: process.env.REACT_APP_ENABLE_AI_FEATURES === 'true',
        voiceCommands: process.env.REACT_APP_ENABLE_VOICE_COMMANDS === 'true',
        emergencyAlerts: process.env.REACT_APP_ENABLE_EMERGENCY_ALERTS === 'true',
        medicationReminders: process.env.REACT_APP_ENABLE_MEDICATION_REMINDERS === 'true'
      },

      // Analytics
      analytics: {
        googleAnalyticsId: process.env.REACT_APP_GOOGLE_ANALYTICS_ID
      },

      // SMS Service
      sms: {
        twilioAccountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: process.env.REACT_APP_TWILIO_PHONE_NUMBER
      },

      // Email Service
      email: {
        sendgridApiKey: process.env.REACT_APP_SENDGRID_API_KEY,
        fromEmail: process.env.REACT_APP_FROM_EMAIL || 'noreply@elderx.com'
      },

      // Security
      security: {
        encryptionKey: process.env.REACT_APP_ENCRYPTION_KEY,
        jwtSecret: process.env.REACT_APP_JWT_SECRET
      }
    };
  }

  // Get configuration value
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  // Check if feature is enabled
  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  // Check if we're in development
  isDevelopment() {
    return this.config.environment === 'development';
  }

  // Check if we're in production
  isProduction() {
    return this.config.environment === 'production';
  }

  // Get API base URL
  getApiBaseUrl() {
    return this.config.apiBaseUrl;
  }

  // Validate required configuration
  validate() {
    const required = [
      'firebase.apiKey',
      'firebase.projectId',
      'firebase.authDomain'
    ];

    const missing = required.filter(path => !this.get(path));
    
    if (missing.length > 0) {
      console.warn('Missing required environment variables:', missing);
      return false;
    }

    return true;
  }

  // Get all configuration (for debugging)
  getAll() {
    return this.config;
  }
}

// Create singleton instance
const environmentConfig = new EnvironmentConfig();

// Validate configuration on load
if (!environmentConfig.validate()) {
  console.warn('Environment configuration validation failed. Some features may not work properly.');
}

export default environmentConfig;
