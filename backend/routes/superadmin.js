const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { sendWelcomeEmail } = require('../services/emailService');
const db = require('../utils/database');

const router = express.Router();

// All superadmin routes require authentication and super_admin role
router.use(authenticateToken);
router.use(requireRole(['super_admin', 'superadmin', 'super-admin', 'admin']));

// Parse a role field that may be a Postgres array string, JSON array, or comma-separated string
const parseRoleField = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map(r => String(r).trim().replace(/^["']|["']$/g, '').toLowerCase());
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  const s = value.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      return JSON.parse(s)
        .filter(Boolean)
        .map(r => String(r).trim().toLowerCase());
    } catch (e) {
      // fall through to comma splitting
    }
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    return inner
      .split(',')
      .map(r => r.trim().replace(/^["']|["']$/g, '').toLowerCase())
      .filter(Boolean);
  }
  return s.split(',').map(r => r.trim()).filter(Boolean);
};

const buildUserRoles = (user) => {
  const fromRoles = parseRoleField(user?.roles);
  const fromRole = parseRoleField(user?.role);
  const fromType = parseRoleField(user?.type);
  const combined = [...new Set([...fromRoles, ...fromRole, ...fromType])].filter(Boolean);
  if (combined.length > 0) return combined;
  return user?.user_type ? [String(user.user_type).trim().toLowerCase()] : [];
};

// Get all institutions
router.get('/institutions', async (req, res) => {
  try {
    const institutions = await db('institutions')
      .select('*')
      .orderBy('created_at', 'desc');

    // Map snake_case DB columns to camelCase fields expected by frontend
    const mappedInstitutions = institutions.map(i => ({
      id: i.id,
      name: i.name,
      email: i.email,
      phone: i.phone,
      address: i.address,
      city: i.city,
      state: i.state,
      country: i.country,
      zipCode: i.zip_code,
      domain: i.domain,
      notes: i.notes,
      active: i.active,
      plan: i.plan,
      seats: i.seats,
      status: i.status,
      features: i.features,
      licenseStartsAt: i.license_starts_at,
      licenseEndsAt: i.license_ends_at,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    res.json({
      success: true,
      data: mappedInstitutions
    });
  } catch (error) {
    logger.error('Failed to fetch institutions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutions'
    });
  }
});

// Get a single institution by ID
router.get('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let resolvedId = id;

    // Validate UUID format for PostgreSQL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      // Non-UUID ID (likely Firestore ID) - check mapping table
      const mapping = await db('institution_id_mappings')
        .where({ firestore_id: id })
        .first();

      if (mapping) {
        resolvedId = mapping.postgres_uuid;
        logger.debug('Mapped Firestore ID to PostgreSQL UUID');
      } else {
        return res.status(404).json({
          success: false,
          message: 'Institution not found'
        });
      }
    }

    const institution = await db('institutions')
      .where({ id: resolvedId })
      .first();

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: institution.id,
        name: institution.name,
        email: institution.email,
        phone: institution.phone,
        address: institution.address,
        city: institution.city,
        state: institution.state,
        country: institution.country,
        zipCode: institution.zip_code,
        domain: institution.domain,
        notes: institution.notes,
        active: institution.active,
        plan: institution.plan,
        seats: institution.seats,
        status: institution.status,
        features: institution.features,
        licenseStartsAt: institution.license_starts_at,
        licenseEndsAt: institution.license_ends_at,
        createdAt: institution.created_at,
        updatedAt: institution.updated_at
      }
    });
  } catch (error) {
    logger.error('Failed to fetch institution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institution'
    });
  }
});

// Get all licenses
router.get('/licenses', async (req, res) => {
  try {
    const licenses = await db('licenses')
      .select('*')
      .orderBy('created_at', 'desc');

    // Map snake_case DB columns to camelCase fields expected by frontend
    const mappedLicenses = licenses.map(l => ({
      id: l.id,
      institutionId: l.institution_id,
      licenseKey: l.license_key,
      plan: l.plan,
      seats: l.seats,
      startsAt: l.starts_at,
      endsAt: l.ends_at,
      status: l.status,
      active: l.active,
      features: l.features,
      suspendedAt: l.suspended_at,
      activatedAt: l.activated_at,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
      // These may not exist in DB but frontend expects them
      price: l.price || null,
      currency: l.currency || null,
      billingCycle: l.billing_cycle || null
    }));

    res.json({
      success: true,
      data: mappedLicenses
    });
  } catch (error) {
    logger.error('Failed to fetch licenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch licenses'
    });
  }
});

