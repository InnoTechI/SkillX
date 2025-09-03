const mongoose = require('mongoose');

/**
 * ChatRoom Schema - Represents a chat room for order-specific communication
 * Enables real-time communication between clients and admins
 */
const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique room ID: ROOM-YYYYMMDD-XXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      return `ROOM-${year}${month}${day}-${random}`;
    }
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required'],
    unique: true // Each order has exactly one chat room
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'admin', 'super_admin'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    permissions: {
      canSendMessages: {
        type: Boolean,
        default: true
      },
      canUploadFiles: {
        type: Boolean,
        default: true
      },
      canDeleteMessages: {
        type: Boolean,
        default: false
      }
    }
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'closed', 'suspended'],
    default: 'active',
    required: true
  },
  settings: {
    allowFileUploads: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 5242880, // 5MB in bytes
      min: [0, 'Max file size cannot be negative']
    },
    allowedFileTypes: [{
      type: String,
      enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif']
    }],
    autoArchiveAfterDays: {
      type: Number,
      default: 30,
      min: [1, 'Auto archive period must be at least 1 day']
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    totalMessages: {
      type: Number,
      default: 0,
      min: [0, 'Total messages cannot be negative']
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    lastMessageBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, 'Tag cannot exceed 30 characters']
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for days since last activity
chatRoomSchema.virtual('daysSinceLastActivity').get(function() {
  return Math.floor((Date.now() - this.metadata.lastActivity) / (1000 * 60 * 60 * 24));
});

// Virtual for active participants count
chatRoomSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for unread messages (would need to be calculated based on user's last seen)
chatRoomSchema.virtual('hasUnreadMessages').get(function() {
  // This would be calculated dynamically based on the requesting user
  return false; // Placeholder
});

// Indexes for better query performance
chatRoomSchema.index({ roomId: 1 });
chatRoomSchema.index({ order: 1 });
chatRoomSchema.index({ 'participants.user': 1 });
chatRoomSchema.index({ status: 1 });
chatRoomSchema.index({ 'metadata.lastActivity': -1 });
chatRoomSchema.index({ createdAt: -1 });

// Compound indexes for common queries
chatRoomSchema.index({ status: 1, 'metadata.lastActivity': -1 });
chatRoomSchema.index({ 'participants.user': 1, status: 1 });

// Pre-save middleware to update last activity
chatRoomSchema.pre('save', function(next) {
  if (this.isModified('metadata.totalMessages')) {
    this.metadata.lastActivity = new Date();
  }
  next();
});

// Static method to find rooms for a user
chatRoomSchema.statics.findUserRooms = function(userId, filters = {}) {
  return this.find({
    'participants.user': userId,
    'participants.isActive': true,
    ...filters
  }).populate('order participants.user metadata.lastMessageBy');
};

// Static method to create room for order
chatRoomSchema.statics.createForOrder = async function(orderId, clientId, adminId = null) {
  const participants = [
    {
      user: clientId,
      role: 'client',
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      permissions: {
        canSendMessages: true,
        canUploadFiles: true,
        canDeleteMessages: false
      }
    }
  ];

  if (adminId) {
    participants.push({
      user: adminId,
      role: 'admin',
      joinedAt: new Date(),
      lastSeenAt: new Date(),
      permissions: {
        canSendMessages: true,
        canUploadFiles: true,
        canDeleteMessages: true
      }
    });
  }

  const room = new this({
    order: orderId,
    participants,
    status: 'active'
  });

  return await room.save();
};

// Instance method to add participant
chatRoomSchema.methods.addParticipant = function(userId, role) {
  // Check if user is already a participant
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (existingParticipant) {
    // Reactivate if inactive
    if (!existingParticipant.isActive) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    }
    return this.save();
  }

  // Add new participant
  this.participants.push({
    user: userId,
    role,
    joinedAt: new Date(),
    lastSeenAt: new Date(),
    permissions: {
      canSendMessages: true,
      canUploadFiles: true,
      canDeleteMessages: ['admin', 'super_admin'].includes(role)
    }
  });

  return this.save();
};

// Instance method to remove participant
chatRoomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );

  if (participant) {
    participant.isActive = false;
  }

  return this.save();
};

// Instance method to update last seen for user
chatRoomSchema.methods.updateLastSeen = function(userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString() && p.isActive
  );

  if (participant) {
    participant.lastSeenAt = new Date();
    return this.save();
  }

  return Promise.resolve(this);
};

// Instance method to check if user can perform action
chatRoomSchema.methods.canUserPerformAction = function(userId, action) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString() && p.isActive
  );

  if (!participant) return false;

  switch (action) {
    case 'send_message':
      return participant.permissions.canSendMessages;
    case 'upload_file':
      return participant.permissions.canUploadFiles;
    case 'delete_message':
      return participant.permissions.canDeleteMessages;
    default:
      return false;
  }
};

