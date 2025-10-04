import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';
import { Revision } from '@/models/Revision';

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

    const filter: any = {};
    
    // Filter by user role
    if (user.role === 'client') {
      filter.requestedBy = user._id;
    }

    // Filter by order ID if provided
    if (orderId) {
      filter.order = orderId;
    }

    // Filter by status if provided
    if (status) {
      filter.status = status;
    }

    // Get revisions with pagination
    const revisions = await Revision.find(filter)
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('order', 'orderNumber serviceType status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const totalRevisions = await Revision.countDocuments(filter);

    // Format revisions for response
    const formattedRevisions = revisions.map(revision => ({
      id: (revision as any)._id.toString(),
      order: revision.orderNumber,
      customer: `${(revision.requestedBy as any)?.firstName || ''} ${(revision.requestedBy as any)?.lastName || ''}`.trim(),
      request: revision.description,
      status: revision.status === 'requested' ? 'Pending' : 
              revision.status === 'in_progress' ? 'In Progress' : 
              revision.status === 'completed' ? 'Completed' : 'Rejected',
      priority: revision.priority.charAt(0).toUpperCase() + revision.priority.slice(1),
      submittedDate: new Date((revision as any).createdAt).toISOString().split('T')[0],
      dueDate: revision.estimatedCompletion ? new Date(revision.estimatedCompletion).toISOString().split('T')[0] : null,
      feedback: revision.feedback,
      adminNotes: revision.adminNotes
    }));

    // Calculate statistics for admin users
    let statistics = null;
    if (['admin', 'super_admin'].includes(user.role)) {
      const allRevisions = await Revision.find({}).lean();
      
      const statusBreakdown = allRevisions.reduce((acc, revision) => {
        acc[revision.status] = (acc[revision.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const priorityBreakdown = allRevisions.reduce((acc, revision) => {
        acc[revision.priority] = (acc[revision.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      statistics = {
        totalRevisions: allRevisions.length,
        statusBreakdown,
        priorityBreakdown
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Revisions retrieved successfully',
      data: {
        revisions: formattedRevisions,
        statistics,
        pagination: {
          currentPage: page,
          totalItems: totalRevisions,
          totalPages: Math.ceil(totalRevisions / limit),
          hasNextPage: (page * limit) < totalRevisions,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching revisions:', error);
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
    const existingRevisions = await Revision.find({ orderNumber: order.orderNumber });
    const revisionNumber = existingRevisions.length + 1;

    // Set estimated completion (3 days from now for standard, 1 day for high priority)
    const estimatedDays = priority === 'high' ? 1 : priority === 'medium' ? 2 : 3;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    // Create new revision
    const revision = new Revision({
      orderNumber: order.orderNumber,
      requestedBy: user._id,
      revisionNumber,
      status: 'requested',
      priority,
      description: description.trim(),
      estimatedCompletion
    });

    await revision.save();
    await revision.populate('requestedBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Revision requested successfully',
      data: { 
        revision: {
          id: (revision as any)._id.toString(),
          order: revision.orderNumber,
          customer: `${(revision.requestedBy as any)?.firstName || ''} ${(revision.requestedBy as any)?.lastName || ''}`.trim(),
          request: revision.description,
          status: 'Pending',
          priority: revision.priority.charAt(0).toUpperCase() + revision.priority.slice(1),
          submittedDate: new Date((revision as any).createdAt).toISOString().split('T')[0],
          dueDate: revision.estimatedCompletion ? new Date(revision.estimatedCompletion).toISOString().split('T')[0] : null,
          feedback: revision.feedback,
          adminNotes: revision.adminNotes
        }
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to request revision', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
