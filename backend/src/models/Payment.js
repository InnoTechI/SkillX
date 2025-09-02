const mongoose = require('mongoose');

/**
 * Payment Schema - Tracks all payment transactions and confirmations
 * Supports multiple payment methods and comprehensive audit trails
 */
const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique payment ID: PAY-YYYYMMDD-XXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `PAY-${year}${month}${day}-${random}`;
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
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than 0']
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: [
        'credit_card',
        'debit_card', 
        'paypal',
        'stripe',
        'bank_transfer',
        'wire_transfer',
        'cryptocurrency',
        'cash',
        'check',
        'other'
      ],
      message: '{VALUE} is not a valid payment method'
    }
  },
  status: {
    type: String,
    enum: [
      'pending',           // Payment initiated but not confirmed
      'processing',        // Payment being processed by provider
      'completed',         // Payment successfully completed
      'failed',           // Payment failed
      'cancelled',        // Payment cancelled by user/admin
      'refunded',         // Payment refunded
      'partially_refunded', // Partial refund issued
      'disputed',         // Payment disputed/chargeback
      'expired'           // Payment expired (for pending payments)
    ],
    default: 'pending',
    required: true
  },
  transactionDetails: {
    // External payment provider details
    externalTransactionId: {
      type: String,
      sparse: true // Allows multiple null values but unique non-null values
    },
    gatewayProvider: {
      type: String,
      enum: ['stripe', 'paypal', 'square', 'razorpay', 'manual', 'other'],
      default: 'manual'
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed, // Store raw gateway response
      select: false // Don't include by default
    },
    // Payment screenshot/proof (for manual payments)
    paymentProof: {
      type: String, // Cloudinary URL
      default: null
    },
    // Reference number provided by client
    referenceNumber: {
      type: String,
      trim: true
    },
    // Bank details for wire transfers
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      bankName: String,
      accountHolderName: String
    }
  },
  timeline: {
    initiatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    failedAt: {
      type: Date,
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Default expiry: 7 days from initiation
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }
  },
  confirmation: {
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      validate: {
        validator: async function(adminId) {
          if (!adminId) return true; // Optional field
          const user = await mongoose.model('User').findById(adminId);
          return user && ['admin', 'super_admin'].includes(user.role);
        },
        message: 'Confirming user must be an admin'
      }
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    confirmationNotes: {
      type: String,
      maxlength: [500, 'Confirmation notes cannot exceed 500 characters']
    },
    autoConfirmed: {
      type: Boolean,
      default: false
    }
  },
  refund: {
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    refundReason: {
      type: String,
      enum: [
        'client_request',
        'service_cancellation',
        'quality_issue',
        'technical_error',
        'duplicate_payment',
        'fraud_prevention',
        'other'
      ]
    },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    refundedAt: {
      type: Date,
      default: null
    },
    refundTransactionId: {
      type: String,
      default: null
    },
    refundNotes: {
      type: String,
      maxlength: [500, 'Refund notes cannot exceed 500 characters']
    }
  },
  fees: {
    processingFee: {
      type: Number,
      default: 0,
      min: [0, 'Processing fee cannot be negative']
    },
    platformFee: {
      type: Number,
      default: 0,
      min: [0, 'Platform fee cannot be negative']
    },
    netAmount: {
      type: Number,
      default: 0,
      min: [0, 'Net amount cannot be negative']
    }
  },
  auditTrail: [{
    action: {
      type: String,
      required: true,
      enum: [
        'created',
        'confirmed',
        'failed',
        'refunded',
        'disputed',
        'updated',
        'cancelled'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String,
      maxlength: [300, 'Audit details cannot exceed 300 characters']
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed
    },
    newState: {
      type: mongoose.Schema.Types.Mixed
    }
  }],
  metadata: {
    clientIP: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'admin_panel', 'api'],
      default: 'website'
    },
    campaignId: String,
    affiliateId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for payment age in hours
paymentSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.timeline.initiatedAt) / (1000 * 60 * 60));
});

// Virtual for time until expiry
paymentSchema.virtual('timeUntilExpiry').get(function() {
  if (this.status !== 'pending' || !this.timeline.expiresAt) return null;
  const hoursUntilExpiry = Math.floor((this.timeline.expiresAt - Date.now()) / (1000 * 60 * 60));
  return Math.max(0, hoursUntilExpiry);
});

// Virtual for status color
paymentSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'yellow',
    processing: 'blue',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray',
    refunded: 'orange',
    partially_refunded: 'amber',
    disputed: 'purple',
    expired: 'red'
  };
  return colors[this.status] || 'gray';
});

// Virtual for net amount calculation
paymentSchema.virtual('calculatedNetAmount').get(function() {
  return this.amount - (this.fees.processingFee || 0) - (this.fees.platformFee || 0);
});

// Indexes for better query performance
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ 'timeline.initiatedAt': -1 });
paymentSchema.index({ 'timeline.confirmedAt': -1 });
paymentSchema.index({ 'transactionDetails.externalTransactionId': 1 }, { sparse: true });

// Compound indexes for common queries
paymentSchema.index({ status: 1, 'timeline.initiatedAt': -1 });
paymentSchema.index({ client: 1, status: 1 });
paymentSchema.index({ order: 1, status: 1 });