// Instance method to archive room
chatRoomSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

/**
 * ChatMessage Schema - Individual messages within chat rooms
 * Supports text messages, file attachments, and system notifications
 */
const chatMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    default: function() {
      // Generate unique message ID: MSG-YYYYMMDD-XXXXXXXX
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
      return `MSG-${year}${month}${day}-${random}`;
    }
  },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: [true, 'Chat room reference is required']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender reference is required']
  },
  messageType: {
    type: String,
    enum: [
      'text',              // Regular text message
      'file',              // File attachment
      'image',             // Image attachment
      'system',            // System notification
      'status_update',     // Order status update
      'revision_request',  // Revision request
      'payment_update',    // Payment status update
      'file_delivery'      // File delivery notification
    ],
    default: 'text',
    required: true
  },
  content: {
    text: {
      type: String,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true
    },
    attachments: [{
      file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
      },
      fileName: String,
      fileSize: Number,
      mimeType: String,
      downloadUrl: String
    }],
    systemData: {
      type: mongoose.Schema.Types.Mixed // For system messages
    }
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'deleted'],
    default: 'sent',
    required: true
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      enum: ['👍', '👎', '❤️', '😊', '😢', '😡', '👏', '🔥'],
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    originalContent: String,
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  metadata: {
    clientIP: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system'],
      default: 'web'
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal'
    },
    flags: [{
      type: String,
      enum: ['important', 'action_required', 'follow_up', 'resolved']
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for message age
chatMessageSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Virtual for read status
chatMessageSchema.virtual('isRead').get(function() {
  return this.readBy && this.readBy.length > 0;
});

// Virtual for reaction summary
chatMessageSchema.virtual('reactionSummary').get(function() {
  const summary = {};
  this.reactions.forEach(reaction => {
    summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
  });
  return summary;
});

// Indexes for better query performance
chatMessageSchema.index({ messageId: 1 });
chatMessageSchema.index({ chatRoom: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ messageType: 1 });
chatMessageSchema.index({ status: 1 });
chatMessageSchema.index({ createdAt: -1 });

// Compound indexes for common queries
chatMessageSchema.index({ chatRoom: 1, messageType: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });

// Pre-save middleware to update chat room metadata
chatMessageSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Update chat room's total messages and last activity
    await mongoose.model('ChatRoom').updateOne(
      { _id: this.chatRoom },
      {
        $inc: { 'metadata.totalMessages': 1 },
        $set: {
          'metadata.lastActivity': this.createdAt,
          'metadata.lastMessageBy': this.sender
        }
      }
    );
  }
  next();
});

// Static method to find messages with pagination
chatMessageSchema.statics.findWithPagination = function(chatRoomId, options = {}) {
  const {
    page = 1,
    limit = 50,
    sortOrder = 'desc',
    messageType = null
  } = options;

  const query = { chatRoom: chatRoomId };
  
  if (messageType) {
    query.messageType = messageType;
  }

  const sort = { createdAt: sortOrder === 'desc' ? -1 : 1 };
  const skip = (page - 1) * limit;

  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'firstName lastName email role')
    .populate('replyTo', 'content.text sender createdAt')
    .populate('content.attachments.file');
};

// Static method to mark messages as read
chatMessageSchema.statics.markAsRead = async function(chatRoomId, userId, messageIds = []) {
  const query = {
    chatRoom: chatRoomId,
    sender: { $ne: userId }, // Don't mark own messages as read
    'readBy.user': { $ne: userId } // Only messages not already read by user
  };

  if (messageIds.length > 0) {
    query._id = { $in: messageIds };
  }

  return await this.updateMany(
    query,
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

// Instance method to add reaction
chatMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji,
    addedAt: new Date()
  });

  return this.save();
};

// Instance method to remove reaction
chatMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );

  return this.save();
};

// Instance method to edit message
chatMessageSchema.methods.editMessage = function(newContent, editedBy) {
  // Store original content in edit history
  this.editHistory.push({
    originalContent: this.content.text,
    editedAt: new Date(),
    editedBy
  });

  // Update content
  this.content.text = newContent;
  this.isEdited = true;

  return this.save();
};

// Instance method to delete message (soft delete)
chatMessageSchema.methods.deleteMessage = function() {
  this.status = 'deleted';
  this.content.text = '[Message deleted]';
  this.content.attachments = [];

  return this.save();
};

// Static method to create system message
chatMessageSchema.statics.createSystemMessage = function(chatRoomId, messageType, systemData, text = '') {
  return new this({
    chatRoom: chatRoomId,
    sender: null, // System messages have no sender
    messageType,
    content: {
      text,
      systemData
    },
    metadata: {
      source: 'system'
    }
  });
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
