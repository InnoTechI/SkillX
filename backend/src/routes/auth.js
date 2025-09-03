const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { 
  authenticate, 
  requireSuperAdmin, 
  generateToken, 
  generateRefreshToken,
  verifyRefreshToken,
  sensitiveOperationLimit 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/register-admin
 * @desc    Register new admin (one-time setup or super admin only)
 * @access  Public (if no admins exist) / Super Admin
 */
router.post('/register-admin', 
  createValidator(validators.userRegistration),
  catchAsync(async (req, res) => {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if admin registration is enabled
    const adminRegistrationEnabled = process.env.ADMIN_REGISTRATION_ENABLED === 'true';
    
    // Check if any admins exist
    const existingAdmins = await User.countDocuments({ 
      role: { $in: ['admin', 'super_admin'] } 
    });

    // If admins exist and registration is disabled, require super admin authentication
    if (existingAdmins > 0 && !adminRegistrationEnabled) {
      // This endpoint would need super admin auth middleware
      return res.status(403).json({
        success: false,
        message: 'Admin registration is disabled. Contact a super admin.',
        error: 'ADMIN_REGISTRATION_DISABLED'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.security('Admin registration attempt with existing email', 'warn', {
        email,
        ip: req.ip,
        existingUserId: existingUser._id
      });

      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        error: 'USER_ALREADY_EXISTS'
      });
    }

    // Create admin user
    const adminData = {
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: existingAdmins === 0 ? 'super_admin' : 'admin', // First admin becomes super admin
      isEmailVerified: true,
      isActive: true,
      metadata: {
        registrationIP: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    const admin = await User.createAdmin(adminData);

    // Generate tokens
    const accessToken = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Log successful registration
    logger.business('admin_registered', 'user', admin._id, {
      email: admin.email,
      role: admin.role,
      isFirstAdmin: existingAdmins === 0,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: {
        user: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          fullName: admin.fullName,
          role: admin.role,
          isEmailVerified: admin.isEmailVerified,
          createdAt: admin.createdAt
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      }
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin and return token
 * @access  Public
 */
router.post('/login', 
  createValidator(validators.userLogin),
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    try {
      // Find user by credentials (this method handles password checking and login attempts)
      const user = await User.findByCredentials(email, password);

      // Ensure user is admin
      if (!['admin', 'super_admin'].includes(user.role)) {
        logger.security('Non-admin login attempt', 'warn', {
          userId: user._id,
          email: user.email,
          role: user.role,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.',
          error: 'INSUFFICIENT_PRIVILEGES'
        });
      }

      // Generate tokens
      const accessToken = generateToken(user._id);
      const refreshToken = generateRefreshToken(user._id);

      // Update last login metadata
      await User.updateOne(
        { _id: user._id },
        { 
          lastLogin: new Date(),
          'metadata.lastLoginIP': req.ip,
          'metadata.userAgent': req.get('User-Agent')
        }
      );

      // Log successful login
      logger.auth('login_success', user._id, {
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            lastLogin: new Date(),
            preferences: user.preferences
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
          }
        }
      });

    } catch (error) {
      // Log failed login attempt
      logger.security('Login failed', 'warn', {
        email,
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Return generic error for security
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }
  })
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token',
  catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = generateToken(user._id);

      logger.auth('token_refreshed', user._id, {
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      });

    } catch (error) {
      logger.security('Invalid refresh token attempt', 'warn', {
        error: error.message,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate token)
 * @access  Private
 */
router.post('/logout', 
  authenticate,
  catchAsync(async (req, res) => {
    // In a production system, you would typically:
    // 1. Add the token to a blacklist (Redis)
    // 2. Or use a token versioning system
    // For now, we'll just log the logout

    logger.auth('logout', req.user._id, {
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  authenticate,
  sensitiveOperationLimit,
  catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
        error: 'MISSING_PASSWORDS'
      });
    }

    // Validate new password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with uppercase, lowercase, number and special character',
        error: 'WEAK_PASSWORD'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      logger.security('Password change failed - invalid current password', 'warn', {
        userId: user._id,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        error: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
        error: 'SAME_PASSWORD'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.security('Password changed successfully', 'info', {
      userId: user._id,
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authenticate,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          profileImage: user.profileImage,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile',
  authenticate,
  catchAsync(async (req, res) => {
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided',
        error: 'NO_VALID_UPDATES'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    logger.business('profile_updated', 'user', user._id, {
      updates: Object.keys(updates),
      ip: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          preferences: user.preferences,
          updatedAt: user.updatedAt
        }
      }
    });
  })
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if current token is valid
 * @access  Private
 */
router.get('/verify-token',
  authenticate,
  catchAsync(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          isActive: req.user.isActive
        },
        tokenValid: true
      }
    });
  })
);

module.exports = router;
