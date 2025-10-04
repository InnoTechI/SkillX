import mongoose, { Schema, Document, Model } from 'mongoose';

export type Urgency = 'standard' | 'urgent' | 'express';
export type OrderStatus = 'pending' | 'in_review' | 'payment_pending' | 'in_progress' | 'draft_ready' | 'client_review' | 'revision_requested' | 'in_revision' | 'completed' | 'delivered' | 'cancelled' | 'refunded';

export interface IOrder extends Document {
  orderNumber: string;
  client: mongoose.Types.ObjectId;
  assignedAdmin?: mongoose.Types.ObjectId | null;
  serviceType: 'resume_writing' | 'cv_writing' | 'cover_letter' | 'linkedin_optimization' | 'resume_review' | 'career_consultation' | 'package_deal';
  urgencyLevel: Urgency;
  status: OrderStatus;
  priority: number;
  requirements: {
    industryType: string;
    experienceLevel: 'entry_level' | 'mid_level' | 'senior_level' | 'executive';
    targetRole: string;
    specialRequests?: string;
    atsOptimization: boolean;
    keywords?: string[];
  };
  pricing: {
    basePrice: number;
    urgencyFee?: number;
    additionalServices?: { name: string; price: number }[];
    discount?: number;
    totalAmount: number;
    currency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
    paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  };
  timeline: {
    estimatedCompletion: Date;
    actualStartDate?: Date | null;
    actualCompletionDate?: Date | null;
    lastActivity: Date;
    milestones?: { name: string; expectedDate: Date; actualDate?: Date | null; status: 'pending' | 'in_progress' | 'completed' | 'delayed'; notes?: string }[];
  };
  files: mongoose.Types.ObjectId[];
  revisions: mongoose.Types.ObjectId[];
  communications: mongoose.Types.ObjectId[];
  qualityScore?: number | null;
  clientFeedback?: { rating?: number | null; comment?: string; submittedAt?: Date | null };
  internalNotes?: { admin: mongoose.Types.ObjectId; note: string; createdAt: Date; priority: 'low' | 'medium' | 'high' }[];
  metadata?: { source?: 'website' | 'mobile_app' | 'phone' | 'email' | 'referral'; referralCode?: string; campaignId?: string; clientIP?: string; userAgent?: string };
  updateStatus(newStatus: OrderStatus, adminId?: mongoose.Types.ObjectId, note?: string | null): Promise<IOrder>;
  addInternalNote(adminId: mongoose.Types.ObjectId, note: string, priority?: 'low' | 'medium' | 'high'): Promise<IOrder>;
}

interface IOrderModel extends Model<IOrder> {
  findWithFilters(filters?: any, options?: any): any;
  getStatistics(filters?: any): Promise<any>;
}