// Pre-save middleware to calculate net amount
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.fees.netAmount = this.amount - (this.fees.processingFee || 0) - (this.fees.platformFee || 0);
  }
  next();
});

// Pre-save middleware to update timeline based on status changes
paymentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'completed':
        if (!this.timeline.completedAt) {
          this.timeline.completedAt = now;
          this.timeline.confirmedAt = this.timeline.confirmedAt || now;
        }
        break;
      case 'failed':
        if (!this.timeline.failedAt) {
          this.timeline.failedAt = now;
        }
        break;
      case 'refunded':
      case 'partially_refunded':
        if (!this.timeline.refundedAt) {
          this.timeline.refundedAt = now;
        }
        break;
    }
  }
  next();
});

// Pre-save middleware to add audit trail
paymentSchema.pre('save', function(next) {
  if (this.isNew) {
    // Don't add audit trail for new documents - will be added by post-save
    return next();
  }
  
  if (this.isModified('status')) {
    // Add audit trail entry for status changes
    this.auditTrail.push({
      action: this.status,
      performedBy: this._statusChangedBy || this.confirmation.confirmedBy,
      timestamp: new Date(),
      details: this._statusChangeReason || `Status changed to ${this.status}`,
      previousState: { status: this._previousStatus },
      newState: { status: this.status }
    });
  }
  
  next();
});

// Post-save middleware to add initial audit trail
paymentSchema.post('save', function(doc) {
  if (doc.auditTrail.length === 0) {
    doc.auditTrail.push({
      action: 'created',
      performedBy: doc.client,
      timestamp: doc.timeline.initiatedAt,
      details: 'Payment initiated'
    });
    // Save without triggering middleware again
    doc.constructor.updateOne(
      { _id: doc._id },
      { $set: { auditTrail: doc.auditTrail } }
    ).exec();
  }
});

// Static method to get payments with filters and pagination
paymentSchema.statics.findWithFilters = function(filters = {}, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'timeline.initiatedAt',
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

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalRevenue: { 
          $sum: { 
            $cond: [
              { $in: ['$status', ['completed', 'refunded', 'partially_refunded']] },
              '$amount',
              0
            ]
          }
        },
        totalRefunded: {
          $sum: { 
            $cond: [
              { $in: ['$status', ['refunded', 'partially_refunded']] },
              '$refund.refundAmount',
              0
            ]
          }
        },
        averagePayment: {
          $avg: { 
            $cond: [
              { $in: ['$status', ['completed', 'refunded', 'partially_refunded']] },
              '$amount',
              null
            ]
          }
        },
        statusBreakdown: { $push: '$status' },
        methodBreakdown: { $push: '$paymentMethod' }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  
  if (!stats) {
    return {
      totalPayments: 0,
      totalRevenue: 0,
      totalRefunded: 0,
      netRevenue: 0,
      averagePayment: 0,
      statusBreakdown: {},
      methodBreakdown: {}
    };
  }
  
  // Process breakdowns
  const statusCounts = {};
  stats.statusBreakdown.forEach(status => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  const methodCounts = {};
  stats.methodBreakdown.forEach(method => {
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  });
  
  return {
    totalPayments: stats.totalPayments,
    totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
    totalRefunded: Math.round(stats.totalRefunded * 100) / 100,
    netRevenue: Math.round((stats.totalRevenue - stats.totalRefunded) * 100) / 100,
    averagePayment: Math.round((stats.averagePayment || 0) * 100) / 100,
    statusBreakdown: statusCounts,
    methodBreakdown: methodCounts
  };
};

// Instance method to confirm payment
paymentSchema.methods.confirmPayment = function(adminId, notes = '') {
  if (this.status !== 'pending' && this.status !== 'processing') {
    throw new Error(`Cannot confirm payment with status: ${this.status}`);
  }
  
  this._statusChangedBy = adminId;
  this._statusChangeReason = notes || 'Payment confirmed by admin';
  this._previousStatus = this.status;
  
  this.status = 'completed';
  this.confirmation.confirmedBy = adminId;
  this.confirmation.confirmedAt = new Date();
  this.confirmation.confirmationNotes = notes;
  this.confirmation.autoConfirmed = false;
  
  return this.save();
};

// Instance method to process refund
paymentSchema.methods.processRefund = function(adminId, refundAmount, reason, notes = '') {
  if (!['completed', 'refunded', 'partially_refunded'].includes(this.status)) {
    throw new Error(`Cannot refund payment with status: ${this.status}`);
  }
  
  const currentRefunded = this.refund.refundAmount || 0;
  const totalRefunded = currentRefunded + refundAmount;
  
  if (totalRefunded > this.amount) {
    throw new Error('Total refund amount cannot exceed payment amount');
  }
  
  this._statusChangedBy = adminId;
  this._statusChangeReason = notes || `Refund processed: ${reason}`;
  this._previousStatus = this.status;
  
  this.refund.refundAmount = totalRefunded;
  this.refund.refundReason = reason;
  this.refund.refundedBy = adminId;
  this.refund.refundedAt = new Date();
  this.refund.refundNotes = notes;
  
  // Update status based on refund amount
  if (totalRefunded >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially_refunded';
  }
  
  return this.save();
};

// Instance method to add audit trail entry
paymentSchema.methods.addAuditEntry = function(action, performedBy, details = '') {
  this.auditTrail.push({
    action,
    performedBy,
    timestamp: new Date(),
    details
  });
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);
