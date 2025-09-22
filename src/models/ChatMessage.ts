import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageType = 'text' | 'file' | 'system' | 'revision_request';
export type SenderRole = 'user' | 'admin' | 'system';

export interface IAttachment {
  fileId: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
}

export interface IChatMessage extends Document {
  relatedOrder: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: SenderRole;
  messageType: MessageType;
  content: string;
  attachments?: IAttachment[];
  metadata?: {
    systemEvent?: string;
    revisionId?: mongoose.Types.ObjectId;
    isInternal?: boolean;
    priority?: 'low' | 'medium' | 'high';
  };
  readBy: {
    user: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  isEdited: boolean;
  editHistory?: {
    editedAt: Date;
    previousContent: string;
  }[];
  markAsRead(userId: mongoose.Types.ObjectId): Promise<IChatMessage>;
}

interface IChatMessageModel extends Model<IChatMessage> {
  findByOrder(orderId: mongoose.Types.ObjectId | null, options?: any): any;
  getUnreadCount(userId: mongoose.Types.ObjectId): Promise<number>;
  markOrderMessagesAsRead(orderId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<any>;
}

const ChatMessageSchema = new Schema<IChatMessage, IChatMessageModel>({
  relatedOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { 
    type: String, 
    enum: ['user', 'admin', 'system'], 
    required: true 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'file', 'system', 'revision_request'], 
    default: 'text',
    required: true 
  },
  content: { type: String, required: true, maxlength: 5000 },
  attachments: [{
    fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true }
  }],
  metadata: {
    systemEvent: { type: String },
    revisionId: { type: Schema.Types.ObjectId, ref: 'Revision' },
    isInternal: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  readBy: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now }
  }],
  isEdited: { type: Boolean, default: false },
  editHistory: [{
    editedAt: { type: Date, default: Date.now },
    previousContent: { type: String, required: true }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ChatMessageSchema.index({ relatedOrder: 1, createdAt: -1 });
ChatMessageSchema.index({ sender: 1 });
ChatMessageSchema.index({ senderRole: 1 });
ChatMessageSchema.index({ messageType: 1 });
ChatMessageSchema.index({ 'readBy.user': 1 });
ChatMessageSchema.index({ 'metadata.isInternal': 1 });
ChatMessageSchema.index({ createdAt: -1 });

// Virtual for unread status
ChatMessageSchema.virtual('isUnread').get(function() {
  return this.readBy && this.readBy.length === 0;
});

// Static methods
ChatMessageSchema.statics.findByOrder = function (
  orderId: mongoose.Types.ObjectId | null, 
  options: any = {}
) {
  const { 
    includeInternal = false, 
    limit = 50, 
    page = 1,
    userId = null
  } = options;
  
  const query: any = orderId ? { relatedOrder: orderId } : {};
  
  if (!includeInternal) {
    query['metadata.isInternal'] = { $ne: true };
  }
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .populate('sender', 'name email role')
    .populate('attachments.fileId')
    .populate('metadata.revisionId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

ChatMessageSchema.statics.getUnreadCount = async function (userId: mongoose.Types.ObjectId) {
  const unreadCount = await this.countDocuments({
    'readBy.user': { $ne: userId },
    senderRole: { $ne: 'system' },
    'metadata.isInternal': { $ne: true }
  });
  
  return unreadCount;
};

ChatMessageSchema.statics.markOrderMessagesAsRead = async function (
  orderId: mongoose.Types.ObjectId, 
  userId: mongoose.Types.ObjectId
) {
  return this.updateMany(
    { 
      relatedOrder: orderId,
      'readBy.user': { $ne: userId }
    },
    { 
      $push: { 
        readBy: { 
          user: userId, 
          readAt: new Date() 
        } 
      } 
    }
  );
};

// Instance methods
ChatMessageSchema.methods.markAsRead = function (userId: mongoose.Types.ObjectId) {
  const existingRead = this.readBy.find((read: { user: mongoose.Types.ObjectId; readAt: Date }) => 
    read.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Pre-save middleware
ChatMessageSchema.pre('save', function (next: () => void) {
  // Auto-mark system messages as read by sender
  if (this.isNew && this.senderRole === 'system') {
    this.readBy.push({
      user: this.sender,
      readAt: new Date()
    });
  }
  next();
});

export const ChatMessage: IChatMessageModel = (mongoose.models.ChatMessage as IChatMessageModel) || 
  mongoose.model<IChatMessage, IChatMessageModel>('ChatMessage', ChatMessageSchema);