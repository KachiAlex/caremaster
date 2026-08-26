const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../utils/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { logger } = require('../utils/logger');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// Register new student
router.post('/register', validateRequest(schemas.register), async (req, res) => {
  try {
    const { matric_number, email, password, first_name, last_name, department, level, session } = req.body;

    // Check if user already exists
    const existingUser = await db('users')
      .where({ matric_number })
      .orWhere({ email })
      .first();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this matric number or email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Generate verification token
    const verification_token = crypto.randomBytes(32).toString('hex');
    const verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const [user] = await db('users')
      .insert({
        matric_number,
        email,
        password_hash,
        first_name,
        last_name,
        department,
        level,
        session,
        verification_token,
        verification_expires
      })
      .returning(['id', 'matric_number', 'email', 'first_name', 'last_name', 'department', 'level', 'session']);

    // Create wallet for user
    await db('wallets').insert({
      user_id: user.id,
      balance: 0.00
    });

    // Log registration
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'register',
      resource_type: 'user',
      resource_id: user.id,
      new_values: { matric_number, email, department, level, session },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info(`New user registered: ${matric_number}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification.',
      data: {
        user: {
          id: user.id,
          matric_number: user.matric_number,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          department: user.department,
          level: user.level,
          session: user.session
        }
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Create staff account (admin only — used by AddCaregiverModal)
router.post('/create-staff', authenticateToken, async (req, res) => {
  try {
    // Only admins can create staff accounts
    if (!['admin', 'institutionAdmin', 'super-admin', 'superadmin', 'super_admin'].includes(req.user.user_type)) {
      return res.status(403).json({ success: false, message: 'Only admins can create staff accounts' });
    }

    const { email, password, first_name, last_name, phone, user_type, institution_id, department } = req.body;

    if (!email || !password || !first_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and first name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await db('users')
      .whereRaw('LOWER(email) = LOWER(?)', [email.trim().toLowerCase()])
      .first();

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Generate a unique matric_number (not used for staff login, but column is required)
    const matric_number = `STAFF/${Date.now().toString().slice(-6)}`;

    // Create user with staff fields
    const [user] = await db('users')
      .insert({
        matric_number,
        email: email.trim().toLowerCase(),
        password_hash,
        first_name,
        last_name: last_name || '',
        phone: phone || null,
        department: department || 'Healthcare',
        level: '100',
        session: '2024/2025',
        user_type: user_type || 'caregiver',
        institution_id: institution_id || null,
        is_active: true,
        is_verified: true,
        status: 'active'
      })
      .returning(['id', 'email', 'first_name', 'last_name', 'user_type', 'institution_id', 'phone']);

    logger.info(`Staff account created by admin ${req.user.email}: ${email} (${user_type})`);

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      data: {
        user: {
          id: user.id,
          uid: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          userType: user.user_type,
          institutionId: user.institution_id,
          status: 'active'
        }
      }
    });

  } catch (error) {
    logger.error('Create staff error:', error);
    res.status(500).json({ success: false, message: 'Failed to create staff account' });
  }
});

// Create a client login account (admin only — links a users auth account to an existing clients record)
// Body: { clientId, email, password, first_name, last_name, institution_id, phone? }
router.post('/create-client', authenticateToken, async (req, res) => {
  try {
    // Only admins can create client login accounts
    if (!['admin', 'institutionAdmin', 'super-admin', 'superadmin', 'super_admin'].includes(req.user.user_type)) {
      return res.status(403).json({ success: false, message: 'Only admins can create client accounts' });
    }

    const { clientId, email, password, first_name, last_name, institution_id, phone } = req.body;

    if (!clientId || !email || !password || !first_name) {
      return res.status(400).json({ success: false, message: 'clientId, email, password, and first name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Verify the client record exists
    const clientRecord = await db('clients').where({ id: clientId }).first();
    if (!clientRecord) {
      return res.status(404).json({ success: false, message: 'Client record not found' });
    }

    // Check if a users account already exists for this email
    const existingUser = await db('users')
      .whereRaw('LOWER(email) = LOWER(?)', [email.trim().toLowerCase()])
      .first();
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    // matric_number is required by the schema but not used for email login
    const matric_number = `CLIENT/${Date.now().toString().slice(-6)}`;

    // Create the users account and link it to the client record atomically
    const result = await db.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          matric_number,
          email: email.trim().toLowerCase(),
          password_hash,
          first_name,
          last_name: last_name || '',
          phone: phone || null,
          department: 'Client',
          level: '100',
          session: '2024/2025',
          user_type: 'client',
          institution_id: institution_id || clientRecord.institution_id || null,
          is_active: true,
          is_verified: true,
          status: 'active'
        })
        .returning(['id', 'email', 'first_name', 'last_name', 'user_type', 'institution_id', 'phone']);

      // Link the new users account to the client profile
      await trx('clients')
        .where({ id: clientId })
        .update({ user_id: user.id, updated_at: new Date() });

      return user;
    });

    logger.info(`Client login account created by admin ${req.user.email}: ${email} (linked to client ${clientId})`);

    res.status(201).json({
      success: true,
      message: 'Client login account created successfully',
      data: {
        user: {
          id: result.id,
          uid: result.id,
          email: result.email,
          firstName: result.first_name,
          lastName: result.last_name,
          phone: result.phone,
          userType: result.user_type,
          institutionId: result.institution_id,
          status: 'active'
        }
      }
    });

  } catch (error) {
    logger.error('Create client account error:', error);
    res.status(500).json({ success: false, message: 'Failed to create client account' });
  }
});

// Login
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { matric_number, password } = req.body;

    // Find user
    const user = await db('users')
      .where({ matric_number, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        matric_number: user.matric_number,
        user_type: user.user_type 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log login
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info(`User logged in: ${matric_number}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          matric_number: user.matric_number,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          department: user.department,
          level: user.level,
          session: user.session,
          user_type: user.user_type,
          two_factor_enabled: user.two_factor_enabled
        }
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Login with email and password
router.post('/email-login', validateRequest(schemas.emailLogin), async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const recordAttempt = async (success, userRecord, action) => {
      await db('login_attempts').insert({
        email: email.trim().toLowerCase(),
        user_id: userRecord ? userRecord.id : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        success,
        timestamp: new Date()
      });

      await db('security_audit_logs').insert({
        user_id: userRecord ? userRecord.id : null,
        user_role: userRecord ? userRecord.user_type : null,
        action,
        resource_type: 'user',
        resource_id: userRecord ? userRecord.id : email,
        ip_address: ipAddress,
        user_agent: userAgent,
        institution_id: userRecord ? userRecord.institution_id : null,
        timestamp: new Date()
      });
    };

    // Find user by email
    const user = await db('users')
      .whereRaw('LOWER(email) = LOWER(?)', [email.trim().toLowerCase()])
      .first();

    if (!user) {
      await recordAttempt(false, null, 'failed_login');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      await recordAttempt(false, user, 'failed_login');
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
      await recordAttempt(false, user, 'failed_login');
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Verify password
    let isPasswordValid = false;
    let passwordMigrated = false;
    if (user.password_hash) {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isPasswordValid) {
      await recordAttempt(false, user, 'failed_login');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        user_type: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Record successful login attempt
    await db('login_attempts').insert({
      email: user.email,
      user_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      success: true,
      timestamp: new Date()
    });

    // Log to security audit log
    await db('security_audit_logs').insert({
      user_id: user.id,
      user_role: user.user_type,
      action: 'login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      institution_id: user.institution_id,
      timestamp: new Date()
    });

    // Create a new active session for the user
    await db('user_sessions')
      .where({ user_id: user.id, active: true })
      .update({ active: false, ended_at: new Date() });

    const [session] = await db('user_sessions')
      .insert({
        user_id: user.id,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip,
        active: true,
        last_activity: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
      })
      .returning('*');

    // Ensure a two-factor auth row exists for the user
    await db('two_factor_auth')
      .insert({
        id: user.id,
        user_id: user.id,
        email: user.email,
        enabled: false
      })
      .onConflict('id')
      .merge(['email']);

    // Log session creation
    await db('security_audit_logs').insert({
      user_id: user.id,
      user_role: user.user_type,
      action: 'session_created',
      resource_type: 'session',
      resource_id: session.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      institution_id: user.institution_id,
      timestamp: new Date()
    });

    // Legacy audit log
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'login',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info(`User logged in via email: ${user.email}`);

    // Build user profile response
    const userProfile = {
      id: user.id,
      uid: user.firebase_uid || user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name || `${user.first_name} ${user.last_name}`.trim(),
      phone: user.phone,
      photo_url: user.photo_url,
      userType: user.user_type,
      roles: user.roles || [user.user_type],
      institutionId: user.institution_id,
      department: user.department,
      specialization: user.specialization,
      onboardingComplete: user.onboarding_complete,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      two_factor_enabled: user.two_factor_enabled
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userProfile
      }
    });

  } catch (error) {
    logger.error('Email login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Setup 2FA for bursar/admin
router.post('/setup-2fa', authenticateToken, requireRole(['bursar', 'admin']), async (req, res) => {
  try {
    const user = req.user;

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${user.first_name} ${user.last_name} (${user.matric_number})`,
      issuer: process.env.TOTP_ISSUER || 'Niger Delta University'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Update user with secret (but don't enable yet)
    await db('users')
      .where({ id: user.id })
      .update({ two_factor_secret: secret.base32 });

    res.json({
      success: true,
      message: '2FA setup initiated',
      data: {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      }
    });

  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: '2FA setup failed'
    });
  }
});

// Verify and enable 2FA
router.post('/verify-2fa', authenticateToken, requireRole(['bursar', 'admin']), async (req, res) => {
  try {
    const { token } = req.body;
    const user = req.user;

    if (!user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        message: '2FA not set up. Please setup 2FA first.'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    // Enable 2FA
    await db('users')
      .where({ id: user.id })
      .update({ two_factor_enabled: true });

    // Log 2FA enablement
    await db('audit_logs').insert({
      user_id: user.id,
      action: 'enable_2fa',
      resource_type: 'user',
      resource_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });

  } catch (error) {
    logger.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: '2FA verification failed'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Get wallet balance
    const wallet = await db('wallets')
      .where({ user_id: user.id })
      .first();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          matric_number: user.matric_number,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          department: user.department,
          level: user.level,
          session: user.session,
          user_type: user.user_type,
          two_factor_enabled: user.two_factor_enabled,
          last_login: user.last_login
        },
        wallet: {
          balance: wallet ? wallet.balance : 0,
          currency: wallet ? wallet.currency : 'NGN'
        }
      }
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Get current user profile (full - for frontend auth)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const userProfile = {
      id: user.id,
      uid: user.firebase_uid || user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name || `${user.first_name} ${user.last_name}`.trim(),
      phone: user.phone,
      photo_url: user.photo_url,
      userType: user.user_type,
      roles: user.roles || [user.user_type],
      institutionId: user.institution_id,
      department: user.department,
      specialization: user.specialization,
      onboardingComplete: user.onboarding_complete,
      status: user.status,
      is_active: user.is_active,
      is_verified: user.is_verified,
      two_factor_enabled: user.two_factor_enabled
    };

    res.json({
      success: true,
      data: { user: userProfile }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Forgot Password - Send reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    
    // Always return success to prevent user enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db('users')
      .where({ id: user.id })
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires
      });

    // Send email
    const resetLink = `${process.env.FRONTEND_URL || 'https://getcaremaster.com'}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      resetLink,
      userName: user.first_name
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  }
});

// Reset Password - Verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const user = await db('users')
      .where({ password_reset_token: token })
      .andWhere('password_reset_expires', '>', new Date())
      .first();

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null
      });

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
  }
});

