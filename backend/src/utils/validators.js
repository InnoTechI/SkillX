const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * Custom validation utilities and middleware for SkillX Admin Backend
 * Provides comprehensive input validation, sanitization, and error handling
 */

/**
 * Validation error formatter
 */
const formatValidationErrors = (errors) => {
  return errors.reduce((acc, error) => {
    const field = error.path || error.param;
    if (!acc[field]) {
      acc[field] = [];
    }
    acc[field].push(error.msg);
    return acc;
  }, {});
};

/**
 * Validation result middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    
    req.logger?.warn('Validation failed', {
      errors: formattedErrors,
      body: req.body,
      params: req.params,
      query: req.query
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: formattedErrors
    });
  }
  
  next();
};

/**
 * Custom validators
 */
const customValidators = {
  // MongoDB ObjectId validator
  isObjectId: (value) => {
    return mongoose.Types.ObjectId.isValid(value);
  },

  // Phone number validator (international format)
  isPhoneNumber: (value) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(value);
  },

  // Strong password validator
  isStrongPassword: (value) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(value);
  },

  // File size validator (in bytes)
  isValidFileSize: (maxSize) => (value) => {
    return parseInt(value) <= maxSize;
  },

  // Date range validator
  isDateInRange: (minDate, maxDate) => (value) => {
    const date = new Date(value);
    const min = new Date(minDate);
    const max = new Date(maxDate);
    return date >= min && date <= max;
  },

  // Future date validator
  isFutureDate: (value) => {
    return new Date(value) > new Date();
  },

  // Past date validator
  isPastDate: (value) => {
    return new Date(value) < new Date();
  },

  // Currency amount validator
  isCurrencyAmount: (value) => {
    const amount = parseFloat(value);
    return !isNaN(amount) && amount >= 0 && amount <= 999999.99;
  },

  // Order status transition validator
  isValidStatusTransition: (currentStatus, validTransitions) => (newStatus) => {
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  },

  // File type validator
  isAllowedFileType: (allowedTypes) => (mimeType) => {
    return allowedTypes.includes(mimeType);
  },

  // Rating validator (1-5 scale)
  isValidRating: (value) => {
    const rating = parseInt(value);
    return rating >= 1 && rating <= 5;
  },

  // Priority level validator
  isValidPriority: (value) => {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    return validPriorities.includes(value);
  }
};

/**
 * Common validation chains
 */
