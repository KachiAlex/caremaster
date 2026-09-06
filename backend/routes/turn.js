const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/turn-credentials
 *
 * Returns the STUN/TURN configuration for WebRTC calls.
 * TURN credentials are read from environment variables so they are never
 * shipped in the frontend bundle. If no TURN server is configured, only
 * public STUN servers are returned.
 */
router.get('/', authenticateToken, (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  if (process.env.TURN_SERVER_URL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    });

    if (process.env.TURN_SERVER_URL2) {
      iceServers.push({
        urls: process.env.TURN_SERVER_URL2,
        username: process.env.TURN_USERNAME || '',
        credential: process.env.TURN_CREDENTIAL || '',
      });
    }
  }

  logger.info(`Returning ICE configuration to user ${req.user?.id}`);

  res.json({
    success: true,
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });
});

module.exports = router;
