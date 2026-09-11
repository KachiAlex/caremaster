/**
 * CareMaster API Routes
 * Main API endpoint handler for all data operations
 */

const express = require('express');
const router = express.Router();
const db = require('../database/postgres');

// Import all route modules
const dataRoutes = require('./data');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const appointmentRoutes = require('./appointments');
const caregiverRoutes = require('./caregivers');
const institutionRoutes = require('./institutions');
const messagingRoutes = require('./messaging');
const notificationRoutes = require('./notifications');
const telemedicineRoutes = require('./telemedicine');

// Mount route modules
router.use('/data', dataRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/caregivers', caregiverRoutes);
router.use('/institutions', institutionRoutes);
router.use('/messaging', messagingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/telemedicine', telemedicineRoutes);

// Default route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CareMaster API is running',
    version: '2.0.0',
    endpoints: {
      data: '/api/data/:table',
      auth: '/api/auth',
      users: '/api/users',
      appointments: '/api/appointments',
      caregivers: '/api/caregivers',
      institutions: '/api/institutions',
      messaging: '/api/messaging',
      notifications: '/api/notifications',
      telemedicine: '/api/telemedicine'
    }
  });
});

module.exports = router;