const jwt = require('jsonwebtoken');
const db = require('../utils/database');
const { logger } = require('../utils/logger');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const require2FA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Only bursar and admin need 2FA
    if (['bursar', 'admin'].includes(req.user.user_type)) {
      if (!req.user.two_factor_enabled) {
        return res.status(403).json({ 
          success: false, 
          message: 'Two-factor authentication required' 
        });
      }

      // Check if 2FA token is provided in header
      const twoFactorToken = req.headers['x-2fa-token'];
      if (!twoFactorToken) {
        return res.status(403).json({ 
          success: false, 
          message: 'Two-factor authentication token required' 
        });
      }

      // Verify 2FA token (implementation would go here)
      // For now, we'll skip the actual verification
    }

    next();
  } catch (error) {
    logger.error('2FA verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Two-factor authentication verification failed' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  require2FA
};
