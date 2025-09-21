import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';
import { User } from '@/models/User';

export async function GET(req: Request) {
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

    // Get overall statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const orderStats = await Order.getStatistics();

    // Get recent activity
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('client', 'firstName lastName email')
      .select('orderNumber serviceType status totalAmount createdAt');

    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get service type breakdown
    const serviceBreakdown = await Order.aggregate([
      { $group: { _id: '$serviceType', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalOrders,
          totalRevenue: orderStats.totalRevenue,
          averageOrderValue: orderStats.averageOrderValue
        },
        recentOrders,
        statusBreakdown,
        serviceBreakdown
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve analytics', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
