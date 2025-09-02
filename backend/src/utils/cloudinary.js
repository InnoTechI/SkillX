const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * Cloudinary configuration and file upload utilities
 * Handles secure file uploads, transformations, and management
 */

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * File upload configuration
 */
const uploadConfig = {
  // Maximum file size (10MB)
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  
  // Allowed file types
  allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,jpeg,png,gif,txt').split(','),
  
  // Allowed MIME types
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'text/plain',
    'application/rtf'
  ]
};

/**
 * File type validation
 */
const validateFileType = (file) => {
  // Check MIME type
  if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }
  
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (!uploadConfig.allowedFileTypes.includes(fileExtension)) {
    throw new Error(`File extension .${fileExtension} is not allowed`);
  }
  
  // Check file size
  if (file.size > uploadConfig.maxFileSize) {
    throw new Error(`File size ${file.size} exceeds maximum allowed size of ${uploadConfig.maxFileSize} bytes`);
  }
  
  return true;
};

/**
 * Generate secure filename
 */
const generateSecureFilename = (originalName, fileType = 'document') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${fileType}_${baseName}_${timestamp}_${randomString}${extension}`;
};

/**
 * Get folder path based on file type
 */
const getFolderPath = (fileType, orderId) => {
  const basePath = `skillx/${process.env.NODE_ENV || 'development'}`;
  
  switch (fileType) {
    case 'original_resume':
      return `${basePath}/resumes/original/${orderId}`;
    case 'draft_resume':
      return `${basePath}/resumes/drafts/${orderId}`;
    case 'final_resume':
      return `${basePath}/resumes/final/${orderId}`;
    case 'cover_letter':
      return `${basePath}/cover_letters/${orderId}`;
    case 'linkedin_profile':
      return `${basePath}/linkedin/${orderId}`;
    case 'payment_proof':
      return `${basePath}/payments/${orderId}`;
    case 'revision_feedback':
      return `${basePath}/revisions/${orderId}`;
    case 'template':
      return `${basePath}/templates`;
    default:
      return `${basePath}/documents/${orderId}`;
  }
};

/**
 * Cloudinary storage configuration
 */
const createCloudinaryStorage = (fileType, orderId) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: getFolderPath(fileType, orderId),
      allowed_formats: uploadConfig.allowedFileTypes,
      resource_type: 'auto', // Automatically detect resource type
      public_id: (req, file) => generateSecureFilename(file.originalname, fileType),
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      transformation: [
        // Apply transformations based on file type
        ...(file.mimetype.startsWith('image/') ? [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ] : [])
      ]
    }
  });
};

/**
 * Multer configuration for file uploads
 */
const createUploadMiddleware = (fileType = 'document', orderId = null) => {
  const storage = orderId ? createCloudinaryStorage(fileType, orderId) : multer.memoryStorage();
  
  return multer({
    storage,
    limits: {
      fileSize: uploadConfig.maxFileSize,
      files: 5, // Maximum 5 files per request
      fields: 10 // Maximum 10 non-file fields
    },
    fileFilter: (req, file, cb) => {
      try {
        validateFileType(file);
        cb(null, true);
      } catch (error) {
        cb(error, false);
      }
    }
  });
};

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (buffer, options = {}) => {
  const {
    folder = 'skillx/uploads',
    publicId = null,
    resourceType = 'auto',
    transformation = []
  } = options;

  try {
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      transformation
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) throw error;
        return result;
      }
    );

    // Convert buffer to stream and upload
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    logger.error('Cloudinary upload failed', error);
    throw new Error('File upload failed');
  }
};

/**
 * Delete file from Cloudinary
 */
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    logger.info('File deleted from Cloudinary', {
      publicId,
      result: result.result
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary deletion failed', error, { publicId });
    throw new Error('File deletion failed');
  }
};

/**
 * Generate signed download URL
 */
const generateSignedUrl = (publicId, options = {}) => {
  const {
    expiresAt = Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    transformation = [],
    resourceType = 'auto'
  } = options;

  try {
    return cloudinary.utils.private_download_url(publicId, {
      expires_at: expiresAt,
      resource_type: resourceType,
      transformation
    });
  } catch (error) {
    logger.error('Failed to generate signed URL', error, { publicId });
    throw new Error('Failed to generate download URL');
  }
};

/**
 * Get file information from Cloudinary
 */
const getFileInfo = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    return {
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      url: result.url,
      secureUrl: result.secure_url,
      createdAt: result.created_at,
      version: result.version
    };
  } catch (error) {
    logger.error('Failed to get file info from Cloudinary', error, { publicId });
    throw new Error('Failed to retrieve file information');
  }
};

/**
 * Upload multiple files
 */
const uploadMultipleFiles = async (files, options = {}) => {
  const {
    fileType = 'document',
    orderId = null,
    maxFiles = 5
  } = options;

  if (!Array.isArray(files)) {
    files = [files];
  }

  if (files.length > maxFiles) {
    throw new Error(`Cannot upload more than ${maxFiles} files at once`);
  }

  const uploadPromises = files.map(async (file) => {
    // Validate file
    validateFileType(file);

    // Upload to Cloudinary
    const folder = getFolderPath(fileType, orderId);
    const publicId = generateSecureFilename(file.originalname, fileType);

    const result = await uploadToCloudinary(file.buffer, {
      folder,
      publicId,
      resourceType: file.mimetype.startsWith('image/') ? 'image' : 'raw'
    });

    return {
      originalName: file.originalname,
      fileName: result.public_id.split('/').pop(),
      publicId: result.public_id,
      url: result.url,
      secureUrl: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
      version: result.version.toString(),
      signature: result.signature
    };
  });

  try {
    const results = await Promise.all(uploadPromises);
    logger.info('Multiple files uploaded successfully', {
      count: results.length,
      fileType,
      orderId
    });
    return results;
  } catch (error) {
    logger.error('Multiple file upload failed', error, {
      fileCount: files.length,
      fileType,
      orderId
    });
    throw error;
  }
};

/**
 * Create thumbnail for images
 */
const createThumbnail = async (publicId, options = {}) => {
  const {
    width = 300,
    height = 300,
    crop = 'fill',
    quality = 'auto'
  } = options;

  try {
    const thumbnailUrl = cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: 'auto'
    });

    return thumbnailUrl;
  } catch (error) {
    logger.error('Thumbnail creation failed', error, { publicId });
    throw new Error('Failed to create thumbnail');
  }
};

/**
 * File upload middleware factory
 */
const createFileUploadMiddleware = (fileType = 'document') => {
  return (req, res, next) => {
    const orderId = req.params.orderId || req.body.orderId;
    const upload = createUploadMiddleware(fileType, orderId);
    
    upload.array('files', 5)(req, res, (err) => {
      if (err) {
        logger.error('File upload middleware error', err, {
          fileType,
          orderId
        });
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return res.status(400).json({
                success: false,
                message: 'File size too large',
                error: 'FILE_SIZE_LIMIT_EXCEEDED',
                maxSize: uploadConfig.maxFileSize
              });
            case 'LIMIT_FILE_COUNT':
              return res.status(400).json({
                success: false,
                message: 'Too many files',
                error: 'FILE_COUNT_LIMIT_EXCEEDED',
                maxFiles: 5
              });
            default:
              return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: 'FILE_UPLOAD_ERROR',
                details: err.message
              });
          }
        }
        
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed',
          error: 'FILE_UPLOAD_ERROR'
        });
      }
      
      next();
    });
  };
};

module.exports = {
  cloudinary,
  uploadConfig,
  validateFileType,
  generateSecureFilename,
  getFolderPath,
  createUploadMiddleware,
  uploadToCloudinary,
  deleteFromCloudinary,
  generateSignedUrl,
  getFileInfo,
  uploadMultipleFiles,
  createThumbnail,
  createFileUploadMiddleware
};
