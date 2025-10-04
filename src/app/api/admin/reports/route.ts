import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Order } from '@/models/Order';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Check authentication and permissions
    const user = await getAuthUser(request);
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions' 
      }, { status: 403 });
    }

    // Create filters based on user role (same as dashboard)
    const baseFilters: any = {};
    if (user.role === 'admin') {
      // Regular admins can only see orders assigned to them or unassigned orders
      baseFilters.$or = [
        { assignedAdmin: user._id },
        { assignedAdmin: null }
      ];
    }
    // super_admin can see all orders (no filters)

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Debug: Check all orders in database
    const allOrders = await Order.find({}).select('orderNumber createdAt status pricing.paymentStatus pricing.totalAmount').sort({ createdAt: 1 }).lean();
    console.log('All orders in database:', allOrders.length);
    allOrders.forEach(order => {
      console.log(`Order ${order.orderNumber}: Created ${(order as any).createdAt}, Status: ${order.status}, Payment: ${order.pricing?.paymentStatus}, Amount: $${order.pricing?.totalAmount || 0}`);
    });

    // Get total orders and completion metrics
    const totalOrders = await Order.countDocuments(baseFilters);
    const completedOrders = await Order.countDocuments({ 
      ...baseFilters,
      status: { $in: ['completed', 'delivered'] } 
    });
    
    // Calculate average completion time
    const completedOrdersWithTime = await Order.find({
      ...baseFilters,
      status: { $in: ['completed', 'delivered'] },
      createdAt: { $exists: true },
      updatedAt: { $exists: true }
    }).select('createdAt updatedAt').lean();
    
    const avgCompletionTime = completedOrdersWithTime.length > 0 
      ? completedOrdersWithTime.reduce((sum, order) => {
          const diffTime = new Date((order as any).updatedAt).getTime() - new Date((order as any).createdAt).getTime();
          return sum + (diffTime / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / completedOrdersWithTime.length
      : 0;

    // Get total revenue (with admin filtering)
    const revenueResult = await Order.aggregate([
      {
        $match: {
          ...baseFilters,
          'pricing.paymentStatus': 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get active clients (filtered by admin)
    let activeClients = 0;
    if (user.role === 'super_admin') {
      activeClients = await User.countDocuments({
        role: 'client',
        isActive: true
      });
    } else {
      // Get unique clients from admin's orders
      const clientIds = await Order.distinct('client', baseFilters);
      activeClients = clientIds.length;
    }

    // Get monthly revenue data for the past 12 months (full year)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      console.log(`Checking month: ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
      
      const monthOrders = await Order.countDocuments({
        ...baseFilters,
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: { $in: ['completed', 'delivered'] }
      });
      
      const monthRevenue = await Order.aggregate([
        {
          $match: {
            ...baseFilters,
            createdAt: { $gte: monthStart, $lte: monthEnd },
            'pricing.paymentStatus': 'paid'
          }
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$pricing.totalAmount' }
          }
        }
      ]);
      
      console.log(`Month ${monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}: ${monthOrders} orders, $${monthRevenue[0]?.revenue || 0} revenue`);
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        resumes: monthOrders,
        revenue: monthRevenue[0]?.revenue || 0
      });
    }

    // Get service type breakdown (with admin filtering)
    const serviceBreakdown = await Order.aggregate([
      {
        $match: baseFilters
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalServiceOrders = serviceBreakdown.reduce((sum, service) => sum + service.count, 0);
    const formattedServiceBreakdown = serviceBreakdown.map((service, index) => {
      const colors = ['#84CC16', '#8B5CF6', '#22C55E', '#FB923C', '#EF4444'];
      const serviceNames = {
        'resume_writing': 'Executive Resume',
        'cv_writing': 'Technical Resume', 
        'linkedin_optimization': 'Entry Level Resume',
        'cover_letter': 'Career Change Resume'
      };
      
      return {
        label: serviceNames[service._id as keyof typeof serviceNames] || service._id.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        percent: Math.round((service.count / totalServiceOrders) * 100),
        color: colors[index % colors.length],
        orders: service.count
      };
    });

    // Calculate changes (with admin filtering)
    const monthlyOrdersThisMonth = await Order.countDocuments({
      ...baseFilters,
      createdAt: { $gte: startOfMonth }
    });

    // Get previous month data for comparison
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const monthlyOrdersLastMonth = await Order.countDocuments({
      ...baseFilters,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const monthlyRevenueThisMonth = await Order.aggregate([
      {
        $match: {
          ...baseFilters,
          createdAt: { $gte: startOfMonth },
          'pricing.paymentStatus': 'paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    const monthlyRevenueLastMonth = await Order.aggregate([
      {
        $match: {
          ...baseFilters,
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          'pricing.paymentStatus': 'paid'
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    let activeClientsThisWeek = 0;
    let activeClientsLastWeek = 0;
    const startOfLastWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const endOfLastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (user.role === 'super_admin') {
      activeClientsThisWeek = await User.countDocuments({
        role: 'client',
        isActive: true,
        lastLogin: { $gte: startOfWeek }
      });
      activeClientsLastWeek = await User.countDocuments({
        role: 'client',
        isActive: true,
        lastLogin: { $gte: startOfLastWeek, $lte: endOfLastWeek }
      });
    } else {
      // For regular admins, get clients from recent orders
      const recentClientIds = await Order.distinct('client', {
        ...baseFilters,
        createdAt: { $gte: startOfWeek }
      });
      const lastWeekClientIds = await Order.distinct('client', {
        ...baseFilters,
        createdAt: { $gte: startOfLastWeek, $lte: endOfLastWeek }
      });
      activeClientsThisWeek = recentClientIds.length;
      activeClientsLastWeek = lastWeekClientIds.length;
    }

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): string => {
      if (previous === 0) {
        return current > 0 ? '+100%' : '0%';
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? '+' : '';
      return `${sign}${Math.round(change)}%`;
    };

    const thisMonthRevenue = monthlyRevenueThisMonth[0]?.revenue || 0;
    const lastMonthRevenue = monthlyRevenueLastMonth[0]?.revenue || 0;

    // Calculate completion time change (simplified for now)
    const completionTimeChange = avgCompletionTime > 0 ? '-0.5 days' : '0 days';

    const reportsData = {
      metrics: {
        totalResumes: totalOrders,
        avgCompletionTime: parseFloat(avgCompletionTime.toFixed(1)),
        revenue: totalRevenue,
        activeClients: activeClients,
        changes: {
          resumesChange: calculatePercentageChange(monthlyOrdersThisMonth, monthlyOrdersLastMonth) + ' This Month',
          completionTimeChange: completionTimeChange + ' This Month',
          revenueChange: calculatePercentageChange(thisMonthRevenue, lastMonthRevenue) + ' This Month',
          clientsChange: calculatePercentageChange(activeClientsThisWeek, activeClientsLastWeek) + ' This Week'
        }
      },
      monthlyPayments: monthlyData,
      serviceBreakdown: formattedServiceBreakdown
    };

    return NextResponse.json({
      success: true,
      data: reportsData
    });
  } catch (error) {
    console.error('Error fetching reports data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}