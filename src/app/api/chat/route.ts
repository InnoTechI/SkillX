import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ChatMessage } from '@/models/ChatMessage';
import { Order } from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = await getAuthUser(req as any);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required', 
        error: 'NOT_AUTHENTICATED' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const includeInternal = searchParams.get('includeInternal') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter query
    const filter: any = {};
    
    // Filter by order ID if provided
    if (orderId) {
      filter.relatedOrder = orderId;
      
      // Verify user has access to this order
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ 
          success: false, 
          message: 'Order not found', 
          error: 'ORDER_NOT_FOUND' 
        }, { status: 404 });
      }
      
      // Check access permissions
      const hasAccess = user.role === 'admin' || 
                       user.role === 'super_admin' ||
                       String(order.client) === String(user._id) ||
                       (order.assignedAdmin && String(order.assignedAdmin) === String(user._id));
      
      if (!hasAccess) {
        return NextResponse.json({ 
          success: false, 
          message: 'Access denied to this order', 
          error: 'UNAUTHORIZED_ACCESS' 
        }, { status: 403 });
      }
    } else if (user.role === 'client') {
      // For clients without specific order, only show their own orders
      const userOrders = await Order.find({ client: user._id }).select('_id');
      filter.relatedOrder = { $in: userOrders.map(order => order._id) };
    }

    // Include/exclude internal messages based on role and request
    if (!includeInternal || user.role === 'client') {
      filter['metadata.isInternal'] = { $ne: true };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch messages with population
    let messages;
    if (orderId) {
      const orderObjectId = new mongoose.Types.ObjectId(orderId);
      messages = await ChatMessage.findByOrder(orderObjectId, {
        includeInternal: includeInternal && ['admin', 'super_admin'].includes(user.role),
        limit,
        page,
        userId: user._id
      });
    } else {
      messages = await ChatMessage.findByOrder(null, {
        includeInternal: includeInternal && ['admin', 'super_admin'].includes(user.role),
        limit,
        page,
        userId: user._id
      });
    }

    const totalMessages = await ChatMessage.countDocuments(filter);

    // Mark messages as read for the current user if viewing specific order
    if (orderId) {
      await ChatMessage.markOrderMessagesAsRead(
        new mongoose.Types.ObjectId(orderId), 
        new mongoose.Types.ObjectId(user._id)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat messages retrieved successfully',
      data: {
        messages,
        pagination: {
          currentPage: page,
          totalItems: totalMessages,
          totalPages: Math.ceil(totalMessages / limit),
          hasNextPage: (page * limit) < totalMessages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve chat messages', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = await getAuthUser(req as any);
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required', 
        error: 'NOT_AUTHENTICATED' 
      }, { status: 401 });
    }

    const { orderId, message, isInternal = false, priority = 'medium' } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Message is required', 
        error: 'MISSING_MESSAGE' 
      }, { status: 400 });
    }

    // Verify order exists if orderId is provided
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ 
          success: false, 
          message: 'Order not found', 
          error: 'ORDER_NOT_FOUND' 
        }, { status: 404 });
      }

      // Check access permissions
      const hasAccess = user.role === 'admin' || 
                       user.role === 'super_admin' ||
                       String(order.client) === String(user._id) ||
                       (order.assignedAdmin && String(order.assignedAdmin) === String(user._id));
      
      if (!hasAccess) {
        return NextResponse.json({ 
          success: false, 
          message: 'Access denied to this order', 
          error: 'UNAUTHORIZED_ACCESS' 
        }, { status: 403 });
      }
    }

    // Only admins can send internal messages
    if (isInternal && !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Only administrators can send internal messages', 
        error: 'UNAUTHORIZED_INTERNAL_MESSAGE' 
      }, { status: 403 });
    }

    // Determine sender role based on user role
    const senderRole = user.role === 'client' ? 'user' : 'admin';

    // Create new chat message
    const newMessage = new ChatMessage({
      relatedOrder: orderId || undefined,
      sender: user._id,
      senderRole,
      messageType: 'text',
      content: message.trim(),
      metadata: {
        isInternal,
        priority
      }
    });

    await newMessage.save();

    // Populate the message before returning
    await newMessage.populate([
      { path: 'sender', select: 'name email' },
      { path: 'relatedOrder', select: 'orderNumber serviceType' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to send message', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
