import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'bank_transfer' | 'wallet';

export interface IPayment extends Document {
  transactionId: string;
  relatedOrder: mongoose.Types.ObjectId;
  paidBy: mongoose.Types.ObjectId;
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  processorData?: {
    processorId?: string;
    processorTransactionId?: string;
    processorResponse?: any;
    gatewayUsed?: string;
  };
  billing?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
  };
  timeline: {
    initiatedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
  };
  fees?: {
    processingFee?: number;
    platformFee?: number;
    totalFees?: number;
  };
  refund?: {
    refundId?: string;
    refundAmount?: number;
    refundReason?: string;
    refundedAt?: Date;
    refundedBy?: mongoose.Types.ObjectId;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: 'web' | 'mobile' | 'api';
    notes?: string;
  };
  updateStatus(newStatus: PaymentStatus, processorResponse?: any): Promise<IPayment>;
  processRefund(amount: number, reason: string, refundedBy: mongoose.Types.ObjectId): Promise<IPayment>;
}

interface IPaymentModel extends Model<IPayment> {
  findByOrder(orderId: mongoose.Types.ObjectId): any;
  getPaymentStatistics(filters?: any): Promise<any>;
  getRevenueByPeriod(startDate: Date, endDate: Date): Promise<any>;
}

const PaymentSchema = new Schema<IPayment, IPaymentModel>({
  transactionId: { 
    type: String, 
    required: true, 
    unique: true,
    default: function () {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
      return `TXN-${timestamp}-${random}`;
    }
  },
  relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { 
    type: String, 
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'], 
    default: 'USD',
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'], 
    default: 'pending',
    required: true 
  },
  paymentMethod: { 
    type: String, 
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'wallet'], 
    required: true 
  },
  processorData: {
    processorId: { type: String },
    processorTransactionId: { type: String },
    processorResponse: { type: Schema.Types.Mixed },
    gatewayUsed: { type: String }
  },
  billing: {
    name: { type: String },
    email: { type: String },
    address: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String }
    }
  },
  timeline: {
    initiatedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
    refundedAt: { type: Date }
  },
  fees: {
    processingFee: { type: Number, default: 0, min: 0 },
    platformFee: { type: Number, default: 0, min: 0 },
    totalFees: { type: Number, default: 0, min: 0 }
  },
  refund: {
    refundId: { type: String },
    refundAmount: { type: Number, min: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },
    refundedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    source: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
    notes: { type: String, maxlength: 1000 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ relatedOrder: 1 });
PaymentSchema.index({ paidBy: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ paymentMethod: 1 });
PaymentSchema.index({ 'timeline.initiatedAt': -1 });
PaymentSchema.index({ 'timeline.completedAt': -1 });
PaymentSchema.index({ status: 1, 'timeline.initiatedAt': -1 });

// Virtual for net amount (amount - fees)
PaymentSchema.virtual('netAmount').get(function() {
  return this.amount - (this.fees?.totalFees || 0);
});

// Pre-save middleware
PaymentSchema.pre('save', function (next) {
  // Calculate total fees
  if (this.fees && (this.fees.processingFee || this.fees.platformFee)) {
    this.fees.totalFees = (this.fees.processingFee || 0) + (this.fees.platformFee || 0);
  }
  
  // Update timeline based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    
    switch (this.status) {
      case 'processing':
        if (!this.timeline.processedAt) this.timeline.processedAt = now;
        break;
      case 'completed':
        if (!this.timeline.completedAt) this.timeline.completedAt = now;
        break;
      case 'failed':
        if (!this.timeline.failedAt) this.timeline.failedAt = now;
        break;
      case 'refunded':
        if (!this.timeline.refundedAt) this.timeline.refundedAt = now;
        break;
    }
  }
  
  next();
});

// Static methods
PaymentSchema.statics.findByOrder = function (orderId: mongoose.Types.ObjectId) {
  return this.find({ relatedOrder: orderId })
    .populate('paidBy', 'name email')
    .populate('relatedOrder', 'orderNumber serviceType')
    .sort({ 'timeline.initiatedAt': -1 });
};

PaymentSchema.statics.getPaymentStatistics = async function (filters: any = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        refundedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
        },
        refundedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] }
        },
        averageAmount: { $avg: '$amount' },
        totalFees: { $sum: '$fees.totalFees' }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  return stats || {
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    completedAmount: 0,
    failedPayments: 0,
    refundedPayments: 0,
    refundedAmount: 0,
    averageAmount: 0,
    totalFees: 0
  };
};

PaymentSchema.statics.getRevenueByPeriod = async function (startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        'timeline.completedAt': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timeline.completedAt' },
          month: { $month: '$timeline.completedAt' },
          day: { $dayOfMonth: '$timeline.completedAt' }
        },
        revenue: { $sum: '$amount' },
        fees: { $sum: '$fees.totalFees' },
        netRevenue: { $sum: { $subtract: ['$amount', { $ifNull: ['$fees.totalFees', 0] }] } },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Instance methods
PaymentSchema.methods.updateStatus = function (
  newStatus: PaymentStatus, 
  processorResponse?: any
) {
  this.status = newStatus;
  
  if (processorResponse) {
    this.processorData = this.processorData || {};
    this.processorData.processorResponse = processorResponse;
  }
  
  return this.save();
};

PaymentSchema.methods.processRefund = function (
  amount: number, 
  reason: string, 
  refundedBy: mongoose.Types.ObjectId
) {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }
  
  if (amount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.status = 'refunded';
  this.refund = {
    refundId: `REF-${Date.now()}-${Math.floor(Math.random() * 999999)}`,
    refundAmount: amount,
    refundReason: reason,
    refundedAt: new Date(),
    refundedBy
  };
  
  return this.save();
};

export const Payment: IPaymentModel = (mongoose.models.Payment as IPaymentModel) || 
  mongoose.model<IPayment, IPaymentModel>('Payment', PaymentSchema);