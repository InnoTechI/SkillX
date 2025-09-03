const mongoose = require('mongoose');

/**
 * Revision Schema - Handles revision requests with priority and deadlines
 * Tracks all revision cycles for completed orders
 */
const revisionSchema = new mongoose.Schema({
  revisionId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique revision ID: REV-YYYYMMDD-XXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `REV-${year}${month}${day}-${random}`;
    }
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client reference is required']
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
  revisionNumber: {
    type: Number,
    required: true,
    min: [1, 'Revision number must be at least 1'],
    default: function() {
      // This will be calculated in pre-save middleware
      return 1;
    }
  },
  type: {
    type: String,
    required: [true, 'Revision type is required'],
    enum: {
      values: [
        'content_change',      // Changes to content/text
        'formatting_change',   // Layout/formatting adjustments
        'design_change',       // Visual design modifications
        'structure_change',    // Reorganization of sections
        'information_addition', // Adding new information
        'information_removal', // Removing information
        'technical_issue',     // Fix technical problems
        'quality_improvement', // General quality enhancements
        'client_preference',   // Client-specific preferences
        'other'               // Other types of revisions
      ],
      message: '{VALUE} is not a valid revision type'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',           // Revision request submitted
      'acknowledged',      // Admin acknowledged the request
      'in_progress',       // Currently working on revision
      'completed',         // Revision completed
      'delivered',         // Revised files delivered
      'approved',          // Client approved the revision
      'rejected',          // Client rejected the revision
      'cancelled',         // Revision request cancelled
      'on_hold'           // Revision temporarily paused
    ],
    default: 'pending',
    required: true
  },
  urgencyLevel: {
    type: String,
    enum: ['standard', 'urgent', 'express'],
    default: 'standard',
    required: true
  },
  requestDetails: {
    description: {
      type: String,
      required: [true, 'Revision description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      trim: true
    },
    specificChanges: [{
      section: {
        type: String,
        required: true,
        enum: [
          'contact_information',
          'professional_summary',
          'work_experience',
          'education',
          'skills',
          'certifications',
          'projects',
          'awards',
          'languages',
          'references',
          'formatting',
          'overall_design',
          'other'
        ]
      },
      currentContent: {
        type: String,
        maxlength: [500, 'Current content cannot exceed 500 characters']
      },
      requestedChange: {
        type: String,
        required: true,
        maxlength: [500, 'Requested change cannot exceed 500 characters']
      },
      reason: {
        type: String,
        maxlength: [300, 'Reason cannot exceed 300 characters']
      }
    }],
    attachments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }],
    referenceFiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }]
  },
  timeline: {
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    clientResponseAt: {
      type: Date,
      default: null
    },
    estimatedCompletion: {
      type: Date,
      required: function() {
        return this.status !== 'pending';
      }
    },
    actualDuration: {
      type: Number, // Duration in hours
      default: null
    },
    deadline: {
      type: Date,
      required: function() {
        return ['urgent', 'express'].includes(this.urgencyLevel);
      }
    }
  },
  effort: {
    estimatedHours: {
      type: Number,
      min: [0.1, 'Estimated hours must be at least 0.1'],
      default: null
    },
    actualHours: {
      type: Number,
      min: [0, 'Actual hours cannot be negative'],
      default: null
    },
    complexity: {
      type: String,
      enum: ['simple', 'moderate', 'complex', 'very_complex'],
      default: 'moderate'
    },
    difficultyRating: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  },
  communication: {
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    }],
    lastClientMessage: {
      type: Date,
      default: null
    },
    lastAdminMessage: {
      type: Date,
      default: null
    },
    requiresClientInput: {
      type: Boolean,
      default: false
    }
  },
  deliverables: {
    revisedFiles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    }],
    changesSummary: {
      type: String,
      maxlength: [1000, 'Changes summary cannot exceed 1000 characters']
    },
    beforeAfterComparison: [{
      section: String,
      before: String,
      after: String,
      changeType: {
        type: String,
        enum: ['added', 'modified', 'removed', 'reformatted']
      }
    }]
  },
  feedback: {
    clientRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    clientComments: {
      type: String,
      maxlength: [500, 'Client comments cannot exceed 500 characters']
    },
    adminNotes: {
      type: String,
      maxlength: [500, 'Admin notes cannot exceed 500 characters']
    },
    qualityScore: {
      type: Number,
      min: 1,
      max: 10,
      default: null
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  pricing: {
    isChargeable: {
      type: Boolean,
      default: false
    },
    revisionFee: {
      type: Number,
      default: 0,
      min: [0, 'Revision fee cannot be negative']
    },
    freeRevisionsUsed: {
      type: Number,
      default: 0,
      min: [0, 'Free revisions used cannot be negative']
    },
    freeRevisionsLimit: {
      type: Number,
      default: 2,
      min: [0, 'Free revisions limit cannot be negative']
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
    noteType: {
      type: String,
      enum: ['general', 'technical', 'client_communication', 'quality_concern', 'urgent'],
      default: 'general'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for revision age in hours
revisionSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.timeline.requestedAt) / (1000 * 60 * 60));
});

// Virtual for time until deadline
revisionSchema.virtual('timeUntilDeadline').get(function() {
  if (!this.timeline.deadline) return null;
  const hoursUntilDeadline = Math.floor((this.timeline.deadline - Date.now()) / (1000 * 60 * 60));
  return Math.max(0, hoursUntilDeadline);
});

// Virtual for status color
revisionSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'yellow',
    acknowledged: 'blue',
    in_progress: 'purple',
    completed: 'green',
    delivered: 'teal',
    approved: 'emerald',
    rejected: 'red',
    cancelled: 'gray',
    on_hold: 'orange'
  };
  return colors[this.status] || 'gray';
});

