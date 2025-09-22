import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Revision } from '@/models/Revision';

export async function GET(req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
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

    const { revisionId } = await params;

    const revision = await Revision.findById(revisionId)
      .populate('relatedOrder', 'orderNumber serviceType status client')
      .populate('requestedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('requestDetails.attachments')
      .populate('response.deliverables')
      .populate('response.completedBy', 'name email');

    if (!revision) {
      return NextResponse.json({ 
        success: false, 
        message: 'Revision not found', 
        error: 'REVISION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check access permissions
    const canAccess = user.role === 'admin' || 
                     user.role === 'super_admin' ||
                     String(revision.requestedBy._id) === String(user._id) ||
                     (revision.assignedTo && String(revision.assignedTo._id) === String(user._id));

    if (!canAccess) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied', 
        error: 'UNAUTHORIZED_ACCESS' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Revision retrieved successfully',
      data: { revision }
    });
  } catch (error: any) {
    console.error('Error fetching revision:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve revision', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
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

    const { revisionId } = await params;
    const { status, assignedTo, notes, feedback } = await req.json();

    const revision = await Revision.findById(revisionId)
      .populate('relatedOrder', 'client');

    if (!revision) {
      return NextResponse.json({ 
        success: false, 
        message: 'Revision not found', 
        error: 'REVISION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check permissions for status updates
    const canUpdate = user.role === 'admin' || 
                     user.role === 'super_admin' ||
                     (revision.assignedTo && String(revision.assignedTo) === String(user._id));

    if (!canUpdate) {
      return NextResponse.json({ 
        success: false, 
        message: 'Only admins or assigned users can update revision status', 
        error: 'UNAUTHORIZED_UPDATE' 
      }, { status: 403 });
    }

    // Update revision status using the model method
    if (status) {
      await revision.updateStatus(status, assignedTo ? assignedTo : user._id);
    }

    // Update assignment if provided (admin only)
    if (assignedTo && ['admin', 'super_admin'].includes(user.role)) {
      revision.assignedTo = assignedTo;
    }

    // Update response notes/feedback if provided
    if (notes || feedback) {
      revision.response = revision.response || {};
      
      if (notes) {
        revision.response.notes = notes;
      }
      
      if (feedback && status === 'completed') {
        revision.response.completedBy = user._id;
        revision.response.completedAt = new Date();
      }
      
      await revision.save();
    }

    // Populate the updated revision
    await revision.populate([
      { path: 'relatedOrder', select: 'orderNumber serviceType status' },
      { path: 'requestedBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'response.completedBy', select: 'name email' }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Revision updated successfully',
      data: { revision }
    });
  } catch (error: any) {
    console.error('Error updating revision:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to update revision', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}