const validators = {
  // User registration validation
  userRegistration: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .custom(customValidators.isPhoneNumber)
      .withMessage('Please provide a valid phone number')
  ],

  // User login validation
  userLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Order creation validation
  orderCreation: [
    body('client')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid client ID'),
    body('serviceType')
      .isIn(['resume_writing', 'cv_writing', 'cover_letter', 'linkedin_optimization', 'resume_review', 'career_consultation', 'package_deal'])
      .withMessage('Invalid service type'),
    body('urgencyLevel')
      .isIn(['standard', 'urgent', 'express'])
      .withMessage('Invalid urgency level'),
    body('requirements.industryType')
      .trim()
      .notEmpty()
      .withMessage('Industry type is required'),
    body('requirements.experienceLevel')
      .isIn(['entry_level', 'mid_level', 'senior_level', 'executive'])
      .withMessage('Invalid experience level'),
    body('requirements.targetRole')
      .trim()
      .notEmpty()
      .withMessage('Target role is required'),
    body('pricing.basePrice')
      .custom(customValidators.isCurrencyAmount)
      .withMessage('Invalid base price'),
    body('timeline.estimatedCompletion')
      .isISO8601()
      .custom(customValidators.isFutureDate)
      .withMessage('Estimated completion must be a future date')
  ],

  // Order update validation
  orderUpdate: [
    param('orderId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid order ID'),
    body('status')
      .optional()
      .isIn(['pending', 'in_review', 'payment_pending', 'in_progress', 'draft_ready', 'client_review', 'revision_requested', 'in_revision', 'completed', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid order status'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Priority must be between 1 and 5'),
    body('assignedAdmin')
      .optional()
      .custom(customValidators.isObjectId)
      .withMessage('Invalid admin ID')
  ],

  // Payment confirmation validation
  paymentConfirmation: [
    param('paymentId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid payment ID'),
    body('confirmationNotes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Confirmation notes cannot exceed 500 characters')
  ],

  // Payment refund validation
  paymentRefund: [
    param('paymentId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid payment ID'),
    body('refundAmount')
      .custom(customValidators.isCurrencyAmount)
      .withMessage('Invalid refund amount'),
    body('refundReason')
      .isIn(['client_request', 'service_cancellation', 'quality_issue', 'technical_error', 'duplicate_payment', 'fraud_prevention', 'other'])
      .withMessage('Invalid refund reason'),
    body('refundNotes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Refund notes cannot exceed 500 characters')
  ],

  // File upload validation
  fileUpload: [
    param('orderId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid order ID'),
    body('fileType')
      .isIn(['original_resume', 'draft_resume', 'final_resume', 'cover_letter', 'linkedin_profile', 'payment_proof', 'additional_document', 'revision_feedback', 'template', 'other'])
      .withMessage('Invalid file type'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
  ],

  // Revision creation validation
  revisionCreation: [
    body('order')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid order ID'),
    body('type')
      .isIn(['content_change', 'formatting_change', 'design_change', 'structure_change', 'information_addition', 'information_removal', 'technical_issue', 'quality_improvement', 'client_preference', 'other'])
      .withMessage('Invalid revision type'),
    body('priority')
      .custom(customValidators.isValidPriority)
      .withMessage('Invalid priority level'),
    body('requestDetails.description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    body('urgencyLevel')
      .isIn(['standard', 'urgent', 'express'])
      .withMessage('Invalid urgency level')
  ],

  // Revision update validation
  revisionUpdate: [
    param('revisionId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid revision ID'),
    body('status')
      .optional()
      .isIn(['pending', 'acknowledged', 'in_progress', 'completed', 'delivered', 'approved', 'rejected', 'cancelled', 'on_hold'])
      .withMessage('Invalid revision status'),
    body('priority')
      .optional()
      .custom(customValidators.isValidPriority)
      .withMessage('Invalid priority level'),
    body('effort.estimatedHours')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Estimated hours must be between 0.1 and 100'),
    body('effort.actualHours')
      .optional()
      .isFloat({ min: 0, max: 200 })
      .withMessage('Actual hours must be between 0 and 200')
  ],

  // Chat message validation
  chatMessage: [
    param('orderId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid order ID'),
    body('messageType')
      .optional()
      .isIn(['text', 'file', 'image', 'system', 'status_update', 'revision_request', 'payment_update', 'file_delivery'])
      .withMessage('Invalid message type'),
    body('content.text')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters'),
    body('replyTo')
      .optional()
      .custom(customValidators.isObjectId)
      .withMessage('Invalid reply message ID')
  ],

  // Pagination validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isAlpha('en-US', { ignore: '._-' })
      .withMessage('Invalid sort field'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Date range validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
    query('endDate')
      .optional()
      .custom((value, { req }) => {
        if (req.query.startDate && value) {
          return new Date(value) >= new Date(req.query.startDate);
        }
        return true;
      })
      .withMessage('End date must be after start date')
  ],

  // ID parameter validation
  idParam: (paramName = 'id') => [
    param(paramName)
      .custom(customValidators.isObjectId)
      .withMessage(`Invalid ${paramName}`)
  ],

  // Revision creation validation
  revisionCreation: [
    body('order')
      .notEmpty()
      .withMessage('Order ID is required')
      .isMongoId()
      .withMessage('Invalid order ID'),
    body('type')
      .notEmpty()
      .withMessage('Revision type is required')
      .isIn(['content', 'format', 'structure', 'other'])
      .withMessage('Invalid revision type'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('urgencyLevel')
      .optional()
      .isIn(['standard', 'express', 'urgent'])
      .withMessage('Invalid urgency level'),
    body('requestDetails.description')
      .notEmpty()
      .withMessage('Revision description is required')
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('requestDetails.specificChanges')
      .optional()
      .isArray()
      .withMessage('Specific changes must be an array'),
    body('timeline.preferredDeadline')
      .optional()
      .isISO8601()
      .withMessage('Invalid preferred deadline format')
  ],

  // Revision update validation
  revisionUpdate: [
    body('status')
      .optional()
      .isIn(['pending', 'acknowledged', 'in_progress', 'completed', 'delivered', 'approved', 'rejected', 'cancelled'])
      .withMessage('Invalid revision status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('urgencyLevel')
      .optional()
      .isIn(['standard', 'express', 'urgent'])
      .withMessage('Invalid urgency level'),
    body('effort.estimatedHours')
      .optional()
      .isNumeric()
      .withMessage('Estimated hours must be a number'),
    body('effort.actualHours')
      .optional()
      .isNumeric()
      .withMessage('Actual hours must be a number')
  ],

  // File update validation
  fileUpdate: [
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('tags')
      .optional()
      .custom((tags) => {
        if (Array.isArray(tags)) {
          return tags.every(tag => typeof tag === 'string' && tag.length <= 50);
        }
        return typeof tags === 'string';
      })
      .withMessage('Tags must be strings with max 50 characters each'),
    body('visibility')
      .optional()
      .isIn(['public', 'order_specific', 'admin_only'])
      .withMessage('Invalid visibility option'),
    body('fileType')
      .optional()
      .isIn(['resume', 'cover_letter', 'draft', 'final', 'reference', 'document', 'image'])
      .withMessage('Invalid file type')
  ],

  // Message creation validation
  messageCreation: [
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters'),
    body('messageType')
      .optional()
      .isIn(['text', 'file', 'system', 'notification'])
      .withMessage('Invalid message type'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
    body('replyTo')
      .optional()
      .isMongoId()
      .withMessage('Invalid reply message ID'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array'),
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('Internal flag must be a boolean')
  ],

  // Message update validation
  messageUpdate: [
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message must be between 1 and 2000 characters')
  ]
};

/**
 * Sanitization utilities
 */
const sanitizers = {
  // Sanitize user input
  sanitizeUserInput: (req, res, next) => {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remove potential XSS scripts
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          // Trim whitespace
          obj[key] = obj[key].trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    if (req.body) sanitizeObject(req.body);
    if (req.query) sanitizeObject(req.query);
    if (req.params) sanitizeObject(req.params);

    next();
  },

  // Normalize email addresses
  normalizeEmail: (email) => {
    return email.toLowerCase().trim();
  },

  // Sanitize file names
  sanitizeFileName: (fileName) => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
};

/**
 * Validation middleware factory
 */
const createValidator = (validationChain) => {
  return [
    sanitizers.sanitizeUserInput,
    ...validationChain,
    handleValidationErrors
  ];
};

module.exports = {
  validators,
  customValidators,
  sanitizers,
  createValidator,
  handleValidationErrors,
  formatValidationErrors
};
