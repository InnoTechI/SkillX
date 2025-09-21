import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  await connectDB();
  const user = await getAuthUser(req as any);
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Insufficient permissions', error: 'INSUFFICIENT_PERMISSIONS' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const filters: any = {};
  if (user.role === 'admin') {
    filters.$or = [{ assignedAdmin: user._id }, { assignedAdmin: null }];
  }

  const orders = await Order.findWithFilters(filters, { page, limit, sortBy, sortOrder, populate: ['client', 'assignedAdmin'] });
  const totalOrders = await Order.countDocuments(filters as any);
  const totalPages = Math.ceil(totalOrders / limit);

  return NextResponse.json({ success: true, message: 'Orders retrieved successfully', data: { orders, pagination: { currentPage: page, totalPages, totalItems: totalOrders, itemsPerPage: limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 } } });
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

    const body = await req.json();
    const {
      serviceType,
      urgencyLevel = 'standard',
      requirements,
      pricing
    } = body;

    // Validate required fields
    if (!serviceType || !requirements || !pricing) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required order information', 
        error: 'MISSING_ORDER_INFO' 
      }, { status: 400 });
    }

    // Calculate estimated completion date based on urgency
    const estimatedCompletion = new Date();
    switch (urgencyLevel) {
      case 'express':
        estimatedCompletion.setDate(estimatedCompletion.getDate() + 1);
        break;
      case 'urgent':
        estimatedCompletion.setDate(estimatedCompletion.getDate() + 3);
        break;
      default:
        estimatedCompletion.setDate(estimatedCompletion.getDate() + 7);
    }

    // Create the order
    const orderData = {
      client: user._id,
      serviceType,
      urgencyLevel,
      requirements: {
        industryType: requirements.industryType || 'General',
        experienceLevel: requirements.experienceLevel || 'mid_level',
        targetRole: requirements.targetRole || 'Professional',
        specialRequests: requirements.specialRequests,
        atsOptimization: requirements.atsOptimization !== false,
        keywords: requirements.keywords || []
      },
      pricing: {
        basePrice: pricing.basePrice || 0,
        urgencyFee: pricing.urgencyFee || 0,
        additionalServices: pricing.additionalServices || [],
        discount: pricing.discount || 0,
        totalAmount: pricing.totalAmount || pricing.basePrice || 0,
        currency: pricing.currency || 'USD'
      },
      timeline: {
        estimatedCompletion,
        lastActivity: new Date()
      },
      status: 'pending',
      priority: urgencyLevel === 'express' ? 5 : urgencyLevel === 'urgent' ? 4 : 3
    };

    const order = new Order(orderData);
    await order.save();

    // Populate the client information for response
    await order.populate('client', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to create order', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
