const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FACodeEmail,
  sendTaskAssignmentEmail,
  sendGenericEmail
} = require('../services/emailService');
const { logger } = require('../utils/logger');

/**
 * POST /api/email/password-reset
 * Send password reset email
 */
router.post('/password-reset', [
  body('to').isEmail().withMessage('Valid email is required'),
  body('resetLink').isURL().withMessage('Valid reset link is required'),
  body('userName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, resetLink, userName } = req.body;
    await sendPasswordResetEmail({ to, resetLink, userName });

    logger.info(`Password reset email sent to ${to}`);
    res.json({ success: true, message: 'Password reset email sent successfully' });
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    res.status(500).json({ success: false, message: 'Failed to send password reset email' });
  }
});

/**
 * POST /api/email/welcome
 * Send welcome email
 */
router.post('/welcome', [
  body('to').isEmail().withMessage('Valid email is required'),
  body('userName').optional().trim(),
  body('institutionName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, userName, institutionName } = req.body;
    await sendWelcomeEmail({ to, userName, institutionName });

    logger.info(`Welcome email sent to ${to}`);
    res.json({ success: true, message: 'Welcome email sent successfully' });
  } catch (error) {
    logger.error('Error sending welcome email:', error);
    res.status(500).json({ success: false, message: 'Failed to send welcome email' });
  }
});

/**
 * POST /api/email/2fa
 * Send 2FA verification code email
 */
router.post('/2fa', [
  body('to').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, code } = req.body;
    await send2FACodeEmail({ to, code });

    logger.info(`2FA code email sent to ${to}`);
    res.json({ success: true, message: '2FA code email sent successfully' });
  } catch (error) {
    logger.error('Error sending 2FA code email:', error);
    res.status(500).json({ success: false, message: 'Failed to send 2FA code email' });
  }
});

/**
 * POST /api/email/task-assignment
 * Send task assignment email
 */
router.post('/task-assignment', [
  body('to').isEmail().withMessage('Valid email is required'),
  body('taskTitle').trim().notEmpty().withMessage('Task title is required'),
  body('taskDescription').optional().trim(),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('assignerName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, taskTitle, taskDescription, dueDate, assignerName } = req.body;
    await sendTaskAssignmentEmail({ to, taskTitle, taskDescription, dueDate, assignerName });

    logger.info(`Task assignment email sent to ${to}`);
    res.json({ success: true, message: 'Task assignment email sent successfully' });
  } catch (error) {
    logger.error('Error sending task assignment email:', error);
    res.status(500).json({ success: false, message: 'Failed to send task assignment email' });
  }
});

/**
 * POST /api/email/generic
 * Send generic email
 */
router.post('/generic', [
  body('to').isEmail().withMessage('Valid email is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('html').optional().trim(),
  body('text').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, subject, html, text } = req.body;
    if (!html && !text) {
      return res.status(400).json({ success: false, message: 'Either html or text content is required' });
    }

    await sendGenericEmail({ to, subject, html, text });

    logger.info(`Generic email sent to ${to}`);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    logger.error('Error sending generic email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

module.exports = router;
