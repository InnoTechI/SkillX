import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { File } from '@/models/File';
import { Order } from '@/models/Order';

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
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

    const { fileId } = await params;

    const file = await File.findById(fileId)
      .populate('uploadedBy', 'name email')
      .populate('relatedOrder', 'orderNumber client assignedAdmin');

    if (!file || !file.isActive) {
      return NextResponse.json({ 
        success: false, 
        message: 'File not found', 
        error: 'FILE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check access permissions
    let hasAccess = false;
    
    if (user.role === 'admin' || user.role === 'super_admin') {
      hasAccess = true;
    } else if (String(file.uploadedBy._id) === String(user._id)) {
      hasAccess = true;
    } else if (file.relatedOrder) {
      const order = file.relatedOrder as any;
      if (String(order.client) === String(user._id) || 
          (order.assignedAdmin && String(order.assignedAdmin) === String(user._id))) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied to this file', 
        error: 'UNAUTHORIZED_ACCESS' 
      }, { status: 403 });
    }

    // In a real implementation, you would retrieve the file from storage
    // For this demo, we'll return file metadata and a simulated download URL
    
    return NextResponse.json({
      success: true,
      message: 'File details retrieved successfully',
      data: {
        file: {
          id: file._id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          fileType: file.fileType,
          uploadDate: file.uploadDate,
          metadata: file.metadata,
          downloadUrl: `/api/files/${fileId}/download`, // This would be actual download URL in production
          uploadedBy: file.uploadedBy,
          relatedOrder: file.relatedOrder
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching file details:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve file details', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ fileId: string }> }) {
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

    const { fileId } = await params;

    const file = await File.findById(fileId)
      .populate('relatedOrder', 'client assignedAdmin');

    if (!file || !file.isActive) {
      return NextResponse.json({ 
        success: false, 
        message: 'File not found', 
        error: 'FILE_NOT_FOUND' 
      }, { status: 404 });
    }

    // Check deletion permissions
    let canDelete = false;
    
    if (user.role === 'admin' || user.role === 'super_admin') {
      canDelete = true;
    } else if (String(file.uploadedBy) === String(user._id)) {
      canDelete = true;
    }

    if (!canDelete) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied to delete this file', 
        error: 'UNAUTHORIZED_DELETE' 
      }, { status: 403 });
    }

    // Soft delete - mark as inactive instead of actual deletion
    file.isActive = false;
    await file.save();

    // In production, you might also remove the file from storage
    console.log(`File ${file.filename} marked as deleted (soft delete)`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to delete file', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}