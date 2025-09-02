const express = require('express');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { 
  authenticate, 
  requireAdmin, 
  checkResourceAccess,
  sensitiveOperationLimit 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/payments
 * @desc    Retrieve payment transactions with summary
 * @access  Private (Admin)
 */
router.get('/',
  authenticate,
  requireAdmin,
  createValidator([...validators.pagination, ...validators.dateRange]),
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'timeline.initiatedAt',
      sortOrder = 'desc',
      status,
      paymentMethod,
      orderId,
      clientId,
      startDate,
      endDate,
      search,
      minAmount,
      maxAmount
    } = req.query;

    // Build filter object
    const filters = {};

    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        filters.status = { $in: status };
      } else {
        filters.status = status;
      }
    }

    // Payment method filter
    if (paymentMethod) {
      if (Array.isArray(paymentMethod)) {
        filters.paymentMethod = { $in: paymentMethod };
      } else {
        filters.paymentMethod = paymentMethod;
      }
    }

    // Order filter
    if (orderId) {
      filters.order = orderId;
    }

    // Client filter
    if (clientId) {
      filters.client = clientId;
    }

    // Date range filter
    if (startDate || endDate) {
      filters['timeline.initiatedAt'] = {};
      if (startDate) {
        filters['timeline.initiatedAt'].$gte = new Date(startDate);
      }
      if (endDate) {
        filters['timeline.initiatedAt'].$lte = new Date(endDate);
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filters.amount = {};
      if (minAmount) {
        filters.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filters.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Search filter (across payment ID, reference number, order number)
    if (search) {
      filters.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { 'transactionDetails.referenceNumber': { $regex: search, $options: 'i' } },
        { 'transactionDetails.externalTransactionId': { $regex: search, $options: 'i' } }
      ];
    }

    // Get payments with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      populate: [
        {
          path: 'order',
          select: 'orderNumber serviceType client',
          populate: {
            path: 'client',
            select: 'firstName lastName email'
          }
        },
        'client',
        'confirmation.confirmedBy',
        'refund.refundedBy'
      ]
    };

    const payments = await Payment.findWithFilters(filters, options);
    const totalPayments = await Payment.countDocuments(filters);
    const totalPages = Math.ceil(totalPayments / limit);

    // Get payment statistics
    const stats = await Payment.getStatistics(filters);

    logger.api('GET', '/api/payments', 200, 0, {
      totalPayments,
      page: parseInt(page),
      filters: Object.keys(filters)
    });

    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalPayments,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        statistics: stats
      }
    });
  })
);

/**
 * @route   GET /api/payments/:paymentId
 * @desc    Get detailed information about a specific payment
 * @access  Private (Admin/Client - own payments only)
 */
router.get('/:paymentId',
  authenticate,
  createValidator(validators.idParam('paymentId')),
  checkResourceAccess('payment'),
  catchAsync(async (req, res) => {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate({
        path: 'order',
        select: 'orderNumber serviceType requirements.targetRole timeline.estimatedCompletion',
        populate: {
          path: 'client',
          select: 'firstName lastName email phone'
        }
      })
      .populate('client', 'firstName lastName email phone')
      .populate('confirmation.confirmedBy', 'firstName lastName email')
      .populate('refund.refundedBy', 'firstName lastName email')
      .populate('auditTrail.performedBy', 'firstName lastName role');

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    logger.business('payment_viewed', 'payment', paymentId, {
      viewedBy: req.user._id,
      userRole: req.user.role,
      paymentStatus: payment.status
    });

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      data: {
        payment
      }
    });
  })
);

/**
 * @route   PUT /api/payments/:paymentId/confirm
 * @desc    Confirm pending payment
 * @access  Private (Admin only)
 */
