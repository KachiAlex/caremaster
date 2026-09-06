const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const superadminRoutes = require('./routes/superadmin');
const dataRoutes = require('./routes/data');
const turnRoutes = require('./routes/turn');
const emailRoutes = require('./routes/email');
const uploadRoutes = require('./routes/uploadRoutes');
const sseRoutes = require('./routes/sse');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const { cleanupCallSignaling } = require('./jobs/cleanupCallSignaling');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers when behind Nginx/reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3000, // limit each IP to 3000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    return req.path === '/health' || req.ip === '127.0.0.1';
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 login attempts per window
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  skip: (req) => req.ip === '127.0.0.1',
  standardHeaders: true,
  legacyHeaders: false
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://getcaremaster.com', 'https://www.getcaremaster.com', 'https://caremaster.web.app', 'https://elderx-f5c2b.web.app']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Type']
}));

// Cookie and body parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/turn-credentials', turnRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events', sseRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);

  // Run once at startup, then schedule periodic call-signaling cleanup.
  cleanupCallSignaling();
  const cleanupIntervalHours = parseInt(process.env.CALL_CLEANUP_INTERVAL_HOURS, 10) || 6;
  setInterval(() => cleanupCallSignaling(), cleanupIntervalHours * 60 * 60 * 1000);
});

module.exports = app;
