const mongoose = require('mongoose');

/**
 * File Schema - Manages all uploaded files including resumes, drafts, and payment proofs
 * Integrates with Cloudinary for secure file storage and management
 */
const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique file ID: FILE-YYYYMMDD-XXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `FILE-${year}${month}${day}-${random}`;
    }
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader reference is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: [255, 'File name cannot exceed 255 characters']
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: {
      values: [
        'original_resume',     // Client's original resume
        'draft_resume',       // Work-in-progress resume
        'final_resume',       // Completed resume
        'cover_letter',       // Cover letter document
        'linkedin_profile',   // LinkedIn optimization content
        'payment_proof',      // Payment screenshot/receipt
        'additional_document', // Any additional supporting docs
        'revision_feedback',  // Client feedback files
        'template',          // Resume templates
        'other'              // Miscellaneous files
      ],
      message: '{VALUE} is not a valid file type'
    }
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: {
      values: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'text/plain',
        'application/rtf'
      ],
      message: '{VALUE} is not a supported file type'
    }
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0'],
    max: [10485760, 'File size cannot exceed 10MB'] // 10MB limit
  },
  cloudinary: {
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required']
    },
    secureUrl: {
      type: String,
      required: [true, 'Cloudinary secure URL is required']
    },
    url: {
      type: String,
      required: [true, 'Cloudinary URL is required']
    },
    resourceType: {
      type: String,
      enum: ['image', 'raw', 'video', 'auto'],
      default: 'raw'
    },
    format: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    signature: {
      type: String,
      required: true
    }
  },
  downloadInfo: {
    downloadCount: {
      type: Number,
      default: 0,
      min: [0, 'Download count cannot be negative']
    },
    lastDownloadedAt: {
      type: Date,
      default: null
    },
    lastDownloadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  security: {
    isPasswordProtected: {
      type: Boolean,
      default: false
    },
    accessLevel: {
      type: String,
      enum: ['public', 'client_only', 'admin_only', 'restricted'],
      default: 'client_only'
    },
    expiresAt: {
      type: Date,
      default: null // Null means no expiration
    }
  },
  version: {
    versionNumber: {
      type: Number,
      default: 1,
      min: [1, 'Version number must be at least 1']
    },
    isLatestVersion: {
      type: Boolean,
      default: true
    },
    previousVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null
    },
    changeLog: {
      type: String,
      maxlength: [500, 'Change log cannot exceed 500 characters']
    }
  },
  metadata: {
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    clientVisible: {
      type: Boolean,
      default: true
    },
    internalNotes: {
      type: String,
      maxlength: [500, 'Internal notes cannot exceed 500 characters']
    },
    uploadSource: {
      type: String,
      enum: ['web_upload', 'drag_drop', 'api', 'admin_panel', 'mobile_app'],
      default: 'web_upload'
    }
  },
  processing: {
    isProcessed: {
      type: Boolean,
      default: false
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    processingError: {
      type: String,
      default: null
    },
    processedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for human-readable file size
fileSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
fileSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Virtual for file age
fileSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for expiry status
fileSchema.virtual('isExpired').get(function() {
  return this.security.expiresAt && this.security.expiresAt < new Date();
});

// Virtual for download URL (with security considerations)
fileSchema.virtual('downloadUrl').get(function() {
  // In production, this should generate a signed URL with expiration
  return this.cloudinary.secureUrl;
});

// Indexes for better query performance
fileSchema.index({ fileId: 1 });
fileSchema.index({ order: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ 'cloudinary.publicId': 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ 'version.isLatestVersion': 1 });

// Compound indexes for common queries
fileSchema.index({ order: 1, fileType: 1 });
fileSchema.index({ order: 1, 'version.isLatestVersion': 1 });
fileSchema.index({ uploadedBy: 1, createdAt: -1 });

// Pre-save middleware to handle versioning
fileSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if there are existing files of the same type for the same order
    const existingFiles = await this.constructor.find({
      order: this.order,
      fileType: this.fileType,
      'version.isLatestVersion': true
    });

    if (existingFiles.length > 0) {
      // Mark existing files as not latest version
      await this.constructor.updateMany(
        {
          order: this.order,
          fileType: this.fileType,
          'version.isLatestVersion': true
        },
        {
          $set: { 'version.isLatestVersion': false }
        }
      );

      // Set version number
      const maxVersion = Math.max(...existingFiles.map(f => f.version.versionNumber));
      this.version.versionNumber = maxVersion + 1;
    }
  }
  
  next();
});

