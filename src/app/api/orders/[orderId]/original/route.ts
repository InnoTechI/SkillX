import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Order } from '@/models/Order';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    await connectDB();
    
    const user = await getAuthUser(req as any);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Check if user has admin access
    const role = String(user.role || '').toLowerCase();
    const hasAdminAccess = role === 'admin' || role === 'super_admin';
    
    if (!hasAdminAccess) {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin access required' 
      }, { status: 403 });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('client', 'fullName email')
      .populate('files')
      .lean();

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order not found' 
      }, { status: 404 });
    }

    // Return order details with original files
    const originalFiles = order.files || [];
    const clientInfo = order.client as any;
    
    return NextResponse.json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          client: clientInfo,
          serviceType: order.serviceType,
          status: order.status,
          createdAt: (order as any).createdAt,
          requirements: order.requirements
        },
        originalFiles: originalFiles,
        // For demo purposes, we'll return mock file content
        // In a real implementation, you'd fetch actual file content
        mockOriginalContent: {
          type: 'resume',
          content: `ORIGINAL RESUME - ${order.orderNumber}
          
This is a demonstration of the original document content that would be displayed for order ${order.orderNumber}.

Client: ${clientInfo?.fullName || 'Unknown'}
Service Type: ${order.serviceType?.replace('_', ' ')}
Industry: ${order.requirements?.industryType || 'N/A'}
Target Role: ${order.requirements?.targetRole || 'N/A'}
Experience Level: ${order.requirements?.experienceLevel?.replace('_', ' ') || 'N/A'}

In a real implementation, this would show the actual uploaded document content or the original version before any revisions were made.

Special Requests: ${order.requirements?.specialRequests || 'None'}
ATS Optimization: ${order.requirements?.atsOptimization ? 'Yes' : 'No'}
Keywords: ${order.requirements?.keywords?.join(', ') || 'None specified'}

Status: ${order.status}
Created: ${new Date((order as any).createdAt).toLocaleDateString()}`,
          lastModified: (order as any).createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error fetching original document:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}