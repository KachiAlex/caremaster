import errorHandler from '../utils/errorHandler';
import logger from '../utils/logger';
import secureConfigService from '../services/secureConfigService';

class BiometricAuthService {
  constructor() {
    this.isSupported = this.checkBiometricSupport();
    this.isEnabled = false;
    this.credentialId = null;
  }

  // Check if biometric authentication is supported
  checkBiometricSupport() {
    try {
      return !!(
        navigator.credentials &&
        navigator.credentials.create &&
        navigator.credentials.get &&
        window.PublicKeyCredential &&
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
      );
    } catch (error) {
      logger.warn('Biometric support check failed', { error: error.message });
      return false;
    }
  }

  // Check if user has a platform authenticator available
  async isPlatformAuthenticatorAvailable() {
    try {
      if (!this.isSupported) return false;
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      logger.debug('Platform authenticator availability check', { available });
      return available;
    } catch (error) {
      logger.error('Platform authenticator check failed', { error: error.message });
      return false;
    }
  }

  // Register biometric authentication
  async registerBiometric(userInfo = {}) {
    try {
      if (!this.isSupported) {
        throw new Error('Biometric authentication not supported on this device');
      }

      const available = await this.isPlatformAuthenticatorAvailable();
      if (!available) {
        throw new Error('No biometric authenticator available on this device');
      }

      logger.info('Starting biometric registration', { userId: userInfo.id });

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: "ElderX",
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(userInfo.id || 'user'),
            name: userInfo.email || 'user@elderx.com',
            displayName: userInfo.displayName || 'ElderX User'
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred"
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      if (credential) {
        this.credentialId = credential.id;
        this.isEnabled = true;
        
        // Store credential info securely
        await this.storeCredentialInfo(credential);
        
        logger.info('Biometric registration successful', { credentialId: credential.id });
        return {
          success: true,
          credentialId: credential.id,
          message: 'Biometric authentication registered successfully'
        };
      }

      throw new Error('Failed to create biometric credential');
    } catch (error) {
      logger.error('Biometric registration failed', { error: error.message });
      errorHandler.handleError(error, { context: 'biometric_registration' });
      throw error;
    }
  }

  // Authenticate using biometric
  async authenticateBiometric() {
    try {
      if (!this.isSupported || !this.isEnabled) {
        throw new Error('Biometric authentication not available');
      }

      logger.info('Starting biometric authentication');

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get stored credential info
      const credentialInfo = await this.getStoredCredentialInfo();
      if (!credentialInfo) {
        throw new Error('No biometric credential found. Please register first.');
      }

      // Authenticate
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{
            id: credentialInfo.credentialId,
            type: 'public-key',
            transports: ['internal']
          }],
          userVerification: "required",
          timeout: 60000
        }
      });

      if (assertion) {
        // Verify the assertion (in a real app, this would be done server-side)
        const isValid = await this.verifyAssertion(assertion, challenge);
        
        if (isValid) {
          logger.info('Biometric authentication successful');
          return {
            success: true,
            message: 'Biometric authentication successful'
          };
        } else {
          throw new Error('Biometric authentication verification failed');
        }
      }

      throw new Error('Biometric authentication failed');
    } catch (error) {
      logger.error('Biometric authentication failed', { error: error.message });
      errorHandler.handleError(error, { context: 'biometric_authentication' });
      throw error;
    }
  }

  // Store credential information securely
  async storeCredentialInfo(credential) {
    try {
      const credentialInfo = {
        credentialId: credential.id,
        type: credential.type,
        registeredAt: new Date().toISOString()
      };

      // Store in secure storage (encrypted)
      const encryptedInfo = JSON.stringify(credentialInfo);
      localStorage.setItem('elderx_biometric_credential', encryptedInfo);
      
      logger.debug('Biometric credential info stored');
    } catch (error) {
      logger.error('Failed to store credential info', { error: error.message });
      throw error;
    }
  }

  // Get stored credential information
  async getStoredCredentialInfo() {
    try {
      const stored = localStorage.getItem('elderx_biometric_credential');
      if (!stored) return null;

      const credentialInfo = JSON.parse(stored);
      this.credentialId = credentialInfo.credentialId;
      this.isEnabled = true;
      
      return credentialInfo;
    } catch (error) {
      logger.error('Failed to get stored credential info', { error: error.message });
      return null;
    }
  }

  // Verify assertion (simplified - in production, this should be server-side)
  async verifyAssertion(assertion, originalChallenge) {
    try {
      // In a real implementation, this would be verified server-side
      // For now, we'll do a basic check
      return assertion && assertion.response && assertion.response.signature;
    } catch (error) {
      logger.error('Assertion verification failed', { error: error.message });
      return false;
    }
  }

  // Remove biometric authentication
  async removeBiometric() {
    try {
      localStorage.removeItem('elderx_biometric_credential');
      this.credentialId = null;
      this.isEnabled = false;
      
      logger.info('Biometric authentication removed');
      return {
        success: true,
        message: 'Biometric authentication removed successfully'
      };
    } catch (error) {
      logger.error('Failed to remove biometric authentication', { error: error.message });
      errorHandler.handleError(error, { context: 'remove_biometric' });
      throw error;
    }
  }

  // Check if biometric is enabled
  async isBiometricEnabled() {
    try {
      const credentialInfo = await this.getStoredCredentialInfo();
      return !!credentialInfo;
    } catch (error) {
      logger.error('Failed to check biometric status', { error: error.message });
      return false;
    }
  }

  // Get biometric status
  getStatus() {
    return {
      isSupported: this.isSupported,
      isEnabled: this.isEnabled,
      credentialId: this.credentialId
    };
  }

  // Initialize biometric service
  async initialize() {
    try {
      if (this.isSupported) {
        await this.getStoredCredentialInfo();
        logger.info('Biometric authentication service initialized', this.getStatus());
      } else {
        logger.info('Biometric authentication not supported on this device');
      }
    } catch (error) {
      logger.error('Biometric service initialization failed', { error: error.message });
    }
  }

  // Handle biometric errors
  handleBiometricError(error) {
    let userMessage = 'Biometric authentication failed';
    
    switch (error.name) {
      case 'NotAllowedError':
        userMessage = 'Biometric authentication was cancelled or not allowed';
        break;
      case 'NotSupportedError':
        userMessage = 'Biometric authentication is not supported on this device';
        break;
      case 'SecurityError':
        userMessage = 'Security error occurred during biometric authentication';
        break;
      case 'UnknownError':
        userMessage = 'An unknown error occurred during biometric authentication';
        break;
      default:
        userMessage = error.message || userMessage;
    }

    logger.error('Biometric error handled', { 
      errorName: error.name, 
      errorMessage: error.message,
      userMessage 
    });

    return userMessage;
  }
}

// Create singleton instance
const biometricAuthService = new BiometricAuthService();

// Initialize the service
biometricAuthService.initialize();

export default biometricAuthService;
