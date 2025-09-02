const express = require('express');
const multer = require('multer');
const File = require('../models/File');
const Order = require('../models/Order');
const { 
  authenticate, 
  requireAdmin, 
  checkResourceAccess 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, GIF', 400, 'INVALID_FILE_TYPE'), false);
    }
  }
});

/**
 * @route   POST /api/orders/:orderId/files
 * @desc    Upload resume/draft files (Cloudinary integration)
 * @access  Private (Admin/Client - own orders only)
 */
router.post('/:orderId/files',
  authenticate,
  upload.array('files', 5), // Allow up to 5 files
  createValidator(validators.idParam('orderId')),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { fileType = 'document', description = '', visibility = 'order_specific', tags = [] } = req.body;

    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400, 'NO_FILES_UPLOADED');
    }

    // Verify order exists and user has access
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user can upload files for this order
    if (req.user.role === 'client' && order.client.toString() !== req.user._id.toString()) {
      throw new AppError('You can only upload files for your own orders', 403, 'ACCESS_DENIED');
    }

    const uploadedFiles = [];
    const uploadErrors = [];

    // Process each file
    for (const file of req.files) {
      try {
        // Generate secure filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const safeFileName = `${order.orderNumber}_${timestamp}_${randomString}`;

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(file.buffer, {
          public_id: safeFileName,
          folder: `skillx/orders/${orderId}`,
          resource_type: 'auto',
          access_mode: 'authenticated' // Secure access
        });

        // Create file record
        const fileData = {
          fileName: file.originalname,
          cloudinaryId: uploadResult.public_id,
          cloudinaryUrl: uploadResult.secure_url,
          fileType,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: req.user._id,
          order: orderId,
          visibility,
          description: description || `${fileType} file for order ${order.orderNumber}`,
          tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(Boolean),
          metadata: {
            originalName: file.originalname,
            uploadMethod: 'direct',
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
          }
        };

        const newFile = new File(fileData);
        await newFile.save();

        // Populate file details
        await newFile.populate('uploadedBy', 'firstName lastName email');

        uploadedFiles.push(newFile);

        logger.business('file_uploaded', 'file', newFile._id, {
          uploadedBy: req.user._id,
          orderId,
          fileName: file.originalname,
          fileSize: file.size,
          fileType
        });

      } catch (uploadError) {
        logger.error('File upload failed', {
          error: uploadError.message,
          fileName: file.originalname,
          orderId,
          uploadedBy: req.user._id
        });

        uploadErrors.push({
          fileName: file.originalname,
          error: uploadError.message
        });
      }
    }

    // Update order with new files if any were uploaded successfully
    if (uploadedFiles.length > 0) {
      const fileIds = uploadedFiles.map(file => file._id);
      
      if (fileType === 'resume' || fileType === 'draft') {
        order.files.resumes.push(...fileIds);
      } else if (fileType === 'cover_letter') {
        order.files.coverLetters.push(...fileIds);
      } else {
        order.files.additionalDocuments.push(...fileIds);
      }

      await order.save();

      // Add order history entry
      await order.addToHistory(
        req.user._id,
        'files_uploaded',
        `${uploadedFiles.length} file(s) uploaded: ${uploadedFiles.map(f => f.fileName).join(', ')}`
      );
    }

    const response = {
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: {
        uploadedFiles,
        totalUploaded: uploadedFiles.length,
        totalFailed: uploadErrors.length
      }
    };

    if (uploadErrors.length > 0) {
      response.warnings = uploadErrors;
      response.message += `, ${uploadErrors.length} failed`;
    }

    res.status(uploadedFiles.length > 0 ? 201 : 400).json(response);
  })
);

