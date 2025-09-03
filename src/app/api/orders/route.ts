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