const OrderSchema = new Schema<IOrder, IOrderModel>({
  orderNumber: { type: String, required: true, unique: true, uppercase: true, default: function () {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `SKX-${year}${month}${day}-${random}`;
  } },
  client: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  serviceType: { type: String, required: true, enum: ['resume_writing','cv_writing','cover_letter','linkedin_optimization','resume_review','career_consultation','package_deal'] },
  urgencyLevel: { type: String, enum: ['standard','urgent','express'], default: 'standard', required: true },
  status: { type: String, enum: ['pending','in_review','payment_pending','in_progress','draft_ready','client_review','revision_requested','in_revision','completed','delivered','cancelled','refunded'], default: 'pending', required: true },
  priority: { type: Number, min: 1, max: 5, default: 3, required: true },
  requirements: {
    industryType: { type: String, required: true, trim: true },
    experienceLevel: { type: String, enum: ['entry_level','mid_level','senior_level','executive'], required: true },
    targetRole: { type: String, required: true, trim: true },
    specialRequests: { type: String, maxlength: 1000, trim: true },
    atsOptimization: { type: Boolean, default: true },
    keywords: [{ type: String, trim: true }]
  },
  pricing: {
    basePrice: { type: Number, required: true, min: 0 },
    urgencyFee: { type: Number, default: 0, min: 0 },
    additionalServices: [{ name: { type: String, required: true }, price: { type: Number, required: true, min: 0 } }],
    discount: { type: Number, default: 0, min: 0, max: 100 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', enum: ['USD','EUR','GBP','CAD','AUD'] },
    paymentStatus: { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' }
  },
  timeline: {
    estimatedCompletion: { type: Date, required: true },
    actualStartDate: { type: Date, default: null },
    actualCompletionDate: { type: Date, default: null },
    lastActivity: { type: Date, default: Date.now },
    milestones: [{ name: { type: String, required: true }, expectedDate: { type: Date, required: true }, actualDate: { type: Date, default: null }, status: { type: String, enum: ['pending','in_progress','completed','delayed'], default: 'pending' }, notes: String }]
  },
  files: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  revisions: [{ type: Schema.Types.ObjectId, ref: 'Revision' }],
  communications: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
  qualityScore: { type: Number, min: 1, max: 10, default: null },
  clientFeedback: { rating: { type: Number, min: 1, max: 5, default: null }, comment: { type: String, maxlength: 500 }, submittedAt: { type: Date, default: null } },
  internalNotes: [{ admin: { type: Schema.Types.ObjectId, ref: 'User', required: true }, note: { type: String, required: true, maxlength: 1000 }, createdAt: { type: Date, default: Date.now }, priority: { type: String, enum: ['low','medium','high'], default: 'medium' } }],
  metadata: { source: { type: String, enum: ['website','mobile_app','phone','email','referral'], default: 'website' }, referralCode: String, campaignId: String, clientIP: String, userAgent: String }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

OrderSchema.index({ client: 1 });
OrderSchema.index({ assignedAdmin: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ urgencyLevel: 1 });
OrderSchema.index({ priority: -1 });
OrderSchema.index({ 'timeline.estimatedCompletion': 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'timeline.lastActivity': -1 });
OrderSchema.index({ status: 1, priority: -1, createdAt: -1 });
OrderSchema.index({ assignedAdmin: 1, status: 1 });
OrderSchema.index({ urgencyLevel: 1, status: 1 });

OrderSchema.pre('save', function (next) {
  if (this.isModified('pricing')) {
    let total = this.pricing.basePrice + (this.pricing.urgencyFee || 0);
    if (Array.isArray(this.pricing.additionalServices) && this.pricing.additionalServices.length) {
      total += this.pricing.additionalServices.reduce((sum: number, s: any) => sum + s.price, 0);
    }
    if (this.pricing.discount && this.pricing.discount > 0) {
      total = total * (1 - this.pricing.discount / 100);
    }
    this.pricing.totalAmount = Math.round(total * 100) / 100;
  }
  this.timeline.lastActivity = new Date();
  next();
});

OrderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'in_progress' && !this.timeline.actualStartDate) this.timeline.actualStartDate = now;
    if ((this.status === 'completed' || this.status === 'delivered') && !this.timeline.actualCompletionDate) this.timeline.actualCompletionDate = now;
  }
  next();
});

OrderSchema.statics.findWithFilters = function (filters: any = {}, options: any = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', populate = [] } = options;
  const query = this.find(filters);
  const sort: any = {}; sort[sortBy] = sortOrder === 'desc' ? -1 : 1; query.sort(sort);
  const skip = (page - 1) * limit; query.skip(skip).limit(parseInt(limit, 10));
  if (populate.length) { populate.forEach((field: string) => query.populate(field)); }
  return query;
};

OrderSchema.statics.getStatistics = async function (filters: any = {}) {
  const pipeline = [ { $match: filters }, { $group: { _id: null, totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$pricing.totalAmount' }, averageOrderValue: { $avg: '$pricing.totalAmount' }, statusBreakdown: { $push: '$status' } } } ];
  const [stats] = await this.aggregate(pipeline);
  if (!stats) return { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0, statusBreakdown: {} };
  const statusCounts: Record<string, number> = {};
  stats.statusBreakdown.forEach((s: string) => { statusCounts[s] = (statusCounts[s] || 0) + 1; });
  return { totalOrders: stats.totalOrders, totalRevenue: Math.round(stats.totalRevenue * 100) / 100, averageOrderValue: Math.round(stats.averageOrderValue * 100) / 100, statusBreakdown: statusCounts };
};

OrderSchema.methods.addInternalNote = function (adminId: mongoose.Types.ObjectId, note: string, priority: 'low' | 'medium' | 'high' = 'medium') {
  this.internalNotes = this.internalNotes || [];
  this.internalNotes.push({ admin: adminId, note, priority, createdAt: new Date() } as any);
  return this.save();
};

OrderSchema.methods.updateStatus = function (newStatus: OrderStatus, adminId?: mongoose.Types.ObjectId, note: string | null = null) {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
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
  } as any;
  if (!validTransitions[this.status as OrderStatus].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  this.status = newStatus;
  if (note && adminId) this.addInternalNote(adminId, `Status changed to ${newStatus}. ${note}`, 'medium');
  return this.save();
};

export const Order: IOrderModel = (mongoose.models.Order as IOrderModel) || mongoose.model<IOrder, IOrderModel>('Order', OrderSchema);