/**
 * @route   GET /api/files
 * @desc    Retrieve files with filters
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
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
      fileType,
      visibility,
      orderId,
      uploadedBy,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filters = {};

    if (fileType) {
      filters.fileType = fileType;
    }

    if (visibility) {
      filters.visibility = visibility;
    }

    if (orderId) {
      filters.order = orderId;
    }

    if (uploadedBy) {
      filters.uploadedBy = uploadedBy;
    }

    // Date range filter
    if (startDate || endDate) {
      filters.uploadedAt = {};
      if (startDate) filters.uploadedAt.$gte = new Date(startDate);
      if (endDate) filters.uploadedAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filters.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Get files with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'order',
          select: 'orderNumber serviceType client',
          populate: {
            path: 'client',
            select: 'firstName lastName email'
          }
        },
        'uploadedBy',
        'versions.uploadedBy'
      ]
    };

    const result = await File.paginate(filters, options);

    // Get file statistics
    const stats = await File.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          avgSize: { $avg: '$fileSize' },
          fileTypes: { $push: '$fileType' }
        }
      }
    ]);

    const fileTypeDistribution = await File.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    logger.api('GET', '/api/files', 200, 0, {
      totalFiles: result.totalDocs,
      page: parseInt(page),
      filters: Object.keys(filters)
    });

    res.status(200).json({
      success: true,
      message: 'Files retrieved successfully',
      data: {
        files: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.totalDocs,
          itemsPerPage: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        statistics: {
          ...stats[0],
          fileTypeDistribution
        }
      }
    });
  })
);

/**
 * @route   GET /api/files/:fileId
 * @desc    Get file details and download information
 * @access  Private (Admin/Client - own files only)
 */
router.get('/:fileId',
  authenticate,
  createValidator(validators.idParam('fileId')),
  checkResourceAccess('file'),
  catchAsync(async (req, res) => {
    const { fileId } = req.params;

    const file = await File.findById(fileId)
      .populate('order', 'orderNumber serviceType client')
      .populate('uploadedBy', 'firstName lastName email')
      .populate('versions.uploadedBy', 'firstName lastName');

    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    // Check if file is accessible to user
    if (req.user.role === 'client') {
      if (file.visibility === 'admin_only') {
        throw new AppError('You do not have access to this file', 403, 'ACCESS_DENIED');
      }
      
      if (file.order && file.order.client.toString() !== req.user._id.toString()) {
        throw new AppError('You can only access files from your own orders', 403, 'ACCESS_DENIED');
      }
    }

    // Track file access
    await file.trackAccess(req.user._id, req.ip, req.get('User-Agent'));

    logger.business('file_accessed', 'file', fileId, {
      accessedBy: req.user._id,
      userRole: req.user.role,
      orderId: file.order?._id
    });

    res.status(200).json({
      success: true,
      message: 'File details retrieved successfully',
      data: {
        file
      }
    });
  })
);

/**
 * @route   GET /api/files/:fileId/download
 * @desc    Download file with access tracking
 * @access  Private (Admin/Client - own files only)
 */
router.get('/:fileId/download',
  authenticate,
  createValidator(validators.idParam('fileId')),
  checkResourceAccess('file'),
  catchAsync(async (req, res) => {
    const { fileId } = req.params;

    const file = await File.findById(fileId).populate('order');
    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    // Check if file is accessible to user
    if (req.user.role === 'client') {
      if (file.visibility === 'admin_only') {
        throw new AppError('You do not have access to this file', 403, 'ACCESS_DENIED');
      }
      
      if (file.order && file.order.client.toString() !== req.user._id.toString()) {
        throw new AppError('You can only download files from your own orders', 403, 'ACCESS_DENIED');
      }
    }

    // Track download
    await file.trackDownload(req.user._id, req.ip, req.get('User-Agent'));

    logger.business('file_downloaded', 'file', fileId, {
      downloadedBy: req.user._id,
      userRole: req.user.role,
      orderId: file.order?._id,
      fileName: file.fileName
    });

    res.status(200).json({
      success: true,
      message: 'File download link generated',
      data: {
        downloadUrl: file.cloudinaryUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      }
    });
  })
);

/**
 * @route   PUT /api/files/:fileId
 * @desc    Update file metadata
 * @access  Private (Admin only)
 */
router.put('/:fileId',
  authenticate,
  requireAdmin,
  createValidator([...validators.idParam('fileId'), ...validators.fileUpdate]),
  checkResourceAccess('file'),
  catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const { description, tags, visibility, fileType } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    // Update allowed fields
    const updates = {};
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (visibility !== undefined) updates.visibility = visibility;
    if (fileType !== undefined) updates.fileType = fileType;

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid updates provided', 400, 'NO_UPDATES');
    }

    // Apply updates
    Object.assign(file, updates);
    file.lastModified = new Date();
    await file.save();

    logger.business('file_updated', 'file', fileId, {
      updatedBy: req.user._id,
      updatedFields: Object.keys(updates)
    });

    res.status(200).json({
      success: true,
      message: 'File updated successfully',
      data: {
        file
      }
    });
  })
);

