import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system'],
    default: 'text'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
messageSchema.index({ orderId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });
messageSchema.index({ isRead: 1 });

// Virtual to populate sender information
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate order information
messageSchema.virtual('order', {
  ref: 'Order',
  localField: 'orderId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

// Static method to get unread count for an order
messageSchema.statics.getUnreadCount = function(orderId: string, excludeSenderId?: string) {
  const query: any = { orderId, isRead: false };
  if (excludeSenderId) {
    query.senderId = { $ne: excludeSenderId };
  }
  return this.countDocuments(query);
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(orderId: string, senderId?: string) {
  const query: any = { orderId, isRead: false };
  if (senderId) {
    query.senderId = { $ne: senderId };
  }
  return this.updateMany(query, { isRead: true });
};

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;