// Virtual for priority color
revisionSchema.virtual('priorityColor').get(function() {
  const colors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red'
  };
  return colors[this.priority] || 'gray';
});

// Virtual for progress percentage
revisionSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    pending: 5,
    acknowledged: 15,
    in_progress: 50,
    completed: 80,
    delivered: 90,
    approved: 100,
    rejected: 0,
    cancelled: 0,
    on_hold: 25
  };
  return statusProgress[this.status] || 0;
});

// Virtual for is overdue
revisionSchema.virtual('isOverdue').get(function() {
  if (!this.timeline.deadline || ['completed', 'delivered', 'approved', 'cancelled'].includes(this.status)) {
    return false;
  }
  return this.timeline.deadline < new Date();
});

// Indexes for better query performance
revisionSchema.index({ revisionId: 1 });
revisionSchema.index({ order: 1 });
revisionSchema.index({ client: 1 });
revisionSchema.index({ assignedAdmin: 1 });
revisionSchema.index({ status: 1 });
revisionSchema.index({ priority: 1 });
revisionSchema.index({ urgencyLevel: 1 });
revisionSchema.index({ 'timeline.requestedAt': -1 });
revisionSchema.index({ 'timeline.deadline': 1 });

// Compound indexes for common queries
revisionSchema.index({ status: 1, priority: 1, 'timeline.requestedAt': -1 });
revisionSchema.index({ assignedAdmin: 1, status: 1 });
revisionSchema.index({ order: 1, revisionNumber: 1 });

// Pre-save middleware to calculate revision number
revisionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Get the highest revision number for this order
    const lastRevision = await this.constructor
      .findOne({ order: this.order })
      .sort({ revisionNumber: -1 });
    
    this.revisionNumber = lastRevision ? lastRevision.revisionNumber + 1 : 1;
    
    // Calculate estimated completion based on priority and complexity
    if (!this.timeline.estimatedCompletion) {
      const hours = this.calculateEstimatedHours();
      this.timeline.estimatedCompletion = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
  }
  
  next();
});

// Pre-save middleware to update timeline based on status changes
revisionSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'acknowledged':
        if (!this.timeline.acknowledgedAt) {
          this.timeline.acknowledgedAt = now;
        }
        break;
      case 'in_progress':
        if (!this.timeline.startedAt) {
          this.timeline.startedAt = now;
        }
        break;
      case 'completed':
        if (!this.timeline.completedAt) {
          this.timeline.completedAt = now;
          // Calculate actual duration
          if (this.timeline.startedAt) {
            this.timeline.actualDuration = Math.round(
              (now - this.timeline.startedAt) / (1000 * 60 * 60) * 10
            ) / 10; // Round to 1 decimal place
          }
        }
        break;
      case 'delivered':
        if (!this.timeline.deliveredAt) {
          this.timeline.deliveredAt = now;
        }
        break;
      case 'approved':
      case 'rejected':
        if (!this.timeline.clientResponseAt) {
          this.timeline.clientResponseAt = now;
        }
        break;
    }
  }
  
  next();
});

