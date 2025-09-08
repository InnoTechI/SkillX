import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';

// Simple revision interface for this implementation
interface Revision {
  id: string;
  orderId: string;
  orderNumber: string;
  requestedBy: string;
  requesterName: string;
  assignedTo?: string;
  assigneeName?: string;
  revisionNumber: number;
  status: 'requested' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  description: string;
  feedback?: string;
  estimatedCompletion?: Date;
  actualCompletion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for demo purposes (in production, use MongoDB)
let revisions: Revision[] = [];

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
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredRevisions = revisions;
    
    // Filter by user role
    if (user.role === 'client') {
      filteredRevisions = revisions.filter(revision => revision.requestedBy === String(user._id));
    }

    // Filter by order ID if provided
    if (orderId) {
      filteredRevisions = filteredRevisions.filter(revision => revision.orderId === orderId);
    }

    // Filter by status if provided
    if (status) {
      filteredRevisions = filteredRevisions.filter(revision => revision.status === status);
    }

    // Sort by creation date (newest first)
    filteredRevisions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRevisions = filteredRevisions.slice(startIndex, endIndex);

    // Calculate statistics for admin users
    let statistics = null;
    if (['admin', 'super_admin'].includes(user.role)) {
      const statusBreakdown = filteredRevisions.reduce((acc, revision) => {
        acc[revision.status] = (acc[revision.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityBreakdown = filteredRevisions.reduce((acc, revision) => {
        acc[revision.priority] = (acc[revision.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      statistics = {
        totalRevisions: filteredRevisions.length,
        statusBreakdown,
        priorityBreakdown
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Revisions retrieved successfully',
      data: {
        revisions: paginatedRevisions,
        statistics,
        pagination: {
          currentPage: page,
          totalItems: filteredRevisions.length,
          totalPages: Math.ceil(filteredRevisions.length / limit),
          hasNextPage: endIndex < filteredRevisions.length,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve revisions', 
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

    const { orderId, description, priority = 'medium' } = await req.json();

    if (!orderId || !description) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID and description are required', 
        error: 'MISSING_REVISION_INFO' 
      }, { status: 400 });
    }

    // Verify the order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found', 
        error: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if user can request revision for this order
    if (user.role === 'client' && String(order.client) !== String(user._id)) {
      return NextResponse.json({ 
        success: false, 
        message: 'You can only request revisions for your own orders', 
        error: 'UNAUTHORIZED_REVISION' 
      }, { status: 403 });
    }

    // Get the next revision number for this order
    const existingRevisions = revisions.filter(rev => rev.orderId === orderId);
    const revisionNumber = existingRevisions.length + 1;

    // Set estimated completion (3 days from now for standard, 1 day for high priority)
    const estimatedDays = priority === 'high' ? 1 : priority === 'medium' ? 2 : 3;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    const newRevision: Revision = {
      id: Date.now().toString(),
      orderId,
      orderNumber: order.orderNumber,
      requestedBy: String(user._id),
      requesterName: user.fullName,
      revisionNumber,
      status: 'requested',
      priority: priority as 'low' | 'medium' | 'high',
      description: description.trim(),
      estimatedCompletion,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    revisions.push(newRevision);

    return NextResponse.json({
      success: true,
      message: 'Revision requested successfully',
      data: { revision: newRevision }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to request revision', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
