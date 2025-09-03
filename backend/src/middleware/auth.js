const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authentication and Authorization Middleware
 * Handles JWT token verification and role-based access control
 */

/**
 * Verify JWT token and authenticate user
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided',
        error: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and check if still active
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    
    if (!user) {
      logger.security('Authentication failed - user not found', 'warn', {
        userId: decoded.id,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.security('Authentication failed - user inactive', 'warn', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is inactive',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      logger.security('Authentication failed - password changed after token', 'warn', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });
      
      return res.status(401).json({
        success: false,
        message: 'Password changed. Please log in again',
        error: 'PASSWORD_CHANGED'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.security('Authentication failed - account locked', 'warn', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
        lockUntil: user.lockUntil
      });
      
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to failed login attempts',
        error: 'ACCOUNT_LOCKED'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    // Log successful authentication
    logger.auth('Authentication successful', user._id, {
      email: user.email,
      role: user.role,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.security('Authentication error', 'error', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

/**
 * Authorize user based on roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.security('Authorization failed - insufficient permissions', 'warn', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        path: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles
      });
    }

    logger.auth('Authorization successful', req.user._id, {
      role: req.user.role,
      requiredRoles: roles,
      path: req.originalUrl
    });

    next();
  };
};

/**
 * Check if user is admin or super admin
 */
const requireAdmin = authorize('admin', 'super_admin');

/**
 * Check if user is super admin
 */
const requireSuperAdmin = authorize('super_admin');

/**
 * Check if user can access specific resource
 */
const checkResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const { user } = req;
      const resourceId = req.params.orderId || req.params.paymentId || req.params.revisionId;

      // Super admins have access to everything
      if (user.role === 'super_admin') {
        return next();
      }

      // Admins have access to most resources
      if (user.role === 'admin') {
        // Check if admin is assigned to the resource (for orders)
        if (resourceType === 'order' && resourceId) {
          const Order = require('../models/Order');
          const order = await Order.findById(resourceId);
          
          if (order && order.assignedAdmin && order.assignedAdmin.toString() !== user._id.toString()) {
            logger.security('Resource access denied - not assigned admin', 'warn', {
              userId: user._id,
              resourceType,
              resourceId,
              assignedAdmin: order.assignedAdmin
            });
            
            return res.status(403).json({
              success: false,
              message: 'You are not assigned to this resource',
              error: 'NOT_ASSIGNED_ADMIN'
            });
          }
        }
        return next();
      }

      // Clients can only access their own resources
      if (user.role === 'client') {
        if (!resourceId) {
          return next(); // Allow access to general endpoints
        }

        let hasAccess = false;

        switch (resourceType) {
          case 'order':
            const Order = require('../models/Order');
            const order = await Order.findById(resourceId);
            hasAccess = order && order.client.toString() === user._id.toString();
            break;

          case 'payment':
            const Payment = require('../models/Payment');
            const payment = await Payment.findById(resourceId);
            hasAccess = payment && payment.client.toString() === user._id.toString();
            break;

          case 'revision':
            const Revision = require('../models/Revision');
            const revision = await Revision.findById(resourceId);
            hasAccess = revision && revision.client.toString() === user._id.toString();
            break;

          case 'file':
            const File = require('../models/File');
            const file = await File.findById(resourceId).populate('order');
            hasAccess = file && file.order && file.order.client.toString() === user._id.toString();
            break;

          default:
            hasAccess = false;
        }

        if (!hasAccess) {
          logger.security('Resource access denied - client not owner', 'warn', {
            userId: user._id,
            resourceType,
            resourceId
          });

          return res.status(403).json({
            success: false,
            message: 'You can only access your own resources',
            error: 'RESOURCE_ACCESS_DENIED'
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Resource access check failed', error, {
        userId: req.user?._id,
        resourceType,
        resourceId: req.params.orderId || req.params.paymentId || req.params.revisionId
      });

      return res.status(500).json({
        success: false,
        message: 'Access check failed',
        error: 'ACCESS_CHECK_ERROR'
      });
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without user
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    
    if (user && user.isActive && !user.changedPasswordAfter(decoded.iat) && !user.isLocked) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Rate limiting for sensitive operations
 */
const sensitiveOperationLimit = (req, res, next) => {
  // This would typically integrate with Redis for distributed rate limiting
  // For now, we'll use in-memory tracking
  const { user } = req;
  
  if (!user) {
    return next();
  }

  const key = `sensitive_ops:${user._id}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  // In production, use Redis for this
  if (!req.app.locals.rateLimitStore) {
    req.app.locals.rateLimitStore = new Map();
  }

  const userRequests = req.app.locals.rateLimitStore.get(key) || [];
  const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

  if (validRequests.length >= maxRequests) {
    logger.security('Sensitive operation rate limit exceeded', 'warn', {
      userId: user._id,
      requestCount: validRequests.length,
      path: req.originalUrl
    });

    return res.status(429).json({
      success: false,
      message: 'Too many sensitive operations. Please try again later',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  }

  validRequests.push(now);
  req.app.locals.rateLimitStore.set(key, validRequests);

  next();
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireSuperAdmin,
  checkResourceAccess,
  optionalAuth,
  sensitiveOperationLimit,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
