import mongoose, { Document, Schema } from 'mongoose';

interface IRevision extends Document {
  order: mongoose.Types.ObjectId;
  orderNumber: string;
  requestedBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  revisionNumber: number;
  status: 'requested' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  description: string;
  feedback?: string;
  adminNotes?: string;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RevisionSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  revisionNumber: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['requested', 'in_progress', 'completed', 'rejected'],
    default: 'requested'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  feedback: {
    type: String,
    trim: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  estimatedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  }
}, {
  timestamps: true
});

RevisionSchema.index({ order: 1 });
RevisionSchema.index({ requestedBy: 1 });
RevisionSchema.index({ status: 1 });
RevisionSchema.index({ priority: 1 });
RevisionSchema.index({ createdAt: -1 });

export const Revision = mongoose.models.Revision || mongoose.model<IRevision>('Revision', RevisionSchema);
export type { IRevision };