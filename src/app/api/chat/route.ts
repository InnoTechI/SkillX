import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Simple chat message interface for this implementation
interface ChatMessage {
  id: string;
  orderId?: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

// In-memory storage for demo purposes (in production, use MongoDB)
const chatMessages: ChatMessage[] = [];

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let filteredMessages = chatMessages;
    
    // Filter by order ID if provided
    if (orderId) {
      filteredMessages = chatMessages.filter(msg => msg.orderId === orderId);
    }

    // Filter by user role
    if (user.role === 'client') {
      filteredMessages = filteredMessages.filter(msg => 
        msg.orderId && (msg.senderId === String(user._id) || ['admin', 'super_admin'].includes(msg.senderRole))
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      message: 'Chat messages retrieved successfully',
      data: {
        messages: paginatedMessages,
        pagination: {
          currentPage: page,
          totalItems: filteredMessages.length,
          totalPages: Math.ceil(filteredMessages.length / limit),
          hasNextPage: endIndex < filteredMessages.length,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
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

    const { orderId, message } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Message is required', 
        error: 'MISSING_MESSAGE' 
      }, { status: 400 });
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      orderId: orderId || undefined,
      senderId: String(user._id),
      senderName: user.fullName,
      senderRole: user.role,
      message: message.trim(),
      timestamp: new Date(),
      isRead: false
    };

    chatMessages.push(newMessage);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to send message', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
