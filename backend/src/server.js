const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const revisionRoutes = require('./routes/revisions');
const fileRoutes = require('./routes/files');
const chatRoutes = require('./routes/chat');
const analyticsRoutes = require('./routes/analytics');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize all middleware for security, parsing, and logging
   */
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        error: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Data sanitization
    this.app.use(mongoSanitize()); // Prevent NoSQL injection
    this.app.use(hpp()); // Prevent HTTP Parameter Pollution

    // Compression middleware
    this.app.use(compression());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  /**
   * Initialize all API routes
   */
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'SkillX Admin Backend is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/revisions', revisionRoutes);
    this.app.use('/api/files', fileRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/analytics', analyticsRoutes);

    // 404 handler for undefined routes
    this.app.all('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        error: 'ROUTE_NOT_FOUND'
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  initializeErrorHandling() {
    this.app.use(errorHandler);
  }

  /**
   * Connect to MongoDB database
   */
  async connectDatabase() {
    try {
      const mongoURI = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;

      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info('Connected to MongoDB successfully', {
        environment: process.env.NODE_ENV,
        database: mongoURI.split('/').pop()
      });
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.connectDatabase();
      
      this.server = this.app.listen(this.port, () => {
        logger.info(`SkillX Admin Backend server running on port ${this.port}`, {
          environment: process.env.NODE_ENV,
          port: this.port,
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();
      
      return this.server;
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      this.server.close(() => {
        logger.info('HTTP server closed');
        
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * Stop the server (useful for testing)
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          mongoose.connection.close(false, () => {
            resolve();
          });
        });
      });
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch(error => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

module.exports = Server;