router.put('/:paymentId/confirm',
  authenticate,
  requireAdmin,
  sensitiveOperationLimit,
  createValidator([...validators.idParam('paymentId'), ...validators.paymentConfirmation]),
  catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { confirmationNotes = '' } = req.body;

    const payment = await Payment.findById(paymentId).populate('order');
    
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    try {
      // Confirm payment
      await payment.confirmPayment(req.user._id, confirmationNotes);

      // Update related order status if payment is completed
      if (payment.order && payment.order.status === 'payment_pending') {
        await payment.order.updateStatus('in_progress', req.user._id, 'Payment confirmed');
      }

      // Populate payment details for response
      await payment.populate('confirmation.confirmedBy order client');

      logger.business('payment_confirmed', 'payment', paymentId, {
        confirmedBy: req.user._id,
        amount: payment.amount,
        orderId: payment.order?._id,
        clientId: payment.client._id
      });

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          payment
        }
      });

    } catch (error) {
      logger.error('Payment confirmation failed', error, {
        paymentId,
        adminId: req.user._id,
        paymentStatus: payment.status
      });

      throw new AppError(error.message, 400, 'PAYMENT_CONFIRMATION_FAILED');
    }
  })
);

/**
 * @route   POST /api/payments/:paymentId/refund
 * @desc    Process payment refund
 * @access  Private (Admin only)
 */
router.post('/:paymentId/refund',
  authenticate,
  requireAdmin,
  sensitiveOperationLimit,
  createValidator([...validators.idParam('paymentId'), ...validators.paymentRefund]),
  catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const { refundAmount, refundReason, refundNotes = '' } = req.body;

    const payment = await Payment.findById(paymentId).populate('order');
    
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    try {
      // Process refund
      await payment.processRefund(req.user._id, refundAmount, refundReason, refundNotes);

      // Update related order status if fully refunded
      if (payment.order && payment.status === 'refunded') {
        await payment.order.updateStatus('refunded', req.user._id, `Full refund processed: ${refundReason}`);
      }

      // Populate payment details for response
      await payment.populate('refund.refundedBy order client');

      logger.business('payment_refunded', 'payment', paymentId, {
        refundedBy: req.user._id,
        refundAmount,
        refundReason,
        orderId: payment.order?._id,
        clientId: payment.client._id
      });

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          payment
        }
      });

    } catch (error) {
      logger.error('Payment refund failed', error, {
        paymentId,
        adminId: req.user._id,
        refundAmount,
        refundReason
      });

      throw new AppError(error.message, 400, 'PAYMENT_REFUND_FAILED');
    }
  })
);

/**
 * @route   POST /api/payments
 * @desc    Create payment record (typically from webhook or manual entry)
 * @access  Private (Admin only)
 */
router.post('/',
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const {
      orderId,
      amount,
      currency = 'USD',
      paymentMethod,
      externalTransactionId,
      gatewayProvider = 'manual',
      referenceNumber,
      paymentProof
    } = req.body;

    // Validate required fields
    if (!orderId || !amount || !paymentMethod) {
      throw new AppError('Order ID, amount, and payment method are required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ 
      order: orderId, 
      status: { $nin: ['failed', 'cancelled'] } 
    });

    if (existingPayment) {
      throw new AppError('Payment already exists for this order', 400, 'PAYMENT_ALREADY_EXISTS');
    }

    // Create payment record
    const paymentData = {
      order: orderId,
      client: order.client,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      transactionDetails: {
        externalTransactionId,
        gatewayProvider,
        referenceNumber,
        paymentProof
      },
      metadata: {
        clientIP: req.ip,
        userAgent: req.get('User-Agent'),
        source: 'admin_panel'
      }
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Add audit trail entry
    await payment.addAuditEntry('created', req.user._id, 'Payment record created by admin');

    // Populate payment details
    await payment.populate('order client');

    logger.business('payment_created', 'payment', payment._id, {
      createdBy: req.user._id,
      orderId,
      amount,
      paymentMethod,
      gatewayProvider
    });

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully',
      data: {
        payment
      }
    });
  })
);

