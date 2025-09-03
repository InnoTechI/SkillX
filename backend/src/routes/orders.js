const express = require('express');
const Order = require('../models/Order');
const ChatRoom = require('../models/Chat').ChatRoom || require('../models/Chat');
const { 
  authenticate, 
  requireAdmin, 
  checkResourceAccess 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Retrieve all orders with filters and pagination
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      urgencyLevel,
      priority,
      assignedAdmin,
      serviceType,
      startDate,
      endDate,
      search
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

    // Urgency level filter
    if (urgencyLevel) {
      filters.urgencyLevel = urgencyLevel;
    }

    // Priority filter
    if (priority) {
      filters.priority = parseInt(priority);
    }

    // Assigned admin filter
    if (assignedAdmin) {
      filters.assignedAdmin = assignedAdmin;
    }

    // Service type filter
    if (serviceType) {
      filters.serviceType = serviceType;
    }

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter (across order number, client name, target role)
    if (search) {
      filters.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'requirements.targetRole': { $regex: search, $options: 'i' } },
        { 'requirements.industryType': { $regex: search, $options: 'i' } }
      ];
    }

    // If user is admin (not super admin), only show assigned orders
    if (req.user.role === 'admin') {
      filters.$or = [
        { assignedAdmin: req.user._id },
        { assignedAdmin: null } // Unassigned orders
      ];
    }

    // Get orders with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      populate: [
        'client',
        'assignedAdmin',
        'files',
        'revisions'
      ]
    };

    const orders = await Order.findWithFilters(filters, options);
    const totalOrders = await Order.countDocuments(filters);
    const totalPages = Math.ceil(totalOrders / limit);

    // Get order statistics
    const stats = await Order.getStatistics(filters);

    logger.api('GET', '/api/orders', 200, 0, {
      totalOrders,
      page: parseInt(page),
      filters: Object.keys(filters)
    });

    res.status(200).json({
      success: true,
      message: 'Orders retrieved successfully',
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalOrders,
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
 * @route   GET /api/orders/:orderId
 * @desc    Get detailed information about a specific order
 * @access  Private (Admin/Client - own orders only)
 */
router.get('/:orderId',
  authenticate,
  createValidator(validators.idParam('orderId')),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('client', 'firstName lastName email phone')
      .populate('assignedAdmin', 'firstName lastName email')
      .populate({
        path: 'files',
        select: 'fileName fileType cloudinary.secureUrl createdAt fileSize'
      })
      .populate({
        path: 'revisions',
        select: 'revisionNumber status priority timeline.requestedAt'
      })
      .populate({
        path: 'communications',
        select: 'messageType content.text createdAt sender',
        populate: {
          path: 'sender',
          select: 'firstName lastName role'
        }
      });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    logger.business('order_viewed', 'order', orderId, {
      viewedBy: req.user._id,
      userRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: 'Order details retrieved successfully',
      data: {
        order
      }
    });
  })
);

/**
 * @route   POST /api/orders
 * @desc    Create a new order (typically from client-facing API)
 * @access  Private (Admin - for manual order creation)
 */
router.post('/',
  authenticate,
  requireAdmin,
  createValidator(validators.orderCreation),
  catchAsync(async (req, res) => {
    const orderData = {
      ...req.body,
      assignedAdmin: req.user._id // Assign to creating admin
    };

    // Create order
    const order = new Order(orderData);
    await order.save();

    // Create chat room for the order
    try {
      await ChatRoom.createForOrder(order._id, order.client, req.user._id);
    } catch (chatError) {
      logger.warn('Failed to create chat room for order', {
        orderId: order._id,
        error: chatError.message
      });
    }

    // Populate order details
    await order.populate('client assignedAdmin');

    logger.business('order_created', 'order', order._id, {
      createdBy: req.user._id,
      client: order.client._id,
      serviceType: order.serviceType,
      totalAmount: order.pricing.totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order
      }
    });
  })
);

/**
 * @route   PUT /api/orders/:orderId
 * @desc    Update order details and status
 * @access  Private (Admin only)
 */
router.put('/:orderId',
  authenticate,
  requireAdmin,
  createValidator([...validators.idParam('orderId'), ...validators.orderUpdate]),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const updates = req.body;

    // Find existing order
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Handle status updates with validation
    if (updates.status && updates.status !== existingOrder.status) {
      try {
        await existingOrder.updateStatus(
          updates.status, 
          req.user._id, 
          updates.statusNote || `Status updated by ${req.user.fullName}`
        );
        delete updates.status; // Remove from updates since it's handled separately
        delete updates.statusNote;
      } catch (statusError) {
        throw new AppError(statusError.message, 400, 'INVALID_STATUS_TRANSITION');
      }
    }

    // Update other fields
    const allowedUpdates = [
      'assignedAdmin',
      'priority',
      'urgencyLevel',
      'requirements',
      'pricing',
      'timeline',
      'qualityScore'
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Apply updates
    Object.assign(existingOrder, filteredUpdates);
    await existingOrder.save();

    // Add internal note about the update
    if (Object.keys(filteredUpdates).length > 0) {
      await existingOrder.addInternalNote(
        req.user._id,
        `Order updated: ${Object.keys(filteredUpdates).join(', ')}`,
        'general'
      );
    }

    // Populate updated order
    await existingOrder.populate('client assignedAdmin files revisions');

    logger.business('order_updated', 'order', orderId, {
      updatedBy: req.user._id,
      updatedFields: Object.keys(filteredUpdates),
      previousStatus: existingOrder.status
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: {
        order: existingOrder
      }
    });
  })
);

/**
 * @route   PUT /api/orders/:orderId/assign
 * @desc    Assign order to an admin
 * @access  Private (Admin only)
 */
