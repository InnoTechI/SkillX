import mongoose, { Schema, Document, Model } from 'mongoose';

export type RevisionStatus = 'requested' | 'in_progress' | 'completed' | 'approved' | 'rejected';
export type RevisionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IRevision extends Document {
  revisionNumber: string;
  relatedOrder: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  status: RevisionStatus;
  priority: RevisionPriority;
  requestDetails: {
    description: string;
    specificChanges?: string[];
    attachments?: mongoose.Types.ObjectId[];
  };
  response?: {
    completedBy?: mongoose.Types.ObjectId;
    completedAt?: Date;
    notes?: string;
    deliverables?: mongoose.Types.ObjectId[];
  };
  timeline: {
    requestedAt: Date;
    expectedCompletion: Date;
    actualCompletion?: Date;
  };
  communication: mongoose.Types.ObjectId[];
  qualityCheck?: {
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    approved: boolean;
    feedback?: string;
  };
  updateStatus(newStatus: RevisionStatus, assignedUserId?: mongoose.Types.ObjectId): Promise<IRevision>;
}

interface IRevisionModel extends Model<IRevision> {
  findByOrder(orderId: mongoose.Types.ObjectId): any;
  getRevisionStatistics(): Promise<any>;
}

const RevisionSchema = new Schema<IRevision, IRevisionModel>({
  revisionNumber: { 
    type: String, 
    required: true, 
    unique: true,
    default: function () {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      return `REV-${year}${month}${day}-${random}`;
    }
  },
  relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['requested', 'in_progress', 'completed', 'approved', 'rejected'], 
    default: 'requested',
    required: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium',
    required: true 
  },
  requestDetails: {
    description: { type: String, required: true, maxlength: 2000 },
    specificChanges: [{ type: String, maxlength: 500 }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }]
  },
  response: {
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    notes: { type: String, maxlength: 1000 },
    deliverables: [{ type: Schema.Types.ObjectId, ref: 'File' }]
  },
  timeline: {
    requestedAt: { type: Date, default: Date.now },
    expectedCompletion: { type: Date, required: true },
    actualCompletion: { type: Date }
  },
  communication: [{ type: Schema.Types.ObjectId, ref: 'ChatMessage' }],
  qualityCheck: {
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    approved: { type: Boolean, default: false },
    feedback: { type: String, maxlength: 500 }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
RevisionSchema.index({ relatedOrder: 1 });
RevisionSchema.index({ requestedBy: 1 });
RevisionSchema.index({ assignedTo: 1 });
RevisionSchema.index({ status: 1 });
RevisionSchema.index({ priority: 1 });
RevisionSchema.index({ 'timeline.requestedAt': -1 });
RevisionSchema.index({ 'timeline.expectedCompletion': 1 });
RevisionSchema.index({ status: 1, priority: -1, 'timeline.requestedAt': -1 });

// Pre-save middleware
RevisionSchema.pre('save', function (next) {
  if (this.status === 'completed' && !this.timeline.actualCompletion) {
    this.timeline.actualCompletion = new Date();
  }
  next();
});

// Static methods
RevisionSchema.statics.findByOrder = function (orderId: mongoose.Types.ObjectId) {
  return this.find({ relatedOrder: orderId })
    .populate('requestedBy', 'name email')
    .populate('assignedTo', 'name email')
    .populate('requestDetails.attachments')
    .populate('response.deliverables')
    .sort({ 'timeline.requestedAt': -1 });
};

RevisionSchema.statics.getRevisionStatistics = async function () {
  const pipeline = [
    {
      $group: {
        _id: null,
        totalRevisions: { $sum: 1 },
        pendingRevisions: {
          $sum: { $cond: [{ $eq: ['$status', 'requested'] }, 1, 0] }
        },
        inProgressRevisions: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        completedRevisions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        averageCompletionTime: {
          $avg: {
            $cond: [
              { $and: ['$timeline.actualCompletion', '$timeline.requestedAt'] },
              {
                $divide: [
                  { $subtract: ['$timeline.actualCompletion', '$timeline.requestedAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              },
              null
            ]
          }
        }
      }
    }
  ];
  
  const [stats] = await this.aggregate(pipeline);
  return stats || {
    totalRevisions: 0,
    pendingRevisions: 0,
    inProgressRevisions: 0,
    completedRevisions: 0,
    averageCompletionTime: 0
  };
};

// Instance methods
RevisionSchema.methods.updateStatus = function (
  newStatus: RevisionStatus, 
  assignedUserId?: mongoose.Types.ObjectId
) {
  this.status = newStatus;
  
  if (newStatus === 'in_progress' && assignedUserId) {
    this.assignedTo = assignedUserId;
  }
  
  if (newStatus === 'completed') {
    this.timeline.actualCompletion = new Date();
    if (this.assignedTo) {
      this.response = this.response || {};
      this.response.completedBy = this.assignedTo;
      this.response.completedAt = new Date();
    }
  }
  
  return this.save();
};

export const Revision: IRevisionModel = (mongoose.models.Revision as IRevisionModel) || 
  mongoose.model<IRevision, IRevisionModel>('Revision', RevisionSchema);