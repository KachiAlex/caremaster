/**
 * Email Service
 * Frontend wrapper for VPS Backend REST API endpoints backed by Brevo SMTP
 */

import axios from 'axios';
import environmentConfig from '../config/environment';
import logger from '../utils/logger';
import { httpsCallable } from 'backend/functions';
import { functions } from '../backend/config';

const API_BASE_URL = environmentConfig.getApiBaseUrl();

/**
 * Send a task assignment email to a caregiver
 */
export const sendTaskAssignedEmail = async ({
  to,
  caregiverName,
  taskTitle,
  clientName,
  scheduledTime,
  priority,
  instructions
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/email/task-assignment`, {
      to,
      taskTitle,
      taskDescription: instructions,
      dueDate: scheduledTime,
      assignerName: caregiverName
    });
    logger.info('Task assigned email sent', { to, taskTitle });
    return response.data;
  } catch (error) {
    logger.error('Failed to send task assigned email', { error, to, taskTitle });
    throw error;
  }
};

/**
 * Send a branded password reset email via Brevo (requires caller to provide resetLink)
 */
export const sendPasswordResetEmail = async ({ to, resetLink, userName }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/email/password-reset`, {
      to,
      resetLink,
      userName
    });
    logger.info('Password reset email sent', { to });
    return response.data;
  } catch (error) {
    logger.error('Failed to send password reset email', { error, to });
    throw error;
  }
};

/**
 * Request password reset via Backend Callable Function.
 * The Cloud Function uses Backend Admin SDK to generate the reset link
 * and sends a branded email via Resend.
 */
export const requestPasswordReset = async ({ email }) => {
  try {
    const generateAndSendPasswordReset = httpsCallable(
      functions,
      'generateAndSendPasswordResetFunction'
    );
    const result = await generateAndSendPasswordReset({ email: email.toLowerCase().trim() });
    logger.info('Password reset requested via Cloud Function', { email });
    return result.data;
  } catch (error) {
    logger.error('Failed to request password reset', { error, email });
    // Map Backend HttpsError to a user-friendly message
    if (error.code === 'functions/not-found' || error.message?.includes('user-not-found')) {
      // Don't reveal if user exists — return generic success
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
    }
    if (error.code === 'functions/too-many-requests') {
      throw new Error('Too many requests. Please try again later.');
    }
    throw error;
  }
};

/**
 * Send a welcome email to a new user
 */
export const sendWelcomeEmail = async ({ to, userName, institutionName }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/email/welcome`, {
      to,
      userName,
      institutionName
    });
    logger.info('Welcome email sent', { to });
    return response.data;
  } catch (error) {
    logger.error('Failed to send welcome email', { error, to });
    throw error;
  }
};

/**
 * Send a 2FA verification code email
 */
export const send2FACodeEmail = async ({ to, code }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/email/2fa`, {
      to,
      code
    });
    logger.info('2FA code email sent', { to });
    return response.data;
  } catch (error) {
    logger.error('Failed to send 2FA code email', { error, to });
    throw error;
  }
};

/**
 * Send a generic email via the backend email service
 */
export const sendGenericEmail = async ({ to, subject, html, text }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/email/generic`, {
      to,
      subject,
      html,
      text
    });
    logger.info('Generic email sent', { to, subject });
    return response.data;
  } catch (error) {
    logger.error('Failed to send generic email', { error, to, subject });
    throw error;
  }
};

export default {
  sendTaskAssignedEmail,
  sendPasswordResetEmail,
  requestPasswordReset,
  sendWelcomeEmail,
  send2FACodeEmail,
  sendGenericEmail
};
