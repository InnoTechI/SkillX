const express = require('express');
const Chat = require('../models/Chat');
const Order = require('../models/Order');
const { 
  authenticate, 
  requireAdmin, 
  checkResourceAccess 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/orders/:orderId/chat
 * @desc    Get or create chat room for an order
 * @access  Private (Admin/Client - own orders only)
 */
router.get('/:orderId/chat',
  authenticate,
  createValidator(validators.idParam('orderId')),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;

    // Verify order exists and user has access
    const order = await Order.findById(orderId).populate('client', 'firstName lastName email');
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user can access this order's chat
    if (req.user.role === 'client' && order.client._id.toString() !== req.user._id.toString()) {
      throw new AppError('You can only access chat for your own orders', 403, 'ACCESS_DENIED');
    }

    // Find existing chat room or create new one
    let chatRoom = await Chat.ChatRoom.findOne({ order: orderId })
      .populate('participants', 'firstName lastName email role')
      .populate('lastMessage');

    if (!chatRoom) {
      // Create new chat room
      const participants = [order.client._id];
      if (order.assignedAdmin) {
        participants.push(order.assignedAdmin);
      }

      chatRoom = new Chat.ChatRoom({
        order: orderId,
        participants,
        isActive: true,
        metadata: {
          createdBy: req.user._id,
          orderNumber: order.orderNumber,
          serviceType: order.serviceType
        }
      });

      await chatRoom.save();
      await chatRoom.populate('participants', 'firstName lastName email role');

      logger.business('chat_room_created', 'chat', chatRoom._id, {
        createdBy: req.user._id,
        orderId,
        participantCount: participants.length
      });
    }

    // Update last accessed time for user
    await chatRoom.updateLastAccessed(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Chat room retrieved successfully',
      data: {
        chatRoom
      }
    });
  })
);

/**
 * @route   GET /api/orders/:orderId/messages
 * @desc    Retrieve chat history for an order
 * @access  Private (Admin/Client - own orders only)
 */
router.get('/:orderId/messages',
  authenticate,
  createValidator([...validators.idParam('orderId'), ...validators.pagination]),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      messageType,
      senderId,
      startDate,
      endDate
    } = req.query;

    // Verify order exists and user has access
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user can access this order's messages
    if (req.user.role === 'client' && order.client.toString() !== req.user._id.toString()) {
      throw new AppError('You can only access messages for your own orders', 403, 'ACCESS_DENIED');
    }

    // Find chat room
    const chatRoom = await Chat.ChatRoom.findOne({ order: orderId });
    if (!chatRoom) {
      // Return empty messages if no chat room exists
      return res.status(200).json({
        success: true,
        message: 'No messages found',
        data: {
          messages: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(limit),
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      });
    }

    // Build filter object
    const filters = { chatRoom: chatRoom._id };

    if (messageType) {
      filters.messageType = messageType;
    }

    if (senderId) {
      filters.sender = senderId;
    }

    // Date range filter
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    // Get messages with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        'sender',
        'attachments',
        'replyTo.sender'
      ]
    };

    const result = await Chat.ChatMessage.paginate(filters, options);

    // Mark messages as read by current user
    const unreadMessageIds = result.docs
      .filter(msg => 
        msg.sender._id.toString() !== req.user._id.toString() && 
        !msg.readBy.some(read => read.user.toString() === req.user._id.toString())
      )
      .map(msg => msg._id);

    if (unreadMessageIds.length > 0) {
      await Chat.ChatMessage.updateMany(
        { _id: { $in: unreadMessageIds } },
        {
          $push: {
            readBy: {
              user: req.user._id,
              readAt: new Date()
            }
          }
        }
      );
    }

    // Update last accessed time
    await chatRoom.updateLastAccessed(req.user._id);

    logger.business('messages_retrieved', 'chat', chatRoom._id, {
      retrievedBy: req.user._id,
      messageCount: result.docs.length,
      markedAsRead: unreadMessageIds.length
    });

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.totalDocs,
          itemsPerPage: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        chatRoom: {
          _id: chatRoom._id,
          isActive: chatRoom.isActive,
          participants: chatRoom.participants
        }
      }
    });
  })
);

/**
 * @route   POST /api/orders/:orderId/messages
 * @desc    Send message to client
 * @access  Private (Admin/Client - own orders only)
 */
