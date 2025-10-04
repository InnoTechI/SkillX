import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { ok, badRequest, unauthorized, serverError } from '@/lib/http';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { Order } from '@/models/Order';
import Message from '@/models/Message';

async function getAuthUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    
    await connectDB();
    // Use decoded.id, not decoded.userId
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !['admin', 'super_admin'].includes(user.role.toLowerCase())) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      console.log('No authenticated user found');
      return unauthorized('Admin access required');
    }

    console.log('Authenticated user:', user.email, 'Role:', user.role);

    await connectDB();
    console.log('Database connected successfully');

    // Build filter to only show orders assigned to this admin
    const orderFilter: any = {};
    
    // Super admins can see all orders, regular admins only see their assigned orders
    if (user.role !== 'super_admin') {
      orderFilter.assignedAdmin = user._id;
    }

    // Get orders filtered by admin assignment
    const orders = await Order.find(orderFilter)
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders for admin ${user.email}`);

    const conversations = [];

    for (const order of orders) {
      // Get messages for this order
      const messages = await Message.find({ orderId: order._id })
        .populate('senderId', 'firstName lastName email role')
        .sort({ timestamp: 1 });

      // Get unread count (messages not from admin)
      const unreadCount = await Message.countDocuments({
        orderId: order._id,
        isRead: false,
        senderId: { $ne: user._id }
      });

      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const client = order.client as any;

      conversations.push({
        _id: order._id,
        orderId: order._id,
        customer: {
          name: `${client.firstName} ${client.lastName}`,
          email: client.email
        },
        order: {
          orderNumber: order.orderNumber,
          serviceType: order.serviceType
        },
        lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
        timestamp: lastMessage ? new Date(lastMessage.timestamp).toLocaleString() : new Date().toLocaleString(),
        unreadCount,
        status: order.status,
        messages: messages.map(msg => {
          const sender = msg.senderId as any;
          return {
            _id: msg._id,
            content: msg.content,
            sender: {
              name: `${sender.firstName} ${sender.lastName}`,
              role: sender.role
            },
            timestamp: msg.timestamp,
            isRead: msg.isRead
          };
        })
      });
    }

    console.log(`Returning ${conversations.length} conversations`);
    return ok(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return serverError('Failed to fetch conversations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized('Admin access required');
    }

    const body = await request.json();
    const { orderId, content } = body;

    if (!orderId || !content) {
      return badRequest('Order ID and content are required');
    }

    await connectDB();

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return badRequest('Order not found');
    }

    // Create new message
    const message = new Message({
      orderId,
      senderId: user._id,
      content: content.trim(),
      timestamp: new Date(),
      isRead: true // Admin messages are automatically read
    });

    await message.save();

    // Populate sender information
    await message.populate('senderId', 'firstName lastName email role');
    const sender = message.senderId as any;

    const responseMessage = {
      _id: message._id,
      content: message.content,
      sender: {
        name: `${sender.firstName} ${sender.lastName}`,
        role: sender.role
      },
      timestamp: message.timestamp,
      isRead: message.isRead
    };

    return ok(responseMessage, 'Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    return serverError('Failed to send message');
  }
}