const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getUserIdentityIds, isConversationParticipant, ADMIN_ROLES, SUPER_ADMIN_ROLES } = require('../middleware/authorization');
const { logger } = require('../utils/logger');
const db = require('../utils/database');

const router = express.Router();

const APP_ID = process.env.AGORA_APP_ID || process.env.REACT_APP_AGORA_APP_ID || '43c43dc3e6a44a99b2b75a4997e3b1a4';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || null;
const TOKEN_TTL = 3600;

let RtcTokenBuilder = null;
try {
  RtcTokenBuilder = require('agora-token').RtcTokenBuilder;
} catch {
  logger.warn('agora-token package not installed — token endpoint will return null tokens');
}

/**
 * Verify the requester is allowed to join the given Agora channel.
 * Channel conventions:
 *   consult_<telemedicineAppointmentId>  → client_id/doctor_id on the appointment
 *   call_<callId>                        → caller/recipient on the calls row
 *   conv_<conversationId>               → conversation participants
 */
async function canJoinChannel(user, channelName) {
  if (!channelName || typeof channelName !== 'string') return false;
  if (SUPER_ADMIN_ROLES.includes(user.user_type)) return true;
  const identityIds = await getUserIdentityIds(user.id);
  const isAdmin = ADMIN_ROLES.includes(user.user_type);

  if (channelName.startsWith('consult_')) {
    const apptId = channelName.slice('consult_'.length);
    const appt = await db('telemedicine_appointments').where({ id: apptId }).first();
    if (!appt) return false;
    if (isAdmin) return appt.institution_id === user.institution_id;
    return identityIds.includes(String(appt.client_id)) ||
      identityIds.includes(String(appt.doctor_id));
  }

  if (channelName.startsWith('call_')) {
    const callId = channelName.slice('call_'.length);
    const call = await db('calls').where({ call_id: callId }).first();
    if (!call) return false;
    if (isAdmin) return call.institution_id === user.institution_id;
    return [call.caller_id, call.recipient_id, call.receiver_id]
      .map(String).some(id => identityIds.includes(id));
  }

  if (channelName.startsWith('conv_')) {
    const convId = channelName.slice('conv_'.length);
    const conv = await db('conversations').where({ id: convId }).first();
    if (!conv) return false;
    if (isAdmin) return conv.institution_id === user.institution_id;
    return isConversationParticipant(conv, identityIds);
  }

  // Unknown channel naming — deny rather than mint an unrestricted token
  return false;
}

// POST /api/agora/token { channelName, uid, role, expiration }
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { channelName, uid = 0, role = 'publisher', expiration } = req.body || {};
    if (!channelName) {
      return res.status(400).json({ success: false, message: 'channelName is required' });
    }

    const allowed = await canJoinChannel(req.user, channelName);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Not authorized for this channel' });
    }

    const ttl = Math.min(Math.max(parseInt(expiration) || TOKEN_TTL, 60), 86400);

    // If the Agora project is in testing mode (no certificate required),
    // a null token is valid. Only mint a token when a certificate exists.
    if (!APP_CERTIFICATE || !RtcTokenBuilder) {
      return res.json({ success: true, token: null, appId: APP_ID, insecure: true });
    }

    const expireTs = Math.floor(Date.now() / 1000) + ttl;
    const rtcRole = role === 'subscriber' ? 2 : 1; // RtcRole.SUBSCRIBER : PUBLISHER
    const numericUid = Number.isInteger(uid) ? uid : Math.floor(Math.random() * 1000000);
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID, APP_CERTIFICATE, channelName, numericUid, rtcRole, expireTs
    );

    res.json({ success: true, token, appId: APP_ID, uid: numericUid, expiresAt: expireTs });
  } catch (err) {
    logger.error('Agora token generation failed:', err);
    res.status(500).json({ success: false, message: 'Failed to generate token' });
  }
});

module.exports = router;
