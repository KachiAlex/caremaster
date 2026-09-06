const jwt = require('jsonwebtoken');
const db = require('../utils/database');
const { logger } = require('../utils/logger');

/**
 * Compute the list of patient/client IDs that a caregiver or doctor is allowed to access.
 * Results are cached on req.user so the expensive queries are run once per request instead of
 * once per data query in scopeQuery.
 */
async function getAccessiblePatientIds(user) {
  try {
    if (['caregiver', 'nurse'].includes(user.user_type)) {
      const assignments = await db('assignments')
        .where({ caregiver_id: user.id })
        .select('patient_id', 'client_id');
      const ids = new Set();
      for (const a of assignments) {
        if (a.patient_id) ids.add(a.patient_id);
        if (a.client_id) ids.add(a.client_id);
      }
      return Array.from(ids);
    }

    if (user.user_type === 'doctor') {
      const [prescriptions, consultations, teleAppts] = await Promise.all([
        db('prescriptions').where({ doctor_id: user.id }).select('patient_id'),
        db('consultations').where({ doctor_id: user.id }).select('client_id'),
        db('telemedicine_appointments').where({ doctor_id: user.id }).select('client_id'),
      ]);
      const ids = new Set();
      prescriptions.forEach(r => { if (r.patient_id) ids.add(r.patient_id); });
      consultations.forEach(r => { if (r.client_id) ids.add(r.client_id); });
      teleAppts.forEach(r => { if (r.client_id) ids.add(r.client_id); });
      return Array.from(ids);
    }
  } catch (error) {
    logger.error('Failed to compute accessible patient IDs:', error);
  }
  return [];
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    // EventSource cannot set custom headers, so allow token via query string
    const token = bearerToken || req.query?.token || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    // Explicitly restrict to HS256 to prevent algorithm confusion attacks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
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

    // Check if user is locked out (account lockout enforcement)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked due to repeated failed login attempts. Please try again later.' 
      });
    }

    // Enforce session validity: check that the session for this token is still active.
    // The session token hash is stored in user_sessions when the user logs in.
    if (decoded.sessionId) {
      const session = await db('user_sessions')
        .where({ id: decoded.sessionId, user_id: user.id })
        .first();

      if (!session || !session.active) {
        return res.status(401).json({ 
          success: false, 
          message: 'Session has been invalidated. Please log in again.' 
        });
      }

      // Check session expiry
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        // Mark session as inactive
        await db('user_sessions').where({ id: session.id }).update({ active: false });
        return res.status(401).json({ 
          success: false, 
          message: 'Session has expired. Please log in again.' 
        });
      }
    }

    // Compute accessible patient IDs once per request for efficient authorization
    const accessiblePatientIds = await getAccessiblePatientIds(user);

    // Strip sensitive fields from req.user to prevent accidental exposure
    req.user = {
      id: user.id,
      email: user.email,
      user_type: user.user_type,
      institution_id: user.institution_id,
      is_active: user.is_active,
      is_verified: user.is_verified,
      firebase_uid: user.firebase_uid,
      two_factor_enabled: user.two_factor_enabled,
      display_name: user.display_name,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      profile_picture: user.profile_picture,
      photo_url: user.photo_url,
      roles: user.roles,
      department: user.department,
      specialization: user.specialization,
      onboarding_complete: user.onboarding_complete,
      status: user.status,
      accessiblePatientIds,
    };
    req.tokenPayload = decoded; // Keep for logout/token invalidation
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired. Please log in again.' 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    logger.error('Authentication error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Authentication failed' 
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
  // 2FA is disabled for CareMaster — pass through
  // TODO: Re-enable when 2FA is rolled out to users
  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  require2FA
};