router.put('/:orderId/assign',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('orderId')),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      throw new AppError('Admin ID is required', 400, 'ADMIN_ID_REQUIRED');
    }

    // Verify admin exists and has correct role
    const admin = await User.findById(adminId);
    if (!admin || !['admin', 'super_admin'].includes(admin.role)) {
      throw new AppError('Invalid admin ID', 400, 'INVALID_ADMIN_ID');
    }

    // Update order
    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        assignedAdmin: adminId,
        'timeline.lastActivity': new Date()
      },
      { new: true }
    ).populate('client assignedAdmin');

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Add internal note
    await order.addInternalNote(
      req.user._id,
      `Order assigned to ${admin.fullName}`,
      'medium'
    );

    // Update chat room participants if exists
    try {
      const chatRoom = await ChatRoom.findOne({ order: orderId });
      if (chatRoom) {
        await chatRoom.addParticipant(adminId, admin.role);
      }
    } catch (chatError) {
      logger.warn('Failed to update chat room participants', {
        orderId,
        error: chatError.message
      });
    }

    logger.business('order_assigned', 'order', orderId, {
      assignedBy: req.user._id,
      assignedTo: adminId,
      previousAssignedAdmin: order.assignedAdmin
    });

    res.status(200).json({
      success: true,
      message: 'Order assigned successfully',
      data: {
        order
      }
    });
  })
);

/**
 * @route   POST /api/orders/:orderId/notes
 * @desc    Add internal note to order
 * @access  Private (Admin only)
 */
router.post('/:orderId/notes',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('orderId')),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { note, priority = 'medium' } = req.body;

    if (!note || note.trim().length === 0) {
      throw new AppError('Note content is required', 400, 'NOTE_REQUIRED');
    }

    if (note.length > 1000) {
      throw new AppError('Note cannot exceed 1000 characters', 400, 'NOTE_TOO_LONG');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    await order.addInternalNote(req.user._id, note.trim(), priority);

    logger.business('order_note_added', 'order', orderId, {
      addedBy: req.user._id,
      priority,
      noteLength: note.length
    });

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: {
          admin: req.user._id,
          note: note.trim(),
          priority,
          createdAt: new Date()
        }
      }
    });
  })
);

/**
 * @route   GET /api/orders/:orderId/timeline
 * @desc    Get order timeline and history
 * @access  Private (Admin/Client - own orders only)
 */
router.get('/:orderId/timeline',
  authenticate,
  createValidator(validators.idParam('orderId')),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('internalNotes.admin', 'firstName lastName')
      .populate('revisions', 'revisionNumber status timeline.requestedAt timeline.completedAt')
      .populate('files', 'fileName fileType createdAt uploadedBy')
      .populate('communications', 'messageType createdAt sender');

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Build timeline from various sources
    const timeline = [];

    // Order creation
    timeline.push({
      type: 'order_created',
      timestamp: order.createdAt,
      description: 'Order created',
      data: {
        orderNumber: order.orderNumber,
        serviceType: order.serviceType
      }
    });

    // Status changes (from internal notes)
    order.internalNotes
      .filter(note => note.note.includes('Status changed'))
      .forEach(note => {
        timeline.push({
          type: 'status_change',
          timestamp: note.createdAt,
          description: note.note,
          admin: note.admin,
          priority: note.priority
        });
      });

    // File uploads
    order.files.forEach(file => {
      timeline.push({
        type: 'file_uploaded',
        timestamp: file.createdAt,
        description: `${file.fileType.replace('_', ' ')} uploaded: ${file.fileName}`,
        data: {
          fileName: file.fileName,
          fileType: file.fileType
        }
      });
    });

    // Revisions
    order.revisions.forEach(revision => {
      timeline.push({
        type: 'revision_requested',
        timestamp: revision.timeline.requestedAt,
        description: `Revision #${revision.revisionNumber} requested`,
        data: {
          revisionId: revision._id,
          status: revision.status
        }
      });

      if (revision.timeline.completedAt) {
        timeline.push({
          type: 'revision_completed',
          timestamp: revision.timeline.completedAt,
          description: `Revision #${revision.revisionNumber} completed`,
          data: {
            revisionId: revision._id
          }
        });
      }
    });

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json({
      success: true,
      message: 'Order timeline retrieved successfully',
      data: {
        timeline
      }
    });
  })
);

/**
 * @route   GET /api/orders/statistics
 * @desc    Get order statistics and analytics
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
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    if (adminId) {
      filters.assignedAdmin = adminId;
    }

    // If user is admin (not super admin), only show their orders
    if (req.user.role === 'admin') {
      filters.assignedAdmin = req.user._id;
    }

    const stats = await Order.getStatistics(filters);

    // Additional analytics
    const [
      recentOrders,
      urgentOrders,
      overdueOrders
    ] = await Promise.all([
      // Recent orders (last 7 days)
      Order.find({
        ...filters,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).countDocuments(),

      // Urgent orders
      Order.find({
        ...filters,
        urgencyLevel: { $in: ['urgent', 'express'] },
        status: { $nin: ['completed', 'delivered', 'cancelled'] }
      }).countDocuments(),

      // Overdue orders
      Order.find({
        ...filters,
        'timeline.estimatedCompletion': { $lt: new Date() },
        status: { $nin: ['completed', 'delivered', 'cancelled'] }
      }).countDocuments()
    ]);

    res.status(200).json({
      success: true,
      message: 'Order statistics retrieved successfully',
      data: {
        ...stats,
        analytics: {
          recentOrders,
          urgentOrders,
          overdueOrders
        }
      }
    });
  })
);

module.exports = router;