// Create a new user with a specified role
router.post('/users', async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType, institutionId, phone, department, sendEmail } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    const validUserTypes = [
      'admin', 'super-admin', 'caregiver', 'doctor', 'nurse',
      'pharmacist', 'client', 'elderly', 'patient', 'partner', 'institution_admin', 'bursar', 'student'
    ];
    const resolvedType = (userType || 'caregiver').toLowerCase();
    if (!validUserTypes.includes(resolvedType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid user type. Must be one of: ${validUserTypes.join(', ')}`
      });
    }

    const existingUser = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const matric_number = `CM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [user] = await db('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`,
        matric_number,
        user_type: resolvedType,
        department: department || null,
        institution_id: institutionId || null,
        phone: phone || null,
        is_active: true,
        is_verified: true
      })
      .returning(['id', 'email', 'first_name', 'last_name', 'user_type', 'matric_number']);

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'create_user',
      resource_type: 'user',
      resource_id: user.id,
      details: { email, userType: resolvedType, firstName, lastName },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    logger.info(`New user created by superadmin: ${email} (${resolvedType})`);

    if (sendEmail !== false) {
      try {
        const institution = institutionId
          ? await db('institutions').where({ id: institutionId }).first()
          : null;
        await sendWelcomeEmail({
          to: user.email,
          userName: `${firstName} ${lastName}`,
          institutionName: institution ? institution.name : null
        });
      } catch (emailErr) {
        logger.error('Failed to send welcome email:', emailErr);
      }
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        displayName: `${user.first_name} ${user.last_name}`,
        userType: user.user_type,
        matricNumber: user.matric_number,
        active: true,
        verified: true
      }
    });
  } catch (error) {
    logger.error('Failed to create user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await db('users')
      .select('*')
      .orderBy('created_at', 'desc');

    // Map snake_case DB columns to camelCase fields expected by frontend
    const mappedUsers = users.map(u => {
      // Parse roles from JSON string or use as-is if already an array
      let roles = u.roles;
      if (typeof roles === 'string') {
        try { roles = JSON.parse(roles); } catch (e) { roles = []; }
      }
      if (!Array.isArray(roles)) { roles = []; }
      // Ensure primary userType is included in roles
      if (u.user_type && !roles.includes(u.user_type)) {
        roles = [...roles, u.user_type];
      }

      return {
        id: u.id,
        email: u.email,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || null,
        displayName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || null,
        firstName: u.first_name,
        lastName: u.last_name,
        userType: u.user_type,
        type: u.user_type,
        role: u.user_type,
        active: u.is_active,
        isActive: u.is_active,
        verified: u.is_verified,
        lastLogin: u.last_login,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        institutionId: u.institution_id || null,
        matricNumber: u.matric_number,
        department: u.department,
        level: u.level,
        session: u.session,
        roles
      };
    });

    res.json({
      success: true,
      data: mappedUsers
    });
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [totalInstitutions, activeInstitutions, totalLicenses, activeLicenses, totalUsers] = await Promise.all([
      db('institutions').count('* as count').first(),
      db('institutions').where({ active: true }).count('* as count').first(),
      db('licenses').count('* as count').first(),
      db('licenses').where({ active: true }).count('* as count').first(),
      db('users').count('* as count').first()
    ]);

    res.json({
      success: true,
      data: {
        totalInstitutions: parseInt(totalInstitutions.count),
        activeInstitutions: parseInt(activeInstitutions.count),
        totalLicenses: parseInt(totalLicenses.count),
        activeLicenses: parseInt(activeLicenses.count),
        totalUsers: parseInt(totalUsers.count)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// Update a license
router.put('/licenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dbUpdates = {};
    if (updates.institutionId !== undefined) dbUpdates.institution_id = updates.institutionId;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.seats !== undefined) dbUpdates.seats = updates.seats;
    if (updates.endsAt !== undefined && updates.endsAt) dbUpdates.ends_at = new Date(updates.endsAt);
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.features !== undefined && updates.features !== null) dbUpdates.features = JSON.stringify(updates.features);

    if (Object.keys(dbUpdates).length === 0) {
      return res.json({ success: true, message: 'No changes to update' });
    }

    await db('licenses')
      .where({ id })
      .update(dbUpdates);

    const updated = await db('licenses')
      .where({ id })
      .first();

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    logger.error('Failed to update license:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update license'
    });
  }
});

