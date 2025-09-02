const mongoose = require('mongoose');

/**
 * Order Schema - Tracks the complete lifecycle of resume orders
 * Includes status tracking, timeline management, and client information
 */
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique order number: SKX-YYYYMMDD-XXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `SKX-${year}${month}${day}-${random}`;
    }
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required'],
    validate: {
      validator: async function(clientId) {
        const user = await mongoose.model('User').findById(clientId);
        return user && user.role === 'client';
      },
      message: 'Referenced user must be a client'
    }
  },
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    validate: {
      validator: async function(adminId) {
        if (!adminId) return true; // Optional field
        const user = await mongoose.model('User').findById(adminId);
        return user && ['admin', 'super_admin'].includes(user.role);
      },
      message: 'Assigned user must be an admin'
    }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required'],
    enum: {
      values: [
        'resume_writing',
        'cv_writing', 
        'cover_letter',
        'linkedin_optimization',
        'resume_review',
        'career_consultation',
        'package_deal'
      ],
      message: '{VALUE} is not a valid service type'
    }
  },
  urgencyLevel: {
    type: String,
    enum: ['standard', 'urgent', 'express'],
    default: 'standard',
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',           // Order placed, waiting for admin review
      'in_review',         // Admin reviewing requirements
      'payment_pending',   // Waiting for payment confirmation
      'in_progress',       // Work started
      'draft_ready',       // Initial draft completed
      'client_review',     // Client reviewing draft
      'revision_requested', // Client requested changes
      'in_revision',       // Working on revisions
      'completed',         // Order fully completed
      'delivered',         // Final files delivered
      'cancelled',         // Order cancelled
      'refunded'          // Order refunded
    ],
    default: 'pending',
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3, // 1 = Low, 3 = Medium, 5 = High
    required: true
  },
  requirements: {
    industryType: {
      type: String,
      required: [true, 'Industry type is required'],
      trim: true
    },
    experienceLevel: {
      type: String,
      enum: ['entry_level', 'mid_level', 'senior_level', 'executive'],
      required: [true, 'Experience level is required']
    },
    targetRole: {
      type: String,
      required: [true, 'Target role is required'],
      trim: true
    },
    specialRequests: {
      type: String,
      maxlength: [1000, 'Special requests cannot exceed 1000 characters'],
      trim: true
    },
    atsOptimization: {
      type: Boolean,
      default: true
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative']
    },
    urgencyFee: {
      type: Number,
      default: 0,
      min: [0, 'Urgency fee cannot be negative']
    },
    additionalServices: [{
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100 // Percentage
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
    }
  },
  timeline: {
    estimatedCompletion: {
      type: Date,
      required: [true, 'Estimated completion date is required'],
      validate: {
        validator: function(date) {
          return date > new Date();
        },
        message: 'Estimated completion date must be in the future'
      }
    },
    actualStartDate: {
      type: Date,
      default: null
    },
    actualCompletionDate: {
      type: Date,
      default: null
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    milestones: [{
      name: {
        type: String,
        required: true
      },
      expectedDate: {
        type: Date,
        required: true
      },
      actualDate: {
        type: Date,
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'delayed'],
        default: 'pending'
      },
      notes: String
    }]
  },
  files: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  revisions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Revision'
  }],
  communications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  }],
  qualityScore: {
    type: Number,
    min: 1,
    max: 10,
    default: null
  },
  clientFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
      maxlength: [500, 'Feedback comment cannot exceed 500 characters']
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  internalNotes: [{
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  metadata: {
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'phone', 'email', 'referral'],
      default: 'website'
    },
    referralCode: String,
    campaignId: String,
    clientIP: String,
    userAgent: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for order age in days
orderSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for status color coding
orderSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'orange',
    in_review: 'blue',
    payment_pending: 'yellow',
    in_progress: 'purple',
    draft_ready: 'teal',
    client_review: 'cyan',
    revision_requested: 'amber',
    in_revision: 'indigo',
    completed: 'green',
    delivered: 'emerald',
    cancelled: 'red',
    refunded: 'gray'
  };
  return colors[this.status] || 'gray';
});

// Virtual for progress percentage
orderSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    pending: 5,
    in_review: 10,
    payment_pending: 15,
    in_progress: 30,
    draft_ready: 60,
    client_review: 70,
    revision_requested: 75,
    in_revision: 80,
    completed: 95,
    delivered: 100,
    cancelled: 0,
    refunded: 0
  };
  return statusProgress[this.status] || 0;
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ client: 1 });
orderSchema.index({ assignedAdmin: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ urgencyLevel: 1 });
orderSchema.index({ priority: -1 });
orderSchema.index({ 'timeline.estimatedCompletion': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'timeline.lastActivity': -1 });

// Compound indexes for common queries
orderSchema.index({ status: 1, priority: -1, createdAt: -1 });
orderSchema.index({ assignedAdmin: 1, status: 1 });
orderSchema.index({ urgencyLevel: 1, status: 1 });

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function(next) {
  if (this.isModified('pricing')) {
    let total = this.pricing.basePrice + (this.pricing.urgencyFee || 0);
    
    // Add additional services
    if (this.pricing.additionalServices && this.pricing.additionalServices.length > 0) {
      total += this.pricing.additionalServices.reduce((sum, service) => sum + service.price, 0);
    }
    
    // Apply discount
    if (this.pricing.discount > 0) {
      total = total * (1 - this.pricing.discount / 100);
    }
    
    this.pricing.totalAmount = Math.round(total * 100) / 100; // Round to 2 decimal places
  }
  
  // Update last activity timestamp
  this.timeline.lastActivity = new Date();
  
  next();
});

// Pre-save middleware to update timeline based on status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    // Set actual start date when work begins
    if (this.status === 'in_progress' && !this.timeline.actualStartDate) {
      this.timeline.actualStartDate = now;
    }
    
    // Set actual completion date when order is completed
    if (['completed', 'delivered'].includes(this.status) && !this.timeline.actualCompletionDate) {
      this.timeline.actualCompletionDate = now;
    }
  }
  
  next();
});

// Static method to get orders with filters and pagination
orderSchema.statics.findWithFilters = function(filters = {}, options = {}) {
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

// Static method to get order statistics
orderSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        averageOrderValue: { $avg: '$pricing.totalAmount' },
        statusBreakdown: {
          $push: '$status'
        }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  
  if (!stats) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusBreakdown: {}
    };
  }
  
  // Process status breakdown
  const statusCounts = {};
  stats.statusBreakdown.forEach(status => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return {
    totalOrders: stats.totalOrders,
    totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
    averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100,
    statusBreakdown: statusCounts
  };
};

// Instance method to add internal note
orderSchema.methods.addInternalNote = function(adminId, note, priority = 'medium') {
  this.internalNotes.push({
    admin: adminId,
    note,
    priority,
    createdAt: new Date()
  });
  return this.save();
};

// Instance method to update status with validation
orderSchema.methods.updateStatus = function(newStatus, adminId, note = null) {
  const validTransitions = {
    pending: ['in_review', 'cancelled'],
    in_review: ['payment_pending', 'in_progress', 'cancelled'],
    payment_pending: ['in_progress', 'cancelled'],
    in_progress: ['draft_ready', 'cancelled'],
    draft_ready: ['client_review', 'in_revision'],
    client_review: ['revision_requested', 'completed'],
    revision_requested: ['in_revision'],
    in_revision: ['draft_ready', 'completed'],
    completed: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: []
  };
  
  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  if (note && adminId) {
    this.addInternalNote(adminId, `Status changed to ${newStatus}. ${note}`, 'medium');
  }
  
  return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
