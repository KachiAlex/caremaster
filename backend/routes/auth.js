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

// Helper to set the JWT as an httpOnly cookie.
// The token is also returned in the response body for native/Capacitor clients
// that cannot reliably read httpOnly cookies. Web clients should not rely on it.
function setAuthCookie(res, token) {
  const maxAgeMs = parseInt(process.env.JWT_EXPIRES_IN_MS, 10) || (24 * 60 * 60 * 1000);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: maxAgeMs,
  });
}

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

    setAuthCookie(res, token);

    const isNativeClient = req.get('X-Client-Type') === 'native';
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        ...(isNativeClient ? { token } : {}),
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
        institution_id: userRecord ? userRecord.institution_id : null,
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

    // ─── Account lockout check ───
    // After 5 consecutive failed attempts, lock the account for 15 minutes.
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMs = new Date(user.locked_until) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      await recordAttempt(false, user, 'failed_login_locked');
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMin} minute(s).`
      });
    }

    // If the lock period has expired, reset the counter
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await db('users').where({ id: user.id }).update({
        failed_login_count: 0,
        locked_until: null,
      });
      user.failed_login_count = 0;
      user.locked_until = null;
    }

    // Verify password
    let isPasswordValid = false;
    let passwordMigrated = false;
    if (user.password_hash) {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!isPasswordValid) {
      await recordAttempt(false, user, 'failed_login');

      // Increment failed login count and lock if threshold reached
      const newFailedCount = (user.failed_login_count || 0) + 1;
      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        await db('users').where({ id: user.id }).update({
          failed_login_count: newFailedCount,
          locked_until: new Date(Date.now() + LOCK_DURATION_MS),
        });
        return res.status(423).json({
          success: false,
          message: `Account has been locked for 15 minutes due to ${MAX_FAILED_ATTEMPTS} failed login attempts.`
        });
      } else {
        await db('users').where({ id: user.id }).update({
          failed_login_count: newFailedCount,
        });
        const remaining = MAX_FAILED_ATTEMPTS - newFailedCount;
        return res.status(401).json({
          success: false,
          message: `Invalid email or password. ${remaining} attempt(s) remaining before account lockout.`
        });
      }
    }

    // ─── Successful login: reset failed attempt counter ───
    if (user.failed_login_count > 0 || user.locked_until) {
      await db('users').where({ id: user.id }).update({
        failed_login_count: 0,
        locked_until: null,
      });
    }

    // Update last login
    await db('users')
      .where({ id: user.id })
      .update({ last_login: new Date() });

    // Generate JWT token (sessionId is added after session creation below)
    let token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        user_type: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Record successful login attempt
    await db('login_attempts').insert({
      email: user.email,
      user_id: user.id,
      institution_id: user.institution_id,
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
        institution_id: user.institution_id,
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

    // Re-issue token with sessionId embedded so the auth middleware
    // can enforce session validity (logout invalidation, expiry checks)
    token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        user_type: user.user_type,
        sessionId: session.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

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

    setAuthCookie(res, token);

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

    // For client/patient users, merge in their client profile data
    // (date of birth, emergency contact, blood type, etc. live in the
    // clients table, not the users table)
    if (['client', 'patient', 'elderly'].includes(user.user_type)) {
      try {
        const clientRecord = await db('clients').where({ user_id: user.id }).first();
        if (clientRecord) {
          Object.assign(userProfile, {
            clientId: clientRecord.client_id,
            clientDocId: clientRecord.id,
            name: clientRecord.name || clientRecord.full_name,
            fullName: clientRecord.full_name,
            dateOfBirth: clientRecord.date_of_birth,
            gender: clientRecord.gender,
            address: clientRecord.address,
            city: clientRecord.city,
            state: clientRecord.state,
            zipCode: clientRecord.zip_code,
            bloodType: clientRecord.blood_type,
            genotype: clientRecord.genotype,
            careLevel: clientRecord.care_level,
            emergencyContactName: clientRecord.emergency_contact_name,
            emergencyContactPhone: clientRecord.emergency_contact_phone,
            emergencyContactRelationship: clientRecord.emergency_contact_relationship,
            medicalConditions: clientRecord.medical_conditions || [],
            medications: clientRecord.medications || [],
            allergies: clientRecord.allergies || [],
            insuranceProvider: clientRecord.insurance_provider,
            insurancePolicyNumber: clientRecord.insurance_policy_number,
            nationalId: clientRecord.national_id,
            primaryCarePhysician: clientRecord.primary_care_physician,
            physicianPhone: clientRecord.physician_phone,
            notes: clientRecord.notes,
          });
        }
      } catch (clientErr) {
        logger.warn(`Failed to fetch client profile for user ${user.id}:`, clientErr);
      }
    }

    const isNativeClient = req.get('X-Client-Type') === 'native';
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        // Only expose the token in the response body for native/Capacitor clients
        // that cannot read the httpOnly cookie. Web clients use the cookie.
        ...(isNativeClient ? { token } : {}),
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

    // Generate reset token (plaintext — sent to user via email, never stored)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Store only the SHA-256 hash of the token, so a DB leak cannot
    // be used to reset passwords. The plaintext token is sent to the
    // user via email and never persisted.
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    await db('users')
      .where({ id: user.id })
      .update({
        password_reset_token: resetTokenHash,
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

    // Hash the incoming token to compare with the stored hash
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await db('users')
      .where({ password_reset_token: resetTokenHash })
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

    // Invalidate all active sessions so the user must log in again
    // with the new password — any old JWT becomes useless.
    await db('user_sessions')
      .where({ user_id: user.id, active: true })
      .update({ active: false, ended_at: new Date() });

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

// Get user security settings
router.get('/security-settings', authenticateToken, async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        twoFactorEnabled: !!user.two_factor_enabled,
        twoFactorPhone: user.two_factor_phone || null,
        biometricEnabled: !!user.biometric_enabled,
        biometricCredentialId: user.biometric_credential_id || null
      }
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get security settings' });
  }
});

// Update user security settings
router.put('/security-settings', authenticateToken, async (req, res) => {
  try {
    const { twoFactorEnabled, twoFactorPhone, biometricEnabled, biometricCredentialId } = req.body;
    const updateData = {};
    
    if (typeof twoFactorEnabled === 'boolean') {
      updateData.two_factor_enabled = twoFactorEnabled;
    }
    if (twoFactorPhone !== undefined) {
      updateData.two_factor_phone = twoFactorPhone;
    }
    if (typeof biometricEnabled === 'boolean') {
      updateData.biometric_enabled = biometricEnabled;
    }
    if (biometricCredentialId !== undefined) {
      updateData.biometric_credential_id = biometricCredentialId;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    updateData.updated_at = new Date();
    
    await db('users').where({ id: req.user.id }).update(updateData);
    
    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: {
        twoFactorEnabled: updateData.two_factor_enabled !== undefined ? updateData.two_factor_enabled : undefined,
        twoFactorPhone: updateData.two_factor_phone !== undefined ? updateData.two_factor_phone : undefined,
        biometricEnabled: updateData.biometric_enabled !== undefined ? updateData.biometric_enabled : undefined,
        biometricCredentialId: updateData.biometric_credential_id !== undefined ? updateData.biometric_credential_id : undefined
      }
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update security settings' });
  }
});

// ─── Logout endpoint ───
// Invalidates the current session so the JWT can no longer be used,
// even before it expires. The auth middleware checks session validity
// on every request, so a logged-out token is immediately rejected.
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.tokenPayload?.sessionId;
    const userId = req.user.id;

    // Invalidate the session in the database
    if (sessionId) {
      await db('user_sessions')
        .where({ id: sessionId, user_id: userId })
        .update({ active: false, ended_at: new Date() });
    }

    // Also invalidate any other active sessions for this user (optional —
    // comment out if you want to only log out the current device)
    // await db('user_sessions').where({ user_id: userId, active: true }).update({ active: false, ended_at: new Date() });

    // Log the logout
    await db('security_audit_logs').insert({
      user_id: userId,
      user_role: req.user.user_type,
      action: 'logout',
      resource_type: 'session',
      resource_id: sessionId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      institution_id: req.user.institution_id,
      timestamp: new Date()
    });

    logger.info(`User logged out: ${req.user.email}`);

    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
});

// ─── Invalidate all sessions (used after password change/reset) ───
router.post('/invalidate-all-sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await db('user_sessions')
      .where({ user_id: userId, active: true })
      .update({ active: false, ended_at: new Date() });

    await db('security_audit_logs').insert({
      user_id: userId,
      user_role: req.user.user_type,
      action: 'all_sessions_invalidated',
      resource_type: 'session',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      institution_id: req.user.institution_id,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'All sessions invalidated' });
  } catch (error) {
    logger.error('Invalidate sessions error:', error);
    res.status(500).json({ success: false, message: 'Failed to invalidate sessions' });
  }
});

module.exports = router;