// Public license status check (no auth required - used during login)
router.get('/license-status/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    if (!institutionId) {
      return res.json({ success: true, active: false, reason: 'no_institution_id' });
    }

    const licenses = await db('licenses')
      .where({ institution_id: institutionId })
      .orderBy('ends_at', 'desc')
      .limit(1);

    if (!licenses || licenses.length === 0) {
      return res.json({ success: true, active: false, reason: 'no_license' });
    }

    const license = licenses[0];
    const now = new Date();
    const startDate = new Date(license.starts_at);
    const endDate = new Date(license.ends_at);

    const isActive = license.active === true && startDate <= now && endDate >= now;

    let reason = 'inactive';
    if (license.active !== true) {
      reason = license.suspended_at ? 'license_suspended' : 'license_inactive';
    } else if (endDate < now) {
      reason = 'license_expired';
    } else if (startDate > now) {
      reason = 'license_not_started';
    }

    res.json({
      success: true,
      active: isActive,
      reason: isActive ? 'active' : reason,
      license: {
        id: license.id,
        institutionId: license.institution_id,
        licenseKey: license.license_key,
        plan: license.plan,
        seats: license.seats,
        startsAt: license.starts_at,
        endsAt: license.ends_at,
        status: license.status,
        active: license.active
      }
    });
  } catch (error) {
    logger.error('License status check error:', error);
    res.json({ success: true, active: false, reason: 'error', error: error.message });
  }
});

module.exports = router;
