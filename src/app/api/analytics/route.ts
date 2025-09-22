import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';
import { User } from '@/models/User';
import { Revision } from '@/models/Revision';
import { ChatMessage } from '@/models/ChatMessage';

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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Calculate date range
    let startDate: Date;
    let endDate = new Date();

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
    }

    // Build date filter for aggregations
    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get overall statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsersInPeriod = await User.countDocuments(dateFilter);
    
    const totalOrders = await Order.countDocuments();
    const ordersInPeriod = await Order.countDocuments(dateFilter);
    const orderStats = await Order.getStatistics(dateFilter);

    // Get revision statistics
    const revisionStats = await Revision.getRevisionStatistics();
    const revisionsInPeriod = await Revision.countDocuments(dateFilter);

    // Get message statistics
    const totalMessages = await ChatMessage.countDocuments();
    const messagesInPeriod = await ChatMessage.countDocuments(dateFilter);

    // Get recent activity
    const recentOrders = await Order.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('client', 'name email')
      .populate('assignedAdmin', 'name')
      .select('orderNumber serviceType status pricing.totalAmount createdAt urgencyLevel');

    // Get status breakdown for the period
    const statusBreakdown = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } }
    ]);

    // Get service type breakdown for the period
    const serviceBreakdown = await Order.aggregate([
      { $match: dateFilter },
      { $group: { 
        _id: '$serviceType', 
        count: { $sum: 1 }, 
        revenue: { $sum: '$pricing.totalAmount' },
        avgValue: { $avg: '$pricing.totalAmount' }
      } },
      { $sort: { count: -1 } }
    ]);

    // Get urgency level breakdown
    const urgencyBreakdown = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$urgencyLevel', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
      { $sort: { count: -1 } }
    ]);

    // Get daily revenue trend (last 30 days)
    const dailyRevenue = await Order.aggregate([
      { 
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lte: new Date()
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$pricing.totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get completion time analytics
    const completionTimeStats = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          'timeline.actualCompletionDate': { $exists: true },
          'timeline.actualStartDate': { $exists: true }
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$timeline.actualCompletionDate', '$timeline.actualStartDate'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          },
          serviceType: 1,
          urgencyLevel: 1
        }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$completionTime' },
          minCompletionTime: { $min: '$completionTime' },
          maxCompletionTime: { $max: '$completionTime' },
          totalCompleted: { $sum: 1 }
        }
      }
    ]);

    // Get customer satisfaction data (if ratings exist)
    const satisfactionStats = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          'clientFeedback.rating': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$clientFeedback.rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$clientFeedback.rating'
          }
        }
      }
    ]);

    // Get top performing admins
    const adminPerformance = await Order.aggregate([
      { 
        $match: { 
          ...dateFilter,
          assignedAdmin: { $exists: true },
          status: { $in: ['completed', 'delivered'] }
        }
      },
      {
        $group: {
          _id: '$assignedAdmin',
          completedOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          avgOrderValue: { $avg: '$pricing.totalAmount' }
        }
      },
      { $sort: { completedOrders: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      {
        $project: {
          adminName: { $arrayElemAt: ['$admin.name', 0] },
          completedOrders: 1,
          totalRevenue: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: {
        period: {
          startDate,
          endDate,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        overview: {
          totalUsers,
          activeUsers,
          newUsersInPeriod,
          totalOrders,
          ordersInPeriod,
          totalRevenue: orderStats.totalRevenue || 0,
          averageOrderValue: orderStats.averageOrderValue || 0,
          totalMessages,
          messagesInPeriod,
          totalRevisions: revisionStats.totalRevisions || 0,
          revisionsInPeriod
        },
        performance: {
          completionTime: completionTimeStats[0] || { avgCompletionTime: 0, minCompletionTime: 0, maxCompletionTime: 0, totalCompleted: 0 },
          satisfaction: satisfactionStats[0] || { avgRating: 0, totalRatings: 0, ratingDistribution: [] },
          adminPerformance
        },
        breakdowns: {
          status: statusBreakdown,
          serviceType: serviceBreakdown,
          urgency: urgencyBreakdown
        },
        trends: {
          dailyRevenue
        },
        recentOrders
      }
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve analytics', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
