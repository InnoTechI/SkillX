import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Revision } from '@/models/Revision';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  req: NextRequest, 
  context: { params: Promise<{ revisionId: string }> }
) {
  try {
    await connectDB();
    
    const user = await getAuthUser(req);
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions', 
        error: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const { revisionId } = await context.params;
    const body = await req.json();
    const { status, adminNotes, feedback } = body;

    // Find the revision
    const revision = await Revision.findById(revisionId);
    if (!revision) {
      return NextResponse.json({ 
        success: false, 
        message: 'Revision not found', 
        error: 'REVISION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Update the revision
    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (feedback) updateData.feedback = feedback;
    
    // Set completion date if status is completed
    if (status === 'completed') {
      updateData.actualCompletion = new Date();
    }

    const updatedRevision = await Revision.findByIdAndUpdate(
      revisionId,
      updateData,
      { new: true }
    ).populate('requestedBy', 'firstName lastName');

    return NextResponse.json({
      success: true,
      message: 'Revision updated successfully',
      data: {
        revision: {
          id: updatedRevision._id.toString(),
          order: updatedRevision.orderNumber,
          customer: `${(updatedRevision.requestedBy as any)?.firstName || ''} ${(updatedRevision.requestedBy as any)?.lastName || ''}`.trim(),
          request: updatedRevision.description,
          status: updatedRevision.status === 'requested' ? 'Pending' : 
                  updatedRevision.status === 'in_progress' ? 'In Progress' : 
                  updatedRevision.status === 'completed' ? 'Completed' : 'Rejected',
          priority: updatedRevision.priority.charAt(0).toUpperCase() + updatedRevision.priority.slice(1),
          submittedDate: new Date((updatedRevision as any).createdAt).toISOString().split('T')[0],
          dueDate: updatedRevision.estimatedCompletion ? new Date(updatedRevision.estimatedCompletion).toISOString().split('T')[0] : null,
          feedback: updatedRevision.feedback,
          adminNotes: updatedRevision.adminNotes
        }
      }
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