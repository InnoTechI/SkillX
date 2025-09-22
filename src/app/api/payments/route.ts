import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';
import { Payment } from '@/models/Payment';

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter query
    const filter: any = {};
    
    // Filter by user role
    if (user.role === 'client') {
      filter.paidBy = user._id;
    }

    // Filter by order ID if provided
    if (orderId) {
      filter.relatedOrder = orderId;
      
      // Verify user has access to this order
      const order = await Order.findById(orderId);
      if (!order) {
        return NextResponse.json({ 
          success: false, 
          message: 'Order not found', 
          error: 'ORDER_NOT_FOUND' 
        }, { status: 404 });
      }
      
      // Check access permissions
      const hasAccess = user.role === 'admin' || 
                       user.role === 'super_admin' ||
                       String(order.client) === String(user._id) ||
                       (order.assignedAdmin && String(order.assignedAdmin) === String(user._id));
      
      if (!hasAccess) {
        return NextResponse.json({ 
          success: false, 
          message: 'Access denied to this order', 
          error: 'UNAUTHORIZED_ACCESS' 
        }, { status: 403 });
      }
    }

    // Filter by status if provided
    if (status && ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    // Filter by payment method if provided
    if (paymentMethod && ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'wallet'].includes(paymentMethod)) {
      filter.paymentMethod = paymentMethod;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch payments with population
    const payments = await Payment.find(filter)
      .populate('paidBy', 'name email')
      .populate('relatedOrder', 'orderNumber serviceType')
      .populate('refund.refundedBy', 'name')
      .sort({ 'timeline.initiatedAt': -1 })
      .skip(skip)
      .limit(limit);

    const totalPayments = await Payment.countDocuments(filter);

    // Calculate statistics for admin users
    let statistics = null;
    if (['admin', 'super_admin'].includes(user.role)) {
      statistics = await Payment.getPaymentStatistics(filter);
    }

    return NextResponse.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        statistics,
        pagination: {
          currentPage: page,
          totalItems: totalPayments,
          totalPages: Math.ceil(totalPayments / limit),
          hasNextPage: (page * limit) < totalPayments,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve payments', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
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

    const { 
      orderId, 
      paymentMethod, 
      amount,
      billingInfo,
      source = 'web'
    } = await req.json();

    if (!orderId || !paymentMethod || !amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required payment information', 
        error: 'MISSING_PAYMENT_INFO' 
      }, { status: 400 });
    }

    // Verify the order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found', 
        error: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check payment permissions
    const hasAccess = user.role === 'admin' || 
                     user.role === 'super_admin' ||
                     String(order.client) === String(user._id);
    
    if (!hasAccess) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied to make payment for this order', 
        error: 'UNAUTHORIZED_PAYMENT' 
      }, { status: 403 });
    }

    // Validate payment amount matches order total
    if (Math.abs(parseFloat(amount) - order.pricing.totalAmount) > 0.01) {
      return NextResponse.json({ 
        success: false, 
        message: 'Payment amount does not match order total', 
        error: 'AMOUNT_MISMATCH' 
      }, { status: 400 });
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ 
      relatedOrder: orderId, 
      status: { $in: ['completed', 'processing'] }
    });
    
    if (existingPayment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Payment already exists for this order', 
        error: 'PAYMENT_EXISTS' 
      }, { status: 400 });
    }

    // Calculate processing fees (example: 2.9% + $0.30)
    const processingFeeRate = 0.029;
    const processingFeeFixed = 0.30;
    const processingFee = (parseFloat(amount) * processingFeeRate) + processingFeeFixed;

    // Create payment record
    const newPayment = new Payment({
      relatedOrder: orderId,
      paidBy: user._id,
      amount: parseFloat(amount),
      currency: order.pricing.currency,
      paymentMethod,
      billing: billingInfo || {
        name: user.name,
        email: user.email
      },
      fees: {
        processingFee: Math.round(processingFee * 100) / 100,
        platformFee: 0,
        totalFees: Math.round(processingFee * 100) / 100
      },
      metadata: {
        source,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
    });

    await newPayment.save();

    // Simulate payment processing
    // In production, this would integrate with actual payment processors
    setTimeout(async () => {
      try {
        const processingResult = Math.random() > 0.1; // 90% success rate
        
        if (processingResult) {
          await newPayment.updateStatus('completed', {
            processorTransactionId: `stripe_${Date.now()}`,
            processorId: 'stripe',
            success: true
          });
          
          // Update order status to payment_completed or in_progress
          order.status = 'in_progress';
          await order.save();
        } else {
          await newPayment.updateStatus('failed', {
            error: 'Payment declined by processor',
            errorCode: 'card_declined'
          });
        }
      } catch (error) {
        console.error('Error processing payment:', error);
      }
    }, 2000);

    // Populate the payment before returning
    await newPayment.populate([
      { path: 'paidBy', select: 'name email' },
      { path: 'relatedOrder', select: 'orderNumber serviceType' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully',
      data: { payment: newPayment }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to process payment', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
