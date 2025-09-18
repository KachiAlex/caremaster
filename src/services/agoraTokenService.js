/**
 * Agora Token Service
 * Handles token generation and management for Agora RTC
 */

class AgoraTokenService {
  constructor() {
    this.config = {
      appId: process.env.REACT_APP_AGORA_APP_ID || '43c43dc3e6a44a99b2b75a4997e3b1a4',
      // Remove the expired token - we'll generate new ones or use null for testing
      defaultToken: null,
      tokenExpiration: 3600, // 1 hour in seconds
    };
  }

  /**
   * Generate a temporary token for testing
   * In production, this should call your backend token server
   */
  async generateToken(channelName, uid = 0, role = 'publisher') {
    try {
      // For development/testing, we can use null token (less secure)
      // This works for Agora projects in testing mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 Using null token for development (Agora testing mode)');
        return null;
      }

      // In production, call your backend token generation service
      const response = await this.callTokenServer(channelName, uid, role);
      return response.token;
    } catch (error) {
      console.error('Failed to generate Agora token:', error);
      
      // Fallback to null token for testing
      console.log('🔄 Falling back to null token for testing');
      return null;
    }
  }

  /**
   * Call backend token generation service
   * This would be your actual token server in production
   */
  async callTokenServer(channelName, uid, role) {
    const tokenEndpoint = process.env.REACT_APP_AGORA_TOKEN_ENDPOINT || '/api/agora/token';
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName,
        uid,
        role,
        expiration: this.config.tokenExpiration
      })
    });

    if (!response.ok) {
      throw new Error(`Token server responded with status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Refresh an expired token
   */
  async refreshToken(channelName, uid, role) {
    console.log('🔄 Refreshing Agora token...');
    return await this.generateToken(channelName, uid, role);
  }

  /**
   * Check if token is likely expired based on error
   */
  isTokenExpired(error) {
    const tokenErrors = [
      'CAN_NOT_GET_GATEWAY_SERVER',
      'INVALID_VENDOR_KEY',
      'DYNAMIC_KEY_TIMEOUT',
      'TOKEN_EXPIRED'
    ];
    
    return tokenErrors.some(errorType => 
      error.message?.includes(errorType) || error.code?.includes(errorType)
    );
  }

  /**
   * Get app configuration
   */
  getAppId() {
    return this.config.appId;
  }

  /**
   * Validate Agora configuration
   */
  validateConfig() {
    if (!this.config.appId || this.config.appId === 'your-agora-app-id') {
      throw new Error('Agora App ID is not configured. Please set REACT_APP_AGORA_APP_ID environment variable.');
    }
    return true;
  }
}

// Export singleton instance
export const agoraTokenService = new AgoraTokenService();
export default agoraTokenService;
