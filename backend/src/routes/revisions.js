const express = require('express');
const Revision = require('../models/Revision');
const Order = require('../models/Order');
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
 * @route   GET /api/revisions
 * @desc    Retrieve all revision requests with filters
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
      sortBy = 'timeline.requestedAt',
      sortOrder = 'desc',
      status,
      priority,
      urgencyLevel,
      type,
      assignedAdmin,
      orderId,
      clientId,
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

    // Priority filter
    if (priority) {
      if (Array.isArray(priority)) {
        filters.priority = { $in: priority };
      } else {
        filters.priority = priority;
      }
    }

    // Urgency level filter
    if (urgencyLevel) {
      filters.urgencyLevel = urgencyLevel;
    }

    // Type filter
    if (type) {
      filters.type = type;
    }

    // Assigned admin filter
    if (assignedAdmin) {
      filters.assignedAdmin = assignedAdmin;
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
      filters['timeline.requestedAt'] = {};
      if (startDate) {
        filters['timeline.requestedAt'].$gte = new Date(startDate);
      }
      if (endDate) {
        filters['timeline.requestedAt'].$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filters.$or = [
        { revisionId: { $regex: search, $options: 'i' } },
        { 'requestDetails.description': { $regex: search, $options: 'i' } }
      ];
    }

    // If user is admin (not super admin), only show assigned revisions
    if (req.user.role === 'admin') {
      filters.assignedAdmin = req.user._id;
    }

    // Get revisions with pagination
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
        'assignedAdmin',
        'requestDetails.attachments',
        'deliverables.revisedFiles'
      ]
    };

    const revisions = await Revision.findWithFilters(filters, options);
    const totalRevisions = await Revision.countDocuments(filters);
    const totalPages = Math.ceil(totalRevisions / limit);

    // Get revision statistics
    const stats = await Revision.getStatistics(filters);

    logger.api('GET', '/api/revisions', 200, 0, {
      totalRevisions,
      page: parseInt(page),
      filters: Object.keys(filters)
    });

    res.status(200).json({
      success: true,
      message: 'Revisions retrieved successfully',
      data: {
        revisions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalRevisions,
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
 * @route   GET /api/revisions/:revisionId
 * @desc    Get detailed information about a specific revision
 * @access  Private (Admin/Client - own revisions only)
 */
router.get('/:revisionId',
  authenticate,
  createValidator(validators.idParam('revisionId')),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;

    const revision = await Revision.findById(revisionId)
      .populate({
        path: 'order',
        select: 'orderNumber serviceType requirements',
        populate: {
          path: 'client',
          select: 'firstName lastName email phone'
        }
      })
      .populate('client', 'firstName lastName email phone')
      .populate('assignedAdmin', 'firstName lastName email')
      .populate('requestDetails.attachments')
      .populate('requestDetails.referenceFiles')
      .populate('deliverables.revisedFiles')
      .populate('communication.messages')
      .populate('internalNotes.admin', 'firstName lastName');

    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    logger.business('revision_viewed', 'revision', revisionId, {
      viewedBy: req.user._id,
      userRole: req.user.role,
      revisionStatus: revision.status
    });

    res.status(200).json({
      success: true,
      message: 'Revision details retrieved successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   POST /api/revisions
 * @desc    Create new revision request
 * @access  Private (Client/Admin)
 */
router.post('/',
  authenticate,
  createValidator(validators.revisionCreation),
  catchAsync(async (req, res) => {
    const {
      order: orderId,
      type,
      priority,
      urgencyLevel,
      requestDetails,
      timeline
    } = req.body;

    // Verify order exists and user has access
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user can create revision for this order
    if (req.user.role === 'client' && order.client.toString() !== req.user._id.toString()) {
      throw new AppError('You can only create revisions for your own orders', 403, 'ACCESS_DENIED');
    }

    // Check if order status allows revisions
    const allowedStatuses = ['completed', 'delivered', 'client_review'];
    if (!allowedStatuses.includes(order.status)) {
      throw new AppError('Revisions can only be requested for completed orders', 400, 'INVALID_ORDER_STATUS');
    }

    // Create revision data
    const revisionData = {
      order: orderId,
      client: order.client,
      assignedAdmin: order.assignedAdmin,
      type,
      priority,
      urgencyLevel,
      requestDetails,
      timeline: {
        ...timeline,
        requestedAt: new Date()
      }
    };

    // Set deadline for urgent revisions
    if (urgencyLevel === 'urgent') {
      revisionData.timeline.deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    } else if (urgencyLevel === 'express') {
      revisionData.timeline.deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    }

    const revision = new Revision(revisionData);
    await revision.save();

    // Update order status
    await order.updateStatus('revision_requested', req.user._id, `Revision #${revision.revisionNumber} requested`);

    // Populate revision details
    await revision.populate('order client assignedAdmin');

    logger.business('revision_created', 'revision', revision._id, {
      createdBy: req.user._id,
      orderId,
      type,
      priority,
      urgencyLevel
    });

    res.status(201).json({
      success: true,
      message: 'Revision request created successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   PUT /api/revisions/:revisionId
 * @desc    Update revision details (status/priority)
 * @access  Private (Admin only)
 */
router.put('/:revisionId',
  authenticate,
  requireAdmin,
  createValidator([...validators.idParam('revisionId'), ...validators.revisionUpdate]),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;
    const updates = req.body;

    const revision = await Revision.findById(revisionId);
    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    // Handle status updates with validation
    if (updates.status && updates.status !== revision.status) {
      try {
        await revision.updateStatus(
          updates.status,
          req.user._id,
          updates.statusNote || `Status updated by ${req.user.fullName}`
        );
        delete updates.status;
        delete updates.statusNote;
      } catch (statusError) {
        throw new AppError(statusError.message, 400, 'INVALID_STATUS_TRANSITION');
      }
    }

    // Update other allowed fields
    const allowedUpdates = [
      'priority',
      'urgencyLevel',
      'effort.estimatedHours',
      'effort.actualHours',
      'effort.complexity',
      'effort.difficultyRating',
      'timeline.estimatedCompletion',
      'feedback.adminNotes'
    ];

    const filteredUpdates = {};
    allowedUpdates.forEach(field => {
      const keys = field.split('.');
      if (keys.length === 2) {
        if (updates[keys[0]] && updates[keys[0]][keys[1]] !== undefined) {
          if (!filteredUpdates[keys[0]]) filteredUpdates[keys[0]] = {};
          filteredUpdates[keys[0]][keys[1]] = updates[keys[0]][keys[1]];
        }
      } else if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Apply updates
    Object.assign(revision, filteredUpdates);
    await revision.save();

    // Add internal note about the update
    if (Object.keys(filteredUpdates).length > 0) {
      await revision.addInternalNote(
        req.user._id,
        `Revision updated: ${Object.keys(filteredUpdates).join(', ')}`,
        'general'
      );
    }

    // Populate updated revision
    await revision.populate('order client assignedAdmin');

    logger.business('revision_updated', 'revision', revisionId, {
      updatedBy: req.user._id,
      updatedFields: Object.keys(filteredUpdates)
    });

    res.status(200).json({
      success: true,
      message: 'Revision updated successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   PUT /api/revisions/:revisionId/complete
 * @desc    Mark revision as completed
 * @access  Private (Admin only)
 */
router.put('/:revisionId/complete',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('revisionId')),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;
    const { changesSummary, revisedFiles = [], clientNotes = '' } = req.body;

    if (!changesSummary || changesSummary.trim().length === 0) {
      throw new AppError('Changes summary is required', 400, 'CHANGES_SUMMARY_REQUIRED');
    }

    const revision = await Revision.findById(revisionId).populate('order');
    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    if (revision.status !== 'in_progress') {
      throw new AppError('Only in-progress revisions can be completed', 400, 'INVALID_REVISION_STATUS');
    }

    // Mark revision as completed
    await revision.markAsCompleted(req.user._id, changesSummary, revisedFiles);

    // Update order status
    if (revision.order) {
      await revision.order.updateStatus(
        'client_review',
        req.user._id,
        `Revision #${revision.revisionNumber} completed and delivered for review`
      );
    }

    // Add client notes if provided
    if (clientNotes.trim().length > 0) {
      await revision.addInternalNote(
        req.user._id,
        `Client notes: ${clientNotes}`,
        'general'
      );
    }

    // Populate revision details
    await revision.populate('order client assignedAdmin deliverables.revisedFiles');

    logger.business('revision_completed', 'revision', revisionId, {
      completedBy: req.user._id,
      orderId: revision.order?._id,
      revisionNumber: revision.revisionNumber
    });

    res.status(200).json({
      success: true,
      message: 'Revision marked as completed successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   POST /api/revisions/:revisionId/notes
 * @desc    Add internal note to revision
 * @access  Private (Admin only)
 */
router.post('/:revisionId/notes',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('revisionId')),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;
    const { note, noteType = 'general' } = req.body;

    if (!note || note.trim().length === 0) {
      throw new AppError('Note content is required', 400, 'NOTE_REQUIRED');
    }

    if (note.length > 1000) {
      throw new AppError('Note cannot exceed 1000 characters', 400, 'NOTE_TOO_LONG');
    }

    const revision = await Revision.findById(revisionId);
    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    await revision.addInternalNote(req.user._id, note.trim(), noteType);

    logger.business('revision_note_added', 'revision', revisionId, {
      addedBy: req.user._id,
      noteType,
      noteLength: note.length
    });

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: {
        note: {
          admin: req.user._id,
          note: note.trim(),
          noteType,
          createdAt: new Date()
        }
      }
    });
  })
);

/**
 * @route   POST /api/revisions/:revisionId/approve
 * @desc    Client approves completed revision
 * @access  Private (Client only - own revisions)
 */
router.post('/:revisionId/approve',
  authenticate,
  createValidator(validators.idParam('revisionId')),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;
    const { rating, comments = '' } = req.body;

    // Only clients can approve revisions
    if (req.user.role !== 'client') {
      throw new AppError('Only clients can approve revisions', 403, 'ACCESS_DENIED');
    }

    const revision = await Revision.findById(revisionId).populate('order');
    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    if (revision.status !== 'delivered') {
      throw new AppError('Only delivered revisions can be approved', 400, 'INVALID_REVISION_STATUS');
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
    }

    // Update revision status and feedback
    revision.status = 'approved';
    revision.timeline.clientResponseAt = new Date();
    
    if (rating) {
      revision.feedback.clientRating = rating;
    }
    
    if (comments.trim().length > 0) {
      revision.feedback.clientComments = comments.trim();
    }
    
    revision.feedback.submittedAt = new Date();
    
    await revision.save();

    // Update order status if this is the final revision
    if (revision.order) {
      await revision.order.updateStatus(
        'completed',
        req.user._id,
        `Revision #${revision.revisionNumber} approved by client`
      );
    }

    logger.business('revision_approved', 'revision', revisionId, {
      approvedBy: req.user._id,
      rating,
      orderId: revision.order?._id
    });

    res.status(200).json({
      success: true,
      message: 'Revision approved successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   POST /api/revisions/:revisionId/reject
 * @desc    Client rejects completed revision
 * @access  Private (Client only - own revisions)
 */
router.post('/:revisionId/reject',
  authenticate,
  createValidator(validators.idParam('revisionId')),
  checkResourceAccess('revision'),
  catchAsync(async (req, res) => {
    const { revisionId } = req.params;
    const { comments } = req.body;

    // Only clients can reject revisions
    if (req.user.role !== 'client') {
      throw new AppError('Only clients can reject revisions', 403, 'ACCESS_DENIED');
    }

    if (!comments || comments.trim().length === 0) {
      throw new AppError('Rejection reason is required', 400, 'REJECTION_REASON_REQUIRED');
    }

    const revision = await Revision.findById(revisionId).populate('order');
    if (!revision) {
      throw new AppError('Revision not found', 404, 'REVISION_NOT_FOUND');
    }

    if (revision.status !== 'delivered') {
      throw new AppError('Only delivered revisions can be rejected', 400, 'INVALID_REVISION_STATUS');
    }

    // Update revision status and feedback
    revision.status = 'rejected';
    revision.timeline.clientResponseAt = new Date();
    revision.feedback.clientComments = comments.trim();
    revision.feedback.submittedAt = new Date();
    
    await revision.save();

    // Update order status back to revision requested
    if (revision.order) {
      await revision.order.updateStatus(
        'revision_requested',
        req.user._id,
        `Revision #${revision.revisionNumber} rejected by client: ${comments.trim()}`
      );
    }

    logger.business('revision_rejected', 'revision', revisionId, {
      rejectedBy: req.user._id,
      reason: comments.trim(),
      orderId: revision.order?._id
    });

    res.status(200).json({
      success: true,
      message: 'Revision rejected successfully',
      data: {
        revision
      }
    });
  })
);

/**
 * @route   GET /api/revisions/statistics
 * @desc    Get revision statistics and analytics
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
      filters['timeline.requestedAt'] = {};
      if (startDate) filters['timeline.requestedAt'].$gte = new Date(startDate);
      if (endDate) filters['timeline.requestedAt'].$lte = new Date(endDate);
    }

    if (adminId) {
      filters.assignedAdmin = adminId;
    }

    // If user is admin (not super admin), only show their revisions
    if (req.user.role === 'admin') {
      filters.assignedAdmin = req.user._id;
    }

    const stats = await Revision.getStatistics(filters);

    // Additional analytics
    const [
      pendingRevisions,
      overdueRevisions,
      urgentRevisions
    ] = await Promise.all([
      // Pending revisions
      Revision.find({
        ...filters,
        status: { $in: ['pending', 'acknowledged'] }
      }).countDocuments(),

      // Overdue revisions
      Revision.find({
        ...filters,
        'timeline.deadline': { $lt: new Date() },
        status: { $nin: ['completed', 'delivered', 'approved', 'cancelled'] }
      }).countDocuments(),

      // Urgent revisions
      Revision.find({
        ...filters,
        urgencyLevel: { $in: ['urgent', 'express'] },
        status: { $nin: ['completed', 'delivered', 'approved', 'cancelled'] }
      }).countDocuments()
    ]);

    res.status(200).json({
      success: true,
      message: 'Revision statistics retrieved successfully',
      data: {
        ...stats,
        analytics: {
          pendingRevisions,
          overdueRevisions,
          urgentRevisions
        }
      }
    });
  })
);

module.exports = router;
