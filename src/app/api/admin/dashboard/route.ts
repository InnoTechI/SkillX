import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    // super_admin can see all orders (no filters)
    
    // Get total orders for this admin
    const totalOrders = await Order.countDocuments(filters);
    
    // Get all users (only super_admin gets full count, regular admin gets clients from their orders)
    let totalUsers = 0;
    if (user.role === 'super_admin') {
      totalUsers = await User.countDocuments({});
    } else {
      // Get unique clients from admin's orders
      const clientIds = await Order.distinct('client', filters);
      totalUsers = clientIds.length;
    }
    
    // Get total revenue from paid orders for this admin
    const revenueFilters = {
      ...filters,
      'pricing.paymentStatus': 'paid'
    };
    
    const revenueResult = await Order.aggregate([
      { $match: revenueFilters },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    
    // Get recent orders with populated client data (filtered by admin)
    const recentOrdersData = await Order.find(filters)
      .populate('client', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    
    // Get orders by status (filtered by admin)
    const orderStatusAgg = await Order.aggregate([
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const ordersByStatus = {
      pending: 0,
      in_progress: 0,
      under_review: 0,
      completed: 0,
      cancelled: 0
    };
    
    orderStatusAgg.forEach(statusGroup => {
      const status = statusGroup._id;
      const count = statusGroup.count;
      
      switch (status) {
        case 'pending':
          ordersByStatus.pending = count;
          break;
        case 'in_progress':
          ordersByStatus.in_progress = count;
          break;
        case 'under_review':
        case 'client_review':
          ordersByStatus.under_review = count;
          break;
        case 'completed':
        case 'delivered':
          ordersByStatus.completed = count;
          break;
        case 'cancelled':
        case 'refunded':
          ordersByStatus.cancelled = count;
          break;
      }
    });
    
    // Format recent orders to match frontend expectations
    const recentOrders = recentOrdersData.map(order => ({
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      client: {
        name: `${(order.client as any)?.firstName || ''} ${(order.client as any)?.lastName || ''}`.trim() || 'Unknown Client',
        email: (order.client as any)?.email || 'unknown@email.com'
      },
      status: order.status,
      totalAmount: order.pricing?.totalAmount || 0,
      createdAt: (order as any).createdAt ? new Date((order as any).createdAt).toISOString() : new Date().toISOString(),
      resumeType: order.serviceType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Service'
    }));
    
    const dashboardData = {
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      ordersByStatus
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}