/**
 * @route   POST /api/files/:fileId/versions
 * @desc    Upload new version of existing file
 * @access  Private (Admin only)
 */
router.post('/:fileId/versions',
  authenticate,
  requireAdmin,
  upload.single('file'),
  createValidator(validators.idParam('fileId')),
  checkResourceAccess('file'),
  catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const { versionNotes = '' } = req.body;

    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
    }

    const originalFile = await File.findById(fileId).populate('order');
    if (!originalFile) {
      throw new AppError('Original file not found', 404, 'FILE_NOT_FOUND');
    }

    // Validate file type matches original
    if (req.file.mimetype !== originalFile.mimeType) {
      throw new AppError('New version must have the same file type as original', 400, 'FILE_TYPE_MISMATCH');
    }

    try {
      // Generate secure filename for new version
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const safeFileName = `${originalFile.order?.orderNumber || 'file'}_v${originalFile.versions.length + 2}_${timestamp}_${randomString}`;

      // Upload new version to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file.buffer, {
        public_id: safeFileName,
        folder: `skillx/orders/${originalFile.order?._id || 'misc'}/versions`,
        resource_type: 'auto',
        access_mode: 'authenticated'
      });

      // Add new version to file
      await originalFile.addVersion({
        cloudinaryId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        fileSize: req.file.size,
        uploadedBy: req.user._id,
        versionNotes: versionNotes.trim()
      });

      logger.business('file_version_added', 'file', fileId, {
        uploadedBy: req.user._id,
        versionNumber: originalFile.versions.length,
        fileSize: req.file.size
      });

      res.status(201).json({
        success: true,
        message: 'New file version uploaded successfully',
        data: {
          file: originalFile,
          newVersion: originalFile.versions[originalFile.versions.length - 1]
        }
      });

    } catch (uploadError) {
      logger.error('File version upload failed', {
        error: uploadError.message,
        fileId,
        uploadedBy: req.user._id
      });

      throw new AppError('Failed to upload new version', 500, 'VERSION_UPLOAD_FAILED');
    }
  })
);

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete file (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:fileId',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('fileId')),
  checkResourceAccess('file'),
  catchAsync(async (req, res) => {
    const { fileId } = req.params;
    const { reason = 'Deleted by admin' } = req.body;

    const file = await File.findById(fileId).populate('order');
    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    if (file.isDeleted) {
      throw new AppError('File is already deleted', 400, 'FILE_ALREADY_DELETED');
    }

    // Soft delete the file
    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = req.user._id;
    file.metadata.deletionReason = reason;
    await file.save();

    // Remove file references from order
    if (file.order) {
      const order = file.order;
      order.files.resumes = order.files.resumes.filter(id => id.toString() !== fileId);
      order.files.coverLetters = order.files.coverLetters.filter(id => id.toString() !== fileId);
      order.files.additionalDocuments = order.files.additionalDocuments.filter(id => id.toString() !== fileId);
      await order.save();
    }

    logger.business('file_deleted', 'file', fileId, {
      deletedBy: req.user._id,
      reason,
      orderId: file.order?._id,
      fileName: file.fileName
    });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: {
        fileId,
        deletedAt: file.deletedAt
      }
    });
  })
);

/**
 * @route   POST /api/files/:fileId/restore
 * @desc    Restore deleted file
 * @access  Private (Super Admin only)
 */
router.post('/:fileId/restore',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('fileId')),
  catchAsync(async (req, res) => {
    // Only super admins can restore files
    if (req.user.role !== 'super_admin') {
      throw new AppError('Only super admins can restore deleted files', 403, 'ACCESS_DENIED');
    }

    const { fileId } = req.params;

    const file = await File.findById(fileId).populate('order');
    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    if (!file.isDeleted) {
      throw new AppError('File is not deleted', 400, 'FILE_NOT_DELETED');
    }

    // Restore the file
    file.isDeleted = false;
    file.deletedAt = null;
    file.deletedBy = null;
    delete file.metadata.deletionReason;
    await file.save();

    logger.business('file_restored', 'file', fileId, {
      restoredBy: req.user._id,
      orderId: file.order?._id,
      fileName: file.fileName
    });

    res.status(200).json({
      success: true,
      message: 'File restored successfully',
      data: {
        file
      }
    });
  })
);

module.exports = router;