// Pre-save middleware to check free revisions limit
revisionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Count existing revisions for this order
    const existingRevisions = await this.constructor.countDocuments({ order: this.order });
    
    this.pricing.freeRevisionsUsed = existingRevisions;
    
    // Determine if this revision should be chargeable
    if (existingRevisions >= this.pricing.freeRevisionsLimit) {
      this.pricing.isChargeable = true;
      // Set revision fee based on urgency and complexity
      this.pricing.revisionFee = this.calculateRevisionFee();
    }
  }
  
  next();
});

// Static method to find revisions with filters and pagination
revisionSchema.statics.findWithFilters = function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'timeline.requestedAt',
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

// Static method to get revision statistics
revisionSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalRevisions: { $sum: 1 },
        averageDuration: { $avg: '$timeline.actualDuration' },
        totalRevisionFees: { $sum: '$pricing.revisionFee' },
        statusBreakdown: { $push: '$status' },
        priorityBreakdown: { $push: '$priority' },
        typeBreakdown: { $push: '$type' },
        complexityBreakdown: { $push: '$effort.complexity' }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  
  if (!stats) {
    return {
      totalRevisions: 0,
      averageDuration: 0,
      totalRevisionFees: 0,
      statusBreakdown: {},
      priorityBreakdown: {},
      typeBreakdown: {},
      complexityBreakdown: {}
    };
  }
  
  // Process breakdowns
  const processBreakdown = (array) => {
    const counts = {};
    array.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  };
  
  return {
    totalRevisions: stats.totalRevisions,
    averageDuration: Math.round((stats.averageDuration || 0) * 10) / 10,
    totalRevisionFees: Math.round(stats.totalRevisionFees * 100) / 100,
    statusBreakdown: processBreakdown(stats.statusBreakdown),
    priorityBreakdown: processBreakdown(stats.priorityBreakdown),
    typeBreakdown: processBreakdown(stats.typeBreakdown),
    complexityBreakdown: processBreakdown(stats.complexityBreakdown)
  };
};

// Instance method to calculate estimated hours
revisionSchema.methods.calculateEstimatedHours = function() {
  const baseHours = {
    simple: 1,
    moderate: 3,
    complex: 6,
    very_complex: 12
  };
  
  const priorityMultiplier = {
    low: 1.2,
    medium: 1.0,
    high: 0.8,
    urgent: 0.5
  };
  
  const urgencyMultiplier = {
    standard: 1.0,
    urgent: 0.7,
    express: 0.5
  };
  
  let hours = baseHours[this.effort.complexity] || 3;
  hours *= priorityMultiplier[this.priority] || 1.0;
  hours *= urgencyMultiplier[this.urgencyLevel] || 1.0;
  
  // Add extra time for specific change requests
  hours += this.requestDetails.specificChanges.length * 0.5;
  
  return Math.round(hours * 10) / 10; // Round to 1 decimal place
};

// Instance method to calculate revision fee
revisionSchema.methods.calculateRevisionFee = function() {
  const baseFees = {
    simple: 25,
    moderate: 50,
    complex: 100,
    very_complex: 200
  };
  
  const urgencyMultiplier = {
    standard: 1.0,
    urgent: 1.5,
    express: 2.0
  };
  
  let fee = baseFees[this.effort.complexity] || 50;
  fee *= urgencyMultiplier[this.urgencyLevel] || 1.0;
  
  return Math.round(fee * 100) / 100;
};

// Instance method to update status with validation
revisionSchema.methods.updateStatus = function(newStatus, adminId, note = null) {
  const validTransitions = {
    pending: ['acknowledged', 'cancelled'],
    acknowledged: ['in_progress', 'on_hold', 'cancelled'],
    in_progress: ['completed', 'on_hold', 'cancelled'],
    completed: ['delivered'],
    delivered: ['approved', 'rejected'],
    approved: [],
    rejected: ['in_progress'],
    cancelled: [],
    on_hold: ['in_progress', 'cancelled']
  };
  
  if (!validTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  if (note && adminId) {
    this.addInternalNote(adminId, `Status changed to ${newStatus}. ${note}`, 'general');
  }
  
  return this.save();
};

// Instance method to add internal note
revisionSchema.methods.addInternalNote = function(adminId, note, noteType = 'general') {
  this.internalNotes.push({
    admin: adminId,
    note,
    noteType,
    createdAt: new Date()
  });
  return this.save();
};

// Instance method to mark as completed
revisionSchema.methods.markAsCompleted = function(adminId, changesSummary, revisedFiles = []) {
  this.status = 'completed';
  this.deliverables.changesSummary = changesSummary;
  this.deliverables.revisedFiles = revisedFiles;
  
  return this.save();
};

module.exports = mongoose.model('Revision', revisionSchema);
