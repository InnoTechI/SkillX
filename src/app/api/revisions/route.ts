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
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter query
    const filter: any = {};
    
    // Filter by user role
    if (user.role === 'client') {
      filter.requestedBy = user._id;
    }

    // Filter by order ID if provided
    if (orderId) {
      filter.relatedOrder = orderId;
    }

    // Filter by status if provided
    if (status && ['requested', 'in_progress', 'completed', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    // Filter by priority if provided
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      filter.priority = priority;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch revisions with population
    const revisions = await Revision.find(filter)
      .populate('relatedOrder', 'orderNumber serviceType status')
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('requestDetails.attachments')
      .populate('response.deliverables')
      .sort({ 'timeline.requestedAt': -1 })
      .skip(skip)
      .limit(limit);

    const totalRevisions = await Revision.countDocuments(filter);

    // Calculate statistics for admin users
    let statistics = null;
    if (['admin', 'super_admin'].includes(user.role)) {
      statistics = await Revision.getRevisionStatistics();
    }

    return NextResponse.json({
      success: true,
      message: 'Revisions retrieved successfully',
      data: {
        revisions,
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

    const { orderId, description, priority = 'medium', specificChanges = [] } = await req.json();

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

    // Set estimated completion based on priority
    const estimatedDays = priority === 'urgent' ? 1 : priority === 'high' ? 2 : priority === 'medium' ? 3 : 5;
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);

    // Create new revision
    const newRevision = new Revision({
      relatedOrder: orderId,
      requestedBy: user._id,
      priority,
      requestDetails: {
        description: description.trim(),
        specificChanges: specificChanges.filter((change: string) => change.trim()),
        attachments: [] // TODO: Handle file attachments in future
      },
      timeline: {
        requestedAt: new Date(),
        expectedCompletion: estimatedCompletion
      }
    });

    await newRevision.save();

    // Populate the revision before returning
    await newRevision.populate([
      { path: 'relatedOrder', select: 'orderNumber serviceType status' },
      { path: 'requestedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Revision requested successfully',
      data: { revision: newRevision }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating revision:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to request revision', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