/**
 * @route   PUT /api/payments/:paymentId
 * @desc    Update payment details
 * @access  Private (Admin only)
 */
router.put('/:paymentId',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('paymentId')),
  catchAsync(async (req, res) => {
    const { paymentId } = req.params;
    const updates = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    // Only allow certain fields to be updated
    const allowedUpdates = [
      'transactionDetails.referenceNumber',
      'transactionDetails.paymentProof',
      'transactionDetails.bankDetails'
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      const keys = field.split('.');
      if (keys.length === 2) {
        if (updates[keys[0]] && updates[keys[0]][keys[1]]) {
          if (!filteredUpdates[keys[0]]) filteredUpdates[keys[0]] = {};
          filteredUpdates[keys[0]][keys[1]] = updates[keys[0]][keys[1]];
        }
      } else if (updates[field]) {
        filteredUpdates[field] = updates[field];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      throw new AppError('No valid updates provided', 400, 'NO_VALID_UPDATES');
    }

    // Apply updates
    Object.assign(payment, filteredUpdates);
    await payment.save();

    // Add audit trail entry
    await payment.addAuditEntry(
      'updated', 
      req.user._id, 
      `Payment details updated: ${Object.keys(filteredUpdates).join(', ')}`
    );

    logger.business('payment_updated', 'payment', paymentId, {
      updatedBy: req.user._id,
      updatedFields: Object.keys(filteredUpdates)
    });

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment
      }
    });
  })
);

/**
 * @route   GET /api/payments/statistics
 * @desc    Get payment statistics and analytics
 * @access  Private (Admin only)
 */
router.get('/statistics',
  authenticate,
  requireAdmin,
  createValidator(validators.dateRange),
  catchAsync(async (req, res) => {
    const { startDate, endDate, adminId } = req.query;

    // Build filter for statistics
    const filters = {};

    if (startDate || endDate) {
      filters['timeline.initiatedAt'] = {};
      if (startDate) filters['timeline.initiatedAt'].$gte = new Date(startDate);
      if (endDate) filters['timeline.initiatedAt'].$lte = new Date(endDate);
    }

    // Get payment statistics
    const stats = await Payment.getStatistics(filters);

    // Additional analytics
    const [
      pendingPayments,
      overduePayments,
      recentPayments,
      disputedPayments
    ] = await Promise.all([
      // Pending payments
      Payment.find({
        ...filters,
        status: 'pending'
      }).countDocuments(),

      // Overdue payments (pending for more than 7 days)
      Payment.find({
        ...filters,
        status: 'pending',
        'timeline.initiatedAt': { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).countDocuments(),

      // Recent payments (last 24 hours)
      Payment.find({
        ...filters,
        'timeline.initiatedAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).countDocuments(),

      // Disputed payments
      Payment.find({
        ...filters,
        status: 'disputed'
      }).countDocuments()
    ]);

    // Payment trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const paymentTrends = await Payment.aggregate([
      {
        $match: {
          'timeline.initiatedAt': { $gte: thirtyDaysAgo },
          status: { $in: ['completed', 'refunded', 'partially_refunded'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timeline.initiatedAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment statistics retrieved successfully',
      data: {
        ...stats,
        analytics: {
          pendingPayments,
          overduePayments,
          recentPayments,
          disputedPayments
        },
        trends: paymentTrends
      }
    });
  })
);

/**
 * @route   GET /api/payments/:paymentId/audit-trail
 * @desc    Get payment audit trail
 * @access  Private (Admin only)
 */
router.get('/:paymentId/audit-trail',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('paymentId')),
  catchAsync(async (req, res) => {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('auditTrail.performedBy', 'firstName lastName email role')
      .select('auditTrail paymentId');

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      message: 'Payment audit trail retrieved successfully',
      data: {
        paymentId: payment.paymentId,
        auditTrail: payment.auditTrail
      }
    });
  })
);

module.exports = router;