router.post('/:orderId/messages',
  authenticate,
  createValidator([...validators.idParam('orderId'), ...validators.messageCreation]),
  checkResourceAccess('order'),
  catchAsync(async (req, res) => {
    const { orderId } = req.params;
    const { 
      content, 
      messageType = 'text', 
      priority = 'normal',
      replyTo,
      attachments = [],
      isInternal = false
    } = req.body;

    // Verify order exists and user has access
    const order = await Order.findById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if user can send messages for this order
    if (req.user.role === 'client' && order.client.toString() !== req.user._id.toString()) {
      throw new AppError('You can only send messages for your own orders', 403, 'ACCESS_DENIED');
    }

    // Only admins can send internal messages
    if (isInternal && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('Only admins can send internal messages', 403, 'ACCESS_DENIED');
    }

    // Find or create chat room
    let chatRoom = await Chat.ChatRoom.findOne({ order: orderId });
    
    if (!chatRoom) {
      const participants = [order.client];
      if (order.assignedAdmin) {
        participants.push(order.assignedAdmin);
      }

      chatRoom = new Chat.ChatRoom({
        order: orderId,
        participants,
        isActive: true,
        metadata: {
          createdBy: req.user._id,
          orderNumber: order.orderNumber,
          serviceType: order.serviceType
        }
      });

      await chatRoom.save();
    }

    // Validate reply message if specified
    if (replyTo) {
      const replyMessage = await Chat.ChatMessage.findById(replyTo);
      if (!replyMessage || replyMessage.chatRoom.toString() !== chatRoom._id.toString()) {
        throw new AppError('Invalid reply message', 400, 'INVALID_REPLY_MESSAGE');
      }
    }

    // Create message
    const messageData = {
      chatRoom: chatRoom._id,
      sender: req.user._id,
      content: content.trim(),
      messageType,
      priority,
      isInternal,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        orderNumber: order.orderNumber
      }
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    const message = new Chat.ChatMessage(messageData);
    await message.save();

    // Update chat room with last message
    chatRoom.lastMessage = message._id;
    chatRoom.lastActivity = new Date();
    chatRoom.messageCount += 1;

    // Update unread counts for other participants
    for (const participantId of chatRoom.participants) {
      if (participantId.toString() !== req.user._id.toString()) {
        const existingUnread = chatRoom.unreadCounts.find(
          uc => uc.user.toString() === participantId.toString()
        );
        
        if (existingUnread) {
          existingUnread.count += 1;
        } else {
          chatRoom.unreadCounts.push({
            user: participantId,
            count: 1
          });
        }
      }
    }

    await chatRoom.save();

    // Populate message details
    await message.populate('sender', 'firstName lastName email role');
    await message.populate('attachments');
    if (replyTo) {
      await message.populate('replyTo.sender', 'firstName lastName');
    }

    // Add order history entry
    const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
    await order.addToHistory(
      req.user._id,
      'message_sent',
      `${req.user.role === 'client' ? 'Client' : 'Admin'} sent message: "${messagePreview}"`
    );

    logger.business('message_sent', 'chat', chatRoom._id, {
      sentBy: req.user._id,
      messageType,
      priority,
      isInternal,
      orderId,
      messageLength: content.length
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message,
        chatRoom: {
          _id: chatRoom._id,
          messageCount: chatRoom.messageCount,
          lastActivity: chatRoom.lastActivity
        }
      }
    });
  })
);

/**
 * @route   PUT /api/messages/:messageId
 * @desc    Edit message (within time limit)
 * @access  Private (Message sender only)
 */
router.put('/messages/:messageId',
  authenticate,
  createValidator([...validators.idParam('messageId'), ...validators.messageUpdate]),
  catchAsync(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Chat.ChatMessage.findById(messageId)
      .populate('sender', 'firstName lastName')
      .populate('chatRoom');

    if (!message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    // Only sender can edit message
    if (message.sender._id.toString() !== req.user._id.toString()) {
      throw new AppError('You can only edit your own messages', 403, 'ACCESS_DENIED');
    }

    // Check if message is within edit time limit (15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      throw new AppError('Messages can only be edited within 15 minutes of sending', 400, 'EDIT_TIME_EXPIRED');
    }

    // Check if message has been read by others
    if (message.readBy.some(read => read.user.toString() !== req.user._id.toString())) {
      throw new AppError('Cannot edit message that has been read by others', 400, 'MESSAGE_ALREADY_READ');
    }

    // Update message
    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    logger.business('message_edited', 'chat', message.chatRoom._id, {
      editedBy: req.user._id,
      messageId,
      originalLength: message.content.length,
      newLength: content.trim().length
    });

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });
  })
);

/**
 * @route   DELETE /api/messages/:messageId
 * @desc    Delete message (soft delete)
 * @access  Private (Message sender/Admin)
 */
