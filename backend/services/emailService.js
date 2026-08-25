const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Brevo SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000
});

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@getcaremaster.com';
const FROM_NAME = process.env.BREVO_FROM_NAME || 'Care Master';
const BRAND_COLOR_DARK = '#12302C';
const BRAND_COLOR_GOLD = '#D9A441';

function emailWrapper(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${BRAND_COLOR_DARK} 0%, #1a4540 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: ${BRAND_COLOR_GOLD}; margin: 0; font-size: 24px;">${title}</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
    ${bodyContent}
  </div>
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated email from Care Master. Please do not reply to this message.</p>
    <p>&copy; ${new Date().getFullYear()} Care Master. All rights reserved.</p>
  </div>
</body>
</html>`;
}

/**
 * Send email via Brevo SMTP
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, '')
    });

    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, error);
    throw error;
  }
}

/**
 * Generate and send password reset email
 */
async function sendPasswordResetEmail({ to, resetLink, userName }) {
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName || 'User'},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password. Click the button below to set a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background: ${BRAND_COLOR_DARK}; color: ${BRAND_COLOR_GOLD}; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
    </div>
    <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size: 14px; color: #666; word-break: break-all;">${resetLink}</p>
    <p style="font-size: 14px; color: #666;">If you didn't request a password reset, you can safely ignore this email. This link will expire in 1 hour for security reasons.</p>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>Care Master Team</p>`;

  const html = emailWrapper('Password Reset', body);
  return sendEmail({ to, subject: 'Reset your Care Master password', html });
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail({ to, userName, institutionName }) {
  const loginUrl = process.env.FRONTEND_URL || 'https://getcaremaster.com/login';
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hello ${userName || 'User'},</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Welcome to Care Master${institutionName ? ` at ${institutionName}` : ''}! Your account has been successfully created.</p>
    <p style="font-size: 16px; margin-bottom: 20px;">You can now log in to access all the features of our platform.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: ${BRAND_COLOR_DARK}; color: ${BRAND_COLOR_GOLD}; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Log In Now</a>
    </div>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>Care Master Team</p>`;

  const html = emailWrapper('Welcome to Care Master', body);
  return sendEmail({ to, subject: 'Welcome to Care Master', html });
}

/**
 * Send 2FA verification code email
 */
async function send2FACodeEmail({ to, code }) {
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">Your Care Master verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="display: inline-block; background: white; border: 2px solid ${BRAND_COLOR_DARK}; padding: 15px 40px; border-radius: 8px; font-size: 28px; letter-spacing: 8px; font-weight: bold; color: ${BRAND_COLOR_DARK};">${code}</span>
    </div>
    <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes for security reasons.</p>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>Care Master Team</p>`;

  const html = emailWrapper('Verification Code', body);
  return sendEmail({ to, subject: 'Your Care Master Verification Code', html });
}

/**
 * Send task assignment email
 */
async function sendTaskAssignmentEmail({ to, taskTitle, taskDescription, dueDate, assignerName }) {
  const body = `
    <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
    <p style="font-size: 16px; margin-bottom: 20px;">You have been assigned a new task:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${BRAND_COLOR_GOLD};">
      <h3 style="color: ${BRAND_COLOR_DARK}; margin: 0 0 10px 0;">${taskTitle}</h3>
      <p style="margin: 10px 0;"><strong>Description:</strong> ${taskDescription || 'No description provided'}</p>
      ${dueDate ? `<p style="margin: 10px 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
      ${assignerName ? `<p style="margin: 10px 0;"><strong>Assigned by:</strong> ${assignerName}</p>` : ''}
    </div>
    <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>Care Master Team</p>`;

  const html = emailWrapper('New Task Assigned', body);
  return sendEmail({ to, subject: `New Task: ${taskTitle}`, html });
}

/**
 * Send generic email
 */
async function sendGenericEmail({ to, subject, html, text }) {
  return sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FACodeEmail,
  sendTaskAssignmentEmail,
  sendGenericEmail
};
