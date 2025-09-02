const express = require('express');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const User = require('../models/User');
const File = require('../models/File');
const Revision = require('../models/Revision');
const Chat = require('../models/Chat');
const { 
  authenticate, 
  requireAdmin 
} = require('../middleware/auth');
const { createValidator, validators } = require('../utils/validators');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get comprehensive dashboard analytics
 * @access  Private (Admin only)
 */
router.get('/dashboard',
  authenticate,
  requireAdmin,
  createValidator(validators.dateRange),
  catchAsync(async (req, res) => {
    const { startDate, endDate, adminId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Admin filter for role-based access
    const adminFilter = {};
    if (req.user.role === 'admin') {
      adminFilter.assignedAdmin = req.user._id;
    } else if (adminId) {
      adminFilter.assignedAdmin = adminId;
    }

    // Combine filters
    const orderFilter = { ...dateFilter, ...adminFilter };
    const paymentFilter = { ...dateFilter };

    // Get key metrics in parallel
    const [
      // Order metrics
      totalOrders,
      completedOrders,
      activeOrders,
      pendingOrders,
      
      // Revenue metrics
      totalRevenue,
      paidAmount,
      pendingPayments,
      
      // Service metrics
      serviceDistribution,
      
      // Client metrics
      totalClients,
      newClients,
      returningClients,
      
      // Performance metrics
      avgCompletionTime,
      orderStatusDistribution,
      monthlyTrends
    ] = await Promise.all([
      // Order counts
      Order.countDocuments(orderFilter),
      Order.countDocuments({ ...orderFilter, status: 'completed' }),
      Order.countDocuments({ 
        ...orderFilter, 
        status: { $in: ['in_progress', 'assigned', 'client_review'] } 
      }),
      Order.countDocuments({ 
        ...orderFilter, 
        status: { $in: ['pending', 'confirmed'] } 
      }),

      // Revenue calculations
      Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
      ]),
      
      Payment.aggregate([
        { $match: { ...paymentFilter, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      
      Payment.aggregate([
        { $match: { ...paymentFilter, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Service type distribution
      Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: '$serviceType', count: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
        { $sort: { count: -1 } }
      ]),

      // Client metrics
      User.countDocuments({ role: 'client', ...dateFilter }),
      
      User.countDocuments({ 
        role: 'client', 
        ...dateFilter,
        isNewUser: true 
      }),
      
      Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: '$client' } },
        { $count: 'uniqueClients' }
      ]),

      // Average completion time
      Order.aggregate([
        { 
          $match: { 
            ...orderFilter, 
            status: 'completed',
            'timeline.startedAt': { $exists: true },
            'timeline.completedAt': { $exists: true }
          } 
        },
        {
          $project: {
            completionTime: {
              $subtract: ['$timeline.completedAt', '$timeline.startedAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$completionTime' }
          }
        }
      ]),

      // Order status distribution
      Order.aggregate([
        { $match: orderFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Monthly trends for the last 12 months
      Order.aggregate([
        {
          $match: {
            ...adminFilter,
            createdAt: { 
              $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) 
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            orderCount: { $sum: 1 },
            revenue: { $sum: '$pricing.total' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Format response data
    const dashboardData = {
      summary: {
        totalOrders,
        completedOrders,
        activeOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        paidAmount: paidAmount[0]?.total || 0,
        pendingPayments: pendingPayments[0]?.total || 0,
        totalClients,
        newClients,
        returningClients: returningClients[0]?.uniqueClients || 0,
        avgCompletionTimeHours: avgCompletionTime[0] ? 
          Math.round(avgCompletionTime[0].avgTime / (1000 * 60 * 60)) : 0
      },
      charts: {
        serviceDistribution,
        orderStatusDistribution,
        monthlyTrends: monthlyTrends.map(trend => ({
          month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
          orderCount: trend.orderCount,
          revenue: trend.revenue,
          completedOrders: trend.completedOrders,
          completionRate: trend.orderCount > 0 ? 
            Math.round((trend.completedOrders / trend.orderCount) * 100) : 0
        }))
      },
      kpis: {
        completionRate: totalOrders > 0 ? 
          Math.round((completedOrders / totalOrders) * 100) : 0,
        revenuePerOrder: totalOrders > 0 ? 
          Math.round((totalRevenue[0]?.total || 0) / totalOrders) : 0,
        clientRetentionRate: totalClients > 0 ? 
          Math.round(((returningClients[0]?.uniqueClients || 0) / totalClients) * 100) : 0
      }
    };

    logger.business('dashboard_viewed', 'analytics', null, {
      viewedBy: req.user._id,
      dateRange: { startDate, endDate },
      adminFilter: adminId || (req.user.role === 'admin' ? req.user._id : null)
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard analytics retrieved successfully',
      data: dashboardData
    });
  })
);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get detailed revenue analytics
 * @access  Private (Admin only)
 */
router.get('/revenue',
  authenticate,
  requireAdmin,
  createValidator([...validators.dateRange, ...validators.pagination]),
  catchAsync(async (req, res) => {
    const { 
      startDate, 
      endDate, 
      groupBy = 'month',
      serviceType,
      adminId 
    } = req.query;

    // Build filters
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const adminFilter = {};
    if (req.user.role === 'admin') {
      adminFilter.assignedAdmin = req.user._id;
    } else if (adminId) {
      adminFilter.assignedAdmin = adminId;
    }

    const serviceFilter = serviceType ? { serviceType } : {};
    
    const orderFilter = { ...dateFilter, ...adminFilter, ...serviceFilter };

    // Revenue by time period
    let groupStage;
    switch (groupBy) {
      case 'day':
        groupStage = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        groupStage = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'year':
        groupStage = {
          year: { $year: '$createdAt' }
        };
        break;
      default: // month
        groupStage = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
    }

    const [
      revenueByPeriod,
      revenueByService,
      revenueByAdmin,
      paymentMethodDistribution,
      refundAnalytics
    ] = await Promise.all([
      // Revenue by time period
      Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: groupStage,
            totalRevenue: { $sum: '$pricing.total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$pricing.total' },
            completedOrders: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ]),

      // Revenue by service type
      Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: '$serviceType',
            totalRevenue: { $sum: '$pricing.total' },
            orderCount: { $sum: 1 },
            avgPrice: { $avg: '$pricing.total' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]),

      // Revenue by admin (if super admin)
      req.user.role === 'super_admin' ? Order.aggregate([
        { $match: { ...orderFilter, assignedAdmin: { $exists: true } } },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedAdmin',
            foreignField: '_id',
            as: 'admin'
          }
        },
        { $unwind: '$admin' },
        {
          $group: {
            _id: {
              adminId: '$assignedAdmin',
              adminName: { $concat: ['$admin.firstName', ' ', '$admin.lastName'] }
            },
            totalRevenue: { $sum: '$pricing.total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$pricing.total' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]) : [],

      // Payment method distribution
      Payment.aggregate([
        { $match: { ...dateFilter, status: 'confirmed' } },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // Refund analytics
      Payment.aggregate([
        { $match: { ...dateFilter, 'refund.isRefunded': true } },
        {
          $group: {
            _id: null,
            totalRefunded: { $sum: '$refund.amount' },
            refundCount: { $sum: 1 },
            avgRefundAmount: { $avg: '$refund.amount' }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      message: 'Revenue analytics retrieved successfully',
      data: {
        revenueByPeriod,
        revenueByService,
        revenueByAdmin: req.user.role === 'super_admin' ? revenueByAdmin : [],
        paymentMethodDistribution,
        refundAnalytics: refundAnalytics[0] || {
          totalRefunded: 0,
          refundCount: 0,
          avgRefundAmount: 0
        },
        summary: {
          totalRevenue: revenueByPeriod.reduce((sum, period) => sum + period.totalRevenue, 0),
          totalOrders: revenueByPeriod.reduce((sum, period) => sum + period.orderCount, 0),
          avgOrderValue: revenueByPeriod.length > 0 ?
            revenueByPeriod.reduce((sum, period) => sum + period.avgOrderValue, 0) / revenueByPeriod.length : 0
        }
      }
    });
  })
);

/**
 * @route   GET /api/analytics/performance
 * @desc    Get performance metrics and KPIs
 * @access  Private (Admin only)
 */
router.get('/performance',
  authenticate,
  requireAdmin,
  createValidator(validators.dateRange),
  catchAsync(async (req, res) => {
    const { startDate, endDate, adminId } = req.query;

    // Build filters
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const adminFilter = {};
    if (req.user.role === 'admin') {
      adminFilter.assignedAdmin = req.user._id;
    } else if (adminId) {
      adminFilter.assignedAdmin = adminId;
    }

    const orderFilter = { ...dateFilter, ...adminFilter };

    const [
      completionMetrics,
      qualityMetrics,
      efficiencyMetrics,
      clientSatisfaction,
      revisionAnalytics,
      deadlinePerformance
    ] = await Promise.all([
      // Completion metrics
      Order.aggregate([
        { $match: orderFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Quality metrics (based on revisions and ratings)
      Order.aggregate([
        { $match: { ...orderFilter, status: 'completed' } },
        {
          $lookup: {
            from: 'revisions',
            localField: '_id',
            foreignField: 'order',
            as: 'revisions'
          }
        },
        {
          $project: {
            revisionCount: { $size: '$revisions' },
            clientRating: '$feedback.rating',
            hasRevisions: { $gt: [{ $size: '$revisions' }, 0] }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            ordersWithRevisions: { $sum: { $cond: ['$hasRevisions', 1, 0] } },
            avgRevisions: { $avg: '$revisionCount' },
            avgRating: { $avg: '$clientRating' },
            totalRatings: { $sum: { $cond: [{ $ne: ['$clientRating', null] }, 1, 0] } }
          }
        }
      ]),

      // Efficiency metrics
      Order.aggregate([
        {
          $match: {
            ...orderFilter,
            status: 'completed',
            'timeline.startedAt': { $exists: true },
            'timeline.completedAt': { $exists: true }
          }
        },
        {
          $project: {
            turnaroundTime: {
              $subtract: ['$timeline.completedAt', '$timeline.startedAt']
            },
            estimatedTime: '$timeline.estimatedCompletion',
            actualTime: '$timeline.completedAt',
            serviceType: 1
          }
        },
        {
          $group: {
            _id: '$serviceType',
            avgTurnaroundTime: { $avg: '$turnaroundTime' },
            minTurnaroundTime: { $min: '$turnaroundTime' },
            maxTurnaroundTime: { $max: '$turnaroundTime' },
            orderCount: { $sum: 1 }
          }
        }
      ]),

      // Client satisfaction
      Order.aggregate([
        {
          $match: {
            ...orderFilter,
            'feedback.rating': { $exists: true }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $gte: ['$feedback.rating', 4.5] }, then: 'excellent' },
                  { case: { $gte: ['$feedback.rating', 3.5] }, then: 'good' },
                  { case: { $gte: ['$feedback.rating', 2.5] }, then: 'average' },
                  { case: { $gte: ['$feedback.rating', 1.5] }, then: 'poor' }
                ],
                default: 'very-poor'
              }
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$feedback.rating' }
          }
        }
      ]),

      // Revision analytics
      Revision.aggregate([
        {
          $match: {
            ...dateFilter,
            ...(adminFilter.assignedAdmin ? { assignedAdmin: adminFilter.assignedAdmin } : {})
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgEffort: { $avg: '$effort.actualHours' }
          }
        }
      ]),

      // Deadline performance
      Order.aggregate([
        {
          $match: {
            ...orderFilter,
            status: 'completed',
            'timeline.deadline': { $exists: true },
            'timeline.completedAt': { $exists: true }
          }
        },
        {
          $project: {
            onTime: {
              $lte: ['$timeline.completedAt', '$timeline.deadline']
            },
            daysLate: {
              $max: [
                0,
                {
                  $divide: [
                    { $subtract: ['$timeline.completedAt', '$timeline.deadline'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCompleted: { $sum: 1 },
            onTimeDeliveries: { $sum: { $cond: ['$onTime', 1, 0] } },
            avgDaysLate: { $avg: '$daysLate' }
          }
        }
      ])
    ]);

    // Calculate KPIs
    const totalOrders = completionMetrics.reduce((sum, status) => sum + status.count, 0);
    const completedOrders = completionMetrics.find(s => s._id === 'completed')?.count || 0;
    
    const qualityData = qualityMetrics[0] || {};
    const deadlineData = deadlinePerformance[0] || {};

    const kpis = {
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      qualityScore: qualityData.totalOrders > 0 ? 
        Math.round(((qualityData.totalOrders - qualityData.ordersWithRevisions) / qualityData.totalOrders) * 100) : 0,
      averageRating: qualityData.avgRating ? Math.round(qualityData.avgRating * 10) / 10 : 0,
      onTimeDeliveryRate: deadlineData.totalCompleted > 0 ? 
        Math.round((deadlineData.onTimeDeliveries / deadlineData.totalCompleted) * 100) : 0,
      averageRevisions: qualityData.avgRevisions ? Math.round(qualityData.avgRevisions * 10) / 10 : 0
    };

    res.status(200).json({
      success: true,
      message: 'Performance analytics retrieved successfully',
      data: {
        kpis,
        completionMetrics,
        qualityMetrics: qualityData,
        efficiencyMetrics,
        clientSatisfaction,
        revisionAnalytics,
        deadlinePerformance: deadlineData
      }
    });
  })
);

/**
 * @route   GET /api/analytics/clients
 * @desc    Get client analytics and behavior insights
 * @access  Private (Admin only)
 */
router.get('/clients',
  authenticate,
  requireAdmin,
  createValidator([...validators.dateRange, ...validators.pagination]),
  catchAsync(async (req, res) => {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      clientSegmentation,
      topClients,
      clientRetention,
      acquisitionChannels,
      clientLifetime
    ] = await Promise.all([
      // Client segmentation by order count
      User.aggregate([
        { $match: { role: 'client', ...dateFilter } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'client',
            as: 'orders'
          }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            orderCount: { $size: '$orders' },
            totalSpent: { $sum: '$orders.pricing.total' },
            lastOrderDate: { $max: '$orders.createdAt' },
            segment: {
              $switch: {
                branches: [
                  { case: { $eq: [{ $size: '$orders' }, 0] }, then: 'no-orders' },
                  { case: { $eq: [{ $size: '$orders' }, 1] }, then: 'one-time' },
                  { case: { $lte: [{ $size: '$orders' }, 3] }, then: 'occasional' },
                  { case: { $lte: [{ $size: '$orders' }, 10] }, then: 'regular' }
                ],
                default: 'vip'
              }
            }
          }
        },
        {
          $group: {
            _id: '$segment',
            count: { $sum: 1 },
            avgOrderCount: { $avg: '$orderCount' },
            avgSpent: { $avg: '$totalSpent' }
          }
        }
      ]),

      // Top clients by revenue
      User.aggregate([
        { $match: { role: 'client' } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'client',
            as: 'orders'
          }
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            email: 1,
            orderCount: { $size: '$orders' },
            totalSpent: { $sum: '$orders.pricing.total' },
            avgOrderValue: { $avg: '$orders.pricing.total' },
            lastOrderDate: { $max: '$orders.createdAt' }
          }
        },
        { $match: { orderCount: { $gt: 0 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // Client retention analysis
      Order.aggregate([
        {
          $group: {
            _id: '$client',
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $project: {
            isReturning: { $gt: ['$orderCount', 1] },
            daysBetween: {
              $divide: [
                { $subtract: ['$lastOrder', '$firstOrder'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalClients: { $sum: 1 },
            returningClients: { $sum: { $cond: ['$isReturning', 1, 0] } },
            avgRetentionDays: { $avg: '$daysBetween' }
          }
        }
      ]),

      // Acquisition channels (if tracked)
      User.aggregate([
        { $match: { role: 'client', ...dateFilter } },
        {
          $group: {
            _id: '$metadata.acquisitionChannel',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Client lifetime value
      User.aggregate([
        { $match: { role: 'client' } },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'client',
            as: 'orders'
          }
        },
        {
          $project: {
            totalSpent: { $sum: '$orders.pricing.total' },
            orderCount: { $size: '$orders' },
            firstOrder: { $min: '$orders.createdAt' },
            lastOrder: { $max: '$orders.createdAt' }
          }
        },
        {
          $match: { orderCount: { $gt: 0 } }
        },
        {
          $group: {
            _id: null,
            avgLifetimeValue: { $avg: '$totalSpent' },
            avgOrdersPerClient: { $avg: '$orderCount' },
            totalClients: { $sum: 1 }
          }
        }
      ])
    ]);

    res.status(200).json({
      success: true,
      message: 'Client analytics retrieved successfully',
      data: {
        segmentation: clientSegmentation,
        topClients,
        retention: clientRetention[0] || {},
        acquisitionChannels,
        lifetimeValue: clientLifetime[0] || {},
        summary: {
          retentionRate: clientRetention[0] ? 
            Math.round((clientRetention[0].returningClients / clientRetention[0].totalClients) * 100) : 0
        }
      }
    });
  })
);

/**
 * @route   GET /api/analytics/reports/export
 * @desc    Export analytics data in various formats
 * @access  Private (Admin only)
 */
router.get('/reports/export',
  authenticate,
  requireAdmin,
  createValidator([...validators.dateRange]),
  catchAsync(async (req, res) => {
    const { 
      startDate, 
      endDate, 
      reportType = 'summary',
      format = 'json'
    } = req.query;

    if (!['json', 'csv'].includes(format)) {
      throw new AppError('Invalid format. Supported formats: json, csv', 400, 'INVALID_FORMAT');
    }

    // Build comprehensive report data
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const adminFilter = {};
    if (req.user.role === 'admin') {
      adminFilter.assignedAdmin = req.user._id;
    }

    const filter = { ...dateFilter, ...adminFilter };

    let reportData;

    switch (reportType) {
      case 'orders':
        reportData = await Order.find(filter)
          .populate('client', 'firstName lastName email')
          .populate('assignedAdmin', 'firstName lastName')
          .select('-__v -history')
          .lean();
        break;

      case 'payments':
        reportData = await Payment.find(dateFilter)
          .populate('order', 'orderNumber client')
          .select('-__v')
          .lean();
        break;

      case 'clients':
        reportData = await User.find({ role: 'client', ...dateFilter })
          .select('-password -__v -loginAttempts')
          .lean();
        break;

      default: // summary
        reportData = {
          period: { startDate, endDate },
          orders: await Order.countDocuments(filter),
          revenue: await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$pricing.total' } } }
          ]),
          clients: await User.countDocuments({ role: 'client', ...dateFilter }),
          generatedAt: new Date(),
          generatedBy: req.user.email
        };
    }

    // Log export activity
    logger.business('report_exported', 'analytics', null, {
      exportedBy: req.user._id,
      reportType,
      format,
      recordCount: Array.isArray(reportData) ? reportData.length : 1,
      dateRange: { startDate, endDate }
    });

    if (format === 'csv') {
      // Convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-${Date.now()}.csv`);
      
      // Simple CSV conversion (would need proper CSV library for complex data)
      if (Array.isArray(reportData)) {
        const headers = Object.keys(reportData[0] || {}).join(',');
        const rows = reportData.map(item => 
          Object.values(item).map(value => 
            typeof value === 'object' ? JSON.stringify(value) : value
          ).join(',')
        );
        res.send([headers, ...rows].join('\n'));
      } else {
        res.send(Object.entries(reportData).map(([key, value]) => `${key},${value}`).join('\n'));
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'Report exported successfully',
        data: reportData,
        metadata: {
          reportType,
          format,
          generatedAt: new Date(),
          recordCount: Array.isArray(reportData) ? reportData.length : 1
        }
      });
    }
  })
);

module.exports = router;
