import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { getAuthUser } from '@/lib/auth';

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  await connectDB();
  const user = await getAuthUser(_req as any);
  if (!user) return NextResponse.json({ success: false, message: 'Authentication required', error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { orderId } = await ctx.params;
  const order = await Order.findById(orderId).populate('client assignedAdmin');
  if (!order) return NextResponse.json({ success: false, message: 'Order not found', error: 'ORDER_NOT_FOUND' }, { status: 404 });

  if (user.role === 'client' && String((order as any).client) !== String((user as any)._id)) {
    return NextResponse.json({ success: false, message: 'You can only access your own resources', error: 'RESOURCE_ACCESS_DENIED' }, { status: 403 });
  }

  return NextResponse.json({ success: true, message: 'Order details retrieved successfully', data: { order } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    await connectDB();
    
    const user = await getAuthUser(req as any);
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions', 
        error: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const { orderId } = await ctx.params;
    const body = await req.json();

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found', 
        error: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check if admin can modify this order
    if (user.role === 'admin' && order.assignedAdmin && String(order.assignedAdmin) !== String(user._id)) {
      return NextResponse.json({ 
        success: false, 
        message: 'You can only modify orders assigned to you', 
        error: 'UNAUTHORIZED_ORDER' 
      }, { status: 403 });
    }

    // Update the order
    const updateData: any = {};
    
    // Handle nested updates for pricing
    if (body['pricing.paymentStatus']) {
      updateData['pricing.paymentStatus'] = body['pricing.paymentStatus'];
    }
    
    // Handle other updates
    if (body.status) updateData.status = body.status;
    if (body.assignedAdmin) updateData.assignedAdmin = body.assignedAdmin;
    if (body.priority) updateData.priority = body.priority;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    ).populate('client', 'firstName lastName email');

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      data: { order: updatedOrder }
    });

  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to update order', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
