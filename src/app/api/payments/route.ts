import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';

// Simple payment interface for this implementation
interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'credit_card' | 'paypal' | 'stripe' | 'bank_transfer';
  transactionId?: string;
  processorResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for demo purposes (in production, use MongoDB)
let payments: Payment[] = [];

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredPayments = payments;
    
    // Filter by user role
    if (user.role === 'client') {
      filteredPayments = payments.filter(payment => payment.userId === String(user._id));
    }

    // Filter by order ID if provided
    if (orderId) {
      filteredPayments = filteredPayments.filter(payment => payment.orderId === orderId);
    }

    // Filter by status if provided
    if (status) {
      filteredPayments = filteredPayments.filter(payment => payment.status === status);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

    // Calculate totals for admin users
    let summary = null;
    if (['admin', 'super_admin'].includes(user.role)) {
      const totalAmount = filteredPayments.reduce((sum, payment) => 
        payment.status === 'completed' ? sum + payment.amount : sum, 0
      );
      const statusBreakdown = filteredPayments.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      summary = {
        totalAmount,
        totalPayments: filteredPayments.length,
        statusBreakdown
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments: paginatedPayments,
        summary,
        pagination: {
          currentPage: page,
          totalItems: filteredPayments.length,
          totalPages: Math.ceil(filteredPayments.length / limit),
          hasNextPage: endIndex < filteredPayments.length,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
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

    const { orderId, paymentMethod, amount } = await req.json();

    if (!orderId || !paymentMethod || !amount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required payment information', 
        error: 'MISSING_PAYMENT_INFO' 
      }, { status: 400 });
    }

    // Verify the order exists and belongs to the user (for clients)
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found', 
        error: 'ORDER_NOT_FOUND' 
      }, { status: 404 });
    }

    if (user.role === 'client' && String(order.client) !== String(user._id)) {
      return NextResponse.json({ 
        success: false, 
        message: 'You can only make payments for your own orders', 
        error: 'UNAUTHORIZED_PAYMENT' 
      }, { status: 403 });
    }

    // Create payment record
    const newPayment: Payment = {
      id: Date.now().toString(),
      orderId,
      orderNumber: order.orderNumber,
      userId: String(user._id),
      amount: parseFloat(amount),
      currency: order.pricing.currency,
      status: 'pending',
      paymentMethod,
      transactionId: `txn_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Simulate payment processing
    setTimeout(() => {
      newPayment.status = Math.random() > 0.1 ? 'completed' : 'failed';
      newPayment.updatedAt = new Date();
    }, 2000);

    payments.push(newPayment);

    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully',
      data: { payment: newPayment }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to process payment', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
