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

module.exports = router;