// Get license status for an institution
router.get('/license/status/:institutionId', async (req, res) => {
  try {
    const { institutionId } = req.params;
    
    if (!institutionId) {
      return res.json({
        success: false,
        active: false,
        reason: 'no_institution_id'
      });
    }

    let resolvedId = institutionId;

    // Validate UUID format for PostgreSQL
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(institutionId)) {
      // Non-UUID institution ID (likely Firestore ID) - check mapping table
      const mapping = await db('institution_id_mappings')
        .where({ firestore_id: institutionId })
        .first();

      if (mapping) {
        resolvedId = mapping.postgres_uuid;
        logger.debug('Mapped Firestore institution ID to PostgreSQL UUID');
      } else {
        return res.json({
          success: true,
          active: false,
          reason: 'no_license'
        });
      }
    }

    const licenses = await db('licenses')
      .where({ institution_id: resolvedId })
      .orderBy('ends_at', 'desc')
      .limit(1);

    if (!licenses || licenses.length === 0) {
      return res.json({
        success: true,
        active: false,
        reason: 'no_license'
      });
    }

    const license = licenses[0];
    const now = new Date();
    const startDate = new Date(license.starts_at);
    const endDate = new Date(license.ends_at);

    // Check if license is active
    const isActive = license.active === true && 
                    startDate <= now && 
                    endDate >= now;

    let reason = 'inactive';
    if (license.active !== true) {
      reason = license.suspended ? 'license_suspended' : 'license_inactive';
    } else if (endDate < now) {
      reason = 'license_expired';
    } else if (startDate > now) {
      reason = 'license_not_started';
    }

    res.json({
      success: true,
      active: isActive,
      reason: isActive ? 'active' : reason,
      license: license
    });
  } catch (error) {
    logger.error('Failed to fetch license status:', error);
    res.status(500).json({
      success: false,
      active: false,
      reason: 'error',
      error: error.message
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await db('audit_logs')
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to fetch audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// Get user profile by email (for Firebase-authenticated users to get PostgreSQL institution_id)
router.get('/users/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email query parameter is required'
      });
    }

    const user = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get institution details if user has one
    let institution = null;
    if (user.institution_id) {
      institution = await db('institutions')
        .where({ id: user.institution_id })
        .first();
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        type: user.type,
        role: user.role,
        isActive: user.is_active,
        status: user.status || (user.is_active ? 'active' : 'inactive'),
        onboardingComplete: user.onboarding_complete === true,
        profileComplete: user.profile_complete === true,
        institutionId: user.institution_id,
        institutionName: institution ? institution.name : null,
        institutionActive: institution ? institution.active : null,
        roles: buildUserRoles(user)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch user by email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update a user (toggle active, update fields)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dbUpdates = {};
    if (updates.active !== undefined) dbUpdates.is_active = updates.active;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.displayName !== undefined) {
      const parts = updates.displayName.split(' ');
      dbUpdates.first_name = parts[0] || '';
      dbUpdates.last_name = parts.slice(1).join(' ') || '';
    }
    if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
    if (updates.type !== undefined) dbUpdates.user_type = updates.type;
    if (updates.roles !== undefined && Array.isArray(updates.roles)) {
      dbUpdates.roles = JSON.stringify(updates.roles);
    }
    if (updates.institutionId !== undefined) dbUpdates.institution_id = updates.institutionId;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;

    if (Object.keys(dbUpdates).length === 0) {
      return res.json({ success: true, message: 'No changes to update' });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let updateQuery = db('users');
    let selectQuery = db('users');
    if (isUuid) {
      updateQuery = updateQuery.where({ id });
      selectQuery = selectQuery.where({ id });
    } else {
      updateQuery = updateQuery.where({ firebase_uid: id });
      selectQuery = selectQuery.where({ firebase_uid: id });
    }

    await updateQuery.update(dbUpdates);

    const updated = await selectQuery.first();

    res.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
        displayName: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
        firstName: updated.first_name,
        lastName: updated.last_name,
        userType: updated.user_type,
        type: updated.user_type,
        role: updated.user_type,
        active: updated.is_active,
        isActive: updated.is_active,
        institutionId: updated.institution_id,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    logger.error('Failed to update user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = db('users');
    if (isUuid) {
      query = query.where({ id });
    } else {
      query = query.where({ firebase_uid: id });
    }

    const deleted = await query.del();

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Bulk update users
router.post('/users/bulk-update', async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required'
      });
    }

    const dbUpdates = {};
    if (updates.active !== undefined) dbUpdates.is_active = updates.active;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
    if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;

    if (Object.keys(dbUpdates).length === 0) {
      return res.json({ success: true, message: 'No changes to update' });
    }

    await db('users')
      .whereIn('id', ids)
      .update(dbUpdates);

    res.json({
      success: true,
      message: `Updated ${ids.length} user(s)`
    });
  } catch (error) {
    logger.error('Failed to bulk update users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update users'
    });
  }
});