// Pre-save middleware to set processing status for certain file types
fileSchema.pre('save', function(next) {
  if (this.isNew && ['original_resume', 'draft_resume'].includes(this.fileType)) {
    this.processing.isProcessed = false;
    this.processing.processingStatus = 'pending';
  }
  next();
});

// Static method to find files with filters and pagination
fileSchema.statics.findWithFilters = function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    populate = []
  } = options;

  const query = this.find(filters);
  
  // Add sorting
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  query.sort(sort);
  
  // Add pagination
  const skip = (page - 1) * limit;
  query.skip(skip).limit(parseInt(limit));
  
  // Add population
  if (populate.length > 0) {
    populate.forEach(field => query.populate(field));
  }
  
  return query;
};

// Static method to get file statistics
fileSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        averageSize: { $avg: '$fileSize' },
        totalDownloads: { $sum: '$downloadInfo.downloadCount' },
        typeBreakdown: { $push: '$fileType' },
        mimeTypeBreakdown: { $push: '$mimeType' }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  
  if (!stats) {
    return {
      totalFiles: 0,
      totalSize: 0,
      averageSize: 0,
      totalDownloads: 0,
      typeBreakdown: {},
      mimeTypeBreakdown: {}
    };
  }
  
  // Process breakdowns
  const typeCounts = {};
  stats.typeBreakdown.forEach(type => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  const mimeCounts = {};
  stats.mimeTypeBreakdown.forEach(mime => {
    mimeCounts[mime] = (mimeCounts[mime] || 0) + 1;
  });
  
  return {
    totalFiles: stats.totalFiles,
    totalSize: stats.totalSize,
    totalSizeFormatted: this.formatFileSize(stats.totalSize),
    averageSize: Math.round(stats.averageSize),
    averageSizeFormatted: this.formatFileSize(Math.round(stats.averageSize)),
    totalDownloads: stats.totalDownloads,
    typeBreakdown: typeCounts,
    mimeTypeBreakdown: mimeCounts
  };
};

// Static method to format file size
fileSchema.statics.formatFileSize = function(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Instance method to track download
fileSchema.methods.trackDownload = function(userId) {
  this.downloadInfo.downloadCount += 1;
  this.downloadInfo.lastDownloadedAt = new Date();
  this.downloadInfo.lastDownloadedBy = userId;
  return this.save();
};

// Instance method to create new version
fileSchema.methods.createNewVersion = function(newFileData, changeLog = '') {
  // Mark current file as not latest version
  this.version.isLatestVersion = false;
  
  // Create new file document
  const newFile = new this.constructor({
    ...newFileData,
    order: this.order,
    fileType: this.fileType,
    version: {
      versionNumber: this.version.versionNumber + 1,
      isLatestVersion: true,
      previousVersion: this._id,
      changeLog
    }
  });
  
  return Promise.all([this.save(), newFile.save()]);
};

// Instance method to check access permission
fileSchema.methods.checkAccess = function(user) {
  // Super admin has access to everything
  if (user.role === 'super_admin') return true;
  
  // Admin has access to admin_only and below
  if (user.role === 'admin' && this.security.accessLevel !== 'restricted') return true;
  
  // Client can access their own files if client_only or public
  if (user.role === 'client') {
    if (this.security.accessLevel === 'public') return true;
    if (this.security.accessLevel === 'client_only') {
      // Check if user is the order client
      return this.order.client && this.order.client.toString() === user._id.toString();
    }
  }
  
  return false;
};

// Instance method to mark as processed
fileSchema.methods.markAsProcessed = function(success = true, error = null) {
  this.processing.isProcessed = true;
  this.processing.processingStatus = success ? 'completed' : 'failed';
  this.processing.processedAt = new Date();
  
  if (error) {
    this.processing.processingError = error;
  }
  
  return this.save();
};

module.exports = mongoose.model('File', fileSchema);
