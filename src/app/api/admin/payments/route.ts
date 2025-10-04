import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await connectDB();

    // Get authenticated user
    const user = await getAuthUser(req as any);
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions', 
        error: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Create filters based on user role
    const filters: any = {};
    if (user.role === 'admin') {
      // Regular admins can only see orders assigned to them or unassigned orders
      filters.$or = [
        { assignedAdmin: user._id },
        { assignedAdmin: null }
      ];
    }

    // Get all orders with payment information for this admin
    const orders = await Order.find(filters)
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate payment statistics
    const totalRevenue = orders
      .filter((order: any) => order.pricing?.paymentStatus === 'paid')
      .reduce((sum: number, order: any) => sum + (order.pricing?.totalAmount || 0), 0);

    const pendingPayments = orders
      .filter((order: any) => order.pricing?.paymentStatus === 'pending')
      .reduce((sum: number, order: any) => sum + (order.pricing?.totalAmount || 0), 0);

    const pendingCount = orders.filter((order: any) => order.pricing?.paymentStatus === 'pending').length;

    // Calculate this month's revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = orders
      .filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === currentMonth && 
               orderDate.getFullYear() === currentYear &&
               order.pricing?.paymentStatus === 'paid';
      })
      .reduce((sum: number, order: any) => sum + (order.pricing?.totalAmount || 0), 0);

    // Calculate average order value
    const paidOrders = orders.filter((order: any) => order.pricing?.paymentStatus === 'paid');
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    // Create transaction objects
    const transactions = orders.map((order: any) => ({
      id: `TXN-${order.orderNumber.split('-')[1]}`,
      customer: `${order.client?.firstName || ''} ${order.client?.lastName || ''}`.trim() || 'Unknown',
      order: order.orderNumber,
      amount: order.pricing?.totalAmount || 0,
      status: order.pricing?.paymentStatus === 'paid' ? 'Completed' : 
              order.pricing?.paymentStatus === 'pending' ? 'Pending' : 'Failed',
      date: new Date(order.createdAt).toLocaleDateString(),
      method: 'Credit Card', // Default since we don't have payment method in schema yet
      orderId: order._id.toString(),
      createdAt: order.createdAt
    }));

    const paymentStats = {
      totalRevenue,
      pendingPayments,
      pendingCount,
      monthlyRevenue,
      avgOrderValue,
      transactions: transactions.slice(0, 20) // Limit to recent 20 transactions
    };

    return NextResponse.json({
      success: true,
      data: paymentStats
    });

  } catch (error) {
    console.error('Error fetching payment data:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}