// Bulk delete users
router.post('/users/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ids array is required'
      });
    }

    const deleted = await db('users')
      .whereIn('id', ids)
      .del();

    res.json({
      success: true,
      message: `Deleted ${deleted} user(s)`
    });
  } catch (error) {
    logger.error('Failed to bulk delete users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete users'
    });
  }
});

// One-time import: Migrate users from Firestore export JSON
router.post('/import-users', async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'users array is required'
      });
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Map Firestore user fields to PostgreSQL schema
        const userData = {
          email: (user.email || '').toLowerCase(),
          first_name: user.firstName || user.first_name || (user.displayName || user.name || '').split(' ')[0] || 'Unknown',
          last_name: user.lastName || user.last_name || (user.displayName || user.name || '').split(' ').slice(1).join(' ') || '',
          display_name: user.displayName || user.display_name || user.name || '',
          user_type: user.userType || user.type || user.role || 'client',
          is_active: user.active !== false && user.is_active !== false,
          is_verified: user.verified === true || user.is_verified === true,
          firebase_uid: user.firebaseUid || user.firebase_uid || user.uid || null,
          institution_id: (user.institutionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.institutionId))
            ? user.institutionId
            : ((user.institution_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.institution_id))
              ? user.institution_id
              : (process.env.DEFAULT_INSTITUTION_ID || null)),
          phone: user.phone || user.phoneNumber || null,
          photo_url: user.photoURL || user.photo_url || null,
          matric_number: user.matricNumber || user.matric_number || `MIGRATED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          department: user.department || 'General',
          level: user.level || 'N/A',
          session: user.session || 'N/A',
          roles: user.roles && Array.isArray(user.roles) ? JSON.stringify(user.roles) : null
        };

        // Check if user already exists by email or firebase_uid
        const existingByEmail = userData.email
          ? await db('users').where({ email: userData.email }).first()
          : null;
        const existingByUid = userData.firebase_uid
          ? await db('users').where({ firebase_uid: userData.firebase_uid }).first()
          : null;

        const existing = existingByEmail || existingByUid;

        if (existing) {
          // Update existing user using email or firebase_uid (avoid using id which may not be a valid UUID)
          const updateWhere = existingByEmail 
            ? { email: existingByEmail.email }
            : { firebase_uid: existingByUid.firebase_uid };
          await db('users')
            .where(updateWhere)
            .update({
              ...userData,
              updated_at: new Date()
            });
          updated++;
        } else {
          // Insert new user with explicit UUID to preserve Firestore ID if it's a UUID
          const id = user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
            ? user.id
            : undefined;

          await db('users').insert({
            ...(id ? { id } : {}),
            ...userData,
            password_hash: 'firestore-migrated-no-password', // Placeholder
            created_at: user.createdAt || user.created_at || new Date(),
            updated_at: new Date()
          });
          inserted++;
        }
      } catch (err) {
        failed++;
        errors.push({ email: user.email, error: err.message });
        logger.error('Failed to import user:', err);
      }
    }

    res.json({
      success: true,
      message: `Import complete: ${inserted} inserted, ${updated} updated, ${failed} failed`,
      inserted,
      updated,
      failed,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
  } catch (error) {
    logger.error('Import failed:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed. Please check server logs for details.'
    });
  }
});

// Create a new institution
router.post('/institutions', async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, zipCode, plan, seats, domain, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Institution name is required' });
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const institution = {
      id,
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      zip_code: zipCode || null,
      domain: domain || null,
      notes: notes || null,
      plan: plan || 'basic',
      seats: seats || 10,
      active: true,
      status: 'active',
      created_at: now,
      updated_at: now
    };

    await db('institutions').insert(institution);

    res.json({ success: true, data: institution });
  } catch (error) {
    logger.error('Failed to create institution:', error);
    res.status(500).json({ success: false, message: 'Failed to create institution' });
  }
});

// Update an institution
router.put('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
    if (updates.domain !== undefined) dbUpdates.domain = updates.domain;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
    if (updates.seats !== undefined) dbUpdates.seats = updates.seats;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    dbUpdates.updated_at = new Date();

    await db('institutions').where({ id }).update(dbUpdates);

    const updated = await db('institutions').where({ id }).first();

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to update institution:', error);
    res.status(500).json({ success: false, message: 'Failed to update institution' });
  }
});

// Delete an institution
router.delete('/institutions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await db('institutions').where({ id }).del();

    if (deleted === 0) {
      return res.status(404).json({ success: false, message: 'Institution not found' });
    }

    res.json({ success: true, message: 'Institution deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete institution:', error);
    res.status(500).json({ success: false, message: 'Failed to delete institution' });
  }
});

// Create a new license
router.post('/licenses', async (req, res) => {
  try {
    const { institutionId, plan, seats, startsAt, endsAt, features } = req.body;

    if (!institutionId) {
      return res.status(400).json({ success: false, message: 'Institution ID is required' });
    }

    // Generate license key
    const segments = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 4; i++) {
      let seg = '';
      for (let j = 0; j < 4; j++) {
        seg += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(seg);
    }
    const licenseKey = `LIC-${segments.join('-')}`;

    const id = crypto.randomUUID();
    const now = new Date();
    const startDate = startsAt ? new Date(startsAt) : now;
    const endDate = endsAt ? new Date(endsAt) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    const license = {
      id,
      institution_id: institutionId,
      license_key: licenseKey,
      plan: plan || 'basic',
      seats: seats || 10,
      starts_at: startDate,
      ends_at: endDate,
      status: 'active',
      active: true,
      features: features ? JSON.stringify(features) : null,
      activated_at: now,
      created_at: now,
      updated_at: now
    };

    await db('licenses').insert(license);

    // Update institution with license info
    await db('institutions').where({ id: institutionId }).update({
      license_key: licenseKey,
      license_starts_at: startDate,
      license_ends_at: endDate,
      active: true,
      status: 'active',
      updated_at: now
    });

    res.json({ success: true, data: license });
  } catch (error) {
    logger.error('Failed to create license:', error);
    res.status(500).json({ success: false, message: 'Failed to create license' });
  }
});

// Activate a license by license key
router.post('/licenses/activate', async (req, res) => {
  try {
    const { licenseKey, institutionId } = req.body;

    if (!licenseKey) {
      return res.status(400).json({ success: false, message: 'License key is required' });
    }

    const license = await db('licenses').where({ license_key: licenseKey }).first();

    if (!license) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }

    const now = new Date();
    await db('licenses').where({ id: license.id }).update({
      active: true,
      status: 'active',
      suspended_at: null,
      activated_at: now,
      updated_at: now
    });

    if (institutionId) {
      await db('institutions').where({ id: institutionId }).update({
        license_key: licenseKey,
        license_starts_at: license.starts_at,
        license_ends_at: license.ends_at,
        active: true,
        status: 'active',
        updated_at: now
      });
    }

    const updated = await db('licenses').where({ id: license.id }).first();

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to activate license:', error);
    res.status(500).json({ success: false, message: 'Failed to activate license' });
  }
});

// Activate a license by ID
router.post('/licenses/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    await db('licenses').where({ id }).update({
      active: true,
      status: 'active',
      suspended_at: null,
      activated_at: now,
      updated_at: now
    });

    const updated = await db('licenses').where({ id }).first();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }

    // Update institution
    await db('institutions').where({ id: updated.institution_id }).update({
      active: true,
      status: 'active',
      updated_at: now
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to activate license:', error);
    res.status(500).json({ success: false, message: 'Failed to activate license' });
  }
});

// Suspend a license by ID
router.post('/licenses/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    await db('licenses').where({ id }).update({
      active: false,
      status: 'suspended',
      suspended_at: now,
      updated_at: now
    });

    const updated = await db('licenses').where({ id }).first();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'License not found' });
    }

    // Update institution
    await db('institutions').where({ id: updated.institution_id }).update({
      active: false,
      status: 'suspended',
      updated_at: now
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Failed to suspend license:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend license' });
  }
});

// Get institution admins
router.get('/institutions/:id/admins', async (req, res) => {
  try {
    const { id } = req.params;

    const admins = await db('users')
      .where({ institution_id: id })
      .whereIn('user_type', ['admin', 'institution_admin', 'super-admin', 'superadmin'])
      .select('id', 'email', 'first_name', 'last_name', 'user_type', 'is_active', 'created_at');

    const mappedAdmins = admins.map(a => ({
      id: a.id,
      email: a.email,
      name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
      firstName: a.first_name,
      lastName: a.last_name,
      userType: a.user_type,
      active: a.is_active,
      createdAt: a.created_at
    }));

    res.json({ success: true, data: mappedAdmins });
  } catch (error) {
    logger.error('Failed to fetch institution admins:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch institution admins' });
  }
});

// Assign an admin to an institution
router.post('/institutions/:id/admins', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if user already exists
    const existing = await db('users').where({ email: email.toLowerCase() }).first();

    if (existing) {
      // Update existing user to be admin of this institution
      await db('users').where({ id: existing.id }).update({
        institution_id: id,
        user_type: 'admin',
        roles: JSON.stringify(['admin']),
        is_active: true,
        updated_at: new Date()
      });
      res.json({ success: true, data: { id: existing.id, email: existing.email }, message: 'Existing user assigned as admin' });
    } else {
      // Create new admin user
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password || 'TempPass123!', salt);

      const newId = crypto.randomUUID();
      const now = new Date();
      await db('users').insert({
        id: newId,
        email: email.toLowerCase(),
        first_name: firstName || 'Admin',
        last_name: lastName || '',
        user_type: 'admin',
        roles: JSON.stringify(['admin']),
        institution_id: id,
        is_active: true,
        is_verified: true,
        password_hash: hash,
        department: 'General',
        created_at: now,
        updated_at: now
      });

      res.json({ success: true, data: { id: newId, email }, message: 'New admin created' });
    }
  } catch (error) {
    logger.error('Failed to assign institution admin:', error);
    res.status(500).json({ success: false, message: 'Failed to assign institution admin' });
  }
});

// Remove an admin from an institution
router.delete('/institutions/:id/admins/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    await db('users').where({ id: userId, institution_id: id }).update({
      institution_id: null,
      user_type: 'caregiver',
      roles: JSON.stringify(['caregiver']),
      updated_at: new Date()
    });

    res.json({ success: true, message: 'Admin removed from institution' });
  } catch (error) {
    logger.error('Failed to remove institution admin:', error);
    res.status(500).json({ success: false, message: 'Failed to remove institution admin' });
  }
});

module.exports = router;