router.delete('/messages/:messageId',
  authenticate,
  createValidator(validators.idParam('messageId')),
  catchAsync(async (req, res) => {
    const { messageId } = req.params;
    const { reason = 'Deleted by user' } = req.body;

    const message = await Chat.ChatMessage.findById(messageId)
      .populate('sender', 'firstName lastName')
      .populate('chatRoom');

    if (!message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    // Check permissions: sender can delete own messages, admins can delete any
    if (message.sender._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('You can only delete your own messages', 403, 'ACCESS_DENIED');
    }

    // Soft delete message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    message.metadata.deletionReason = reason;
    await message.save();

    // Update chat room message count
    const chatRoom = message.chatRoom;
    chatRoom.messageCount = Math.max(0, chatRoom.messageCount - 1);
    await chatRoom.save();

    logger.business('message_deleted', 'chat', chatRoom._id, {
      deletedBy: req.user._id,
      messageId,
      originalSender: message.sender._id,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      data: {
        messageId,
        deletedAt: message.deletedAt
      }
    });
  })
);

/**
 * @route   POST /api/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private (Authenticated)
 */
router.post('/messages/:messageId/read',
  authenticate,
  createValidator(validators.idParam('messageId')),
  catchAsync(async (req, res) => {
    const { messageId } = req.params;

    const message = await Chat.ChatMessage.findById(messageId).populate('chatRoom');
    if (!message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    // Check if user is participant in the chat
    if (!message.chatRoom.participants.includes(req.user._id)) {
      throw new AppError('You are not a participant in this chat', 403, 'ACCESS_DENIED');
    }

    // Check if already read by this user
    const alreadyRead = message.readBy.some(read => read.user.toString() === req.user._id.toString());
    if (!alreadyRead) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      await message.save();

      // Update unread count in chat room
      const chatRoom = message.chatRoom;
      const unreadCount = chatRoom.unreadCounts.find(
        uc => uc.user.toString() === req.user._id.toString()
      );
      
      if (unreadCount && unreadCount.count > 0) {
        unreadCount.count -= 1;
        await chatRoom.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: {
        messageId,
        readAt: new Date()
      }
    });
  })
);

/**
 * @route   GET /api/chat/rooms
 * @desc    Get all chat rooms for current user
 * @access  Private (Admin/Client)
 */
router.get('/rooms',
  authenticate,
  createValidator(validators.pagination),
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      sortBy = 'lastActivity',
      sortOrder = 'desc',
      isActive
    } = req.query;

    // Build filter based on user role
    const filters = {
      participants: req.user._id
    };

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // Get chat rooms with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        {
          path: 'order',
          select: 'orderNumber serviceType status client',
          populate: {
            path: 'client',
            select: 'firstName lastName email'
          }
        },
        'participants',
        'lastMessage'
      ]
    };

    const result = await Chat.ChatRoom.paginate(filters, options);

    // Get unread counts for each room
    for (const room of result.docs) {
      const unreadCount = room.unreadCounts.find(
        uc => uc.user.toString() === req.user._id.toString()
      );
      room._doc.unreadCount = unreadCount ? unreadCount.count : 0;
    }

    res.status(200).json({
      success: true,
      message: 'Chat rooms retrieved successfully',
      data: {
        chatRooms: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.totalDocs,
          itemsPerPage: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        }
      }
    });
  })
);

/**
 * @route   PUT /api/chat/rooms/:roomId/close
 * @desc    Close chat room
 * @access  Private (Admin only)
 */
router.put('/rooms/:roomId/close',
  authenticate,
  requireAdmin,
  createValidator(validators.idParam('roomId')),
  catchAsync(async (req, res) => {
    const { roomId } = req.params;
    const { reason = 'Closed by admin' } = req.body;

    const chatRoom = await Chat.ChatRoom.findById(roomId).populate('order');
    if (!chatRoom) {
      throw new AppError('Chat room not found', 404, 'CHAT_ROOM_NOT_FOUND');
    }

    if (!chatRoom.isActive) {
      throw new AppError('Chat room is already closed', 400, 'CHAT_ROOM_ALREADY_CLOSED');
    }

    // Close chat room
    chatRoom.isActive = false;
    chatRoom.closedAt = new Date();
    chatRoom.closedBy = req.user._id;
    chatRoom.metadata.closureReason = reason;
    await chatRoom.save();

    logger.business('chat_room_closed', 'chat', roomId, {
      closedBy: req.user._id,
      reason,
      orderId: chatRoom.order?._id
    });

    res.status(200).json({
      success: true,
      message: 'Chat room closed successfully',
      data: {
        chatRoom
      }
    });
  })
);

module.exports = router;
