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
