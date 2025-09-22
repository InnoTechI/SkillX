import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { File } from '@/models/File';
import { Order } from '@/models/Order';

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
    const fileType = searchParams.get('fileType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build filter query
    const filter: any = { isActive: true };
    
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
    } else if (user.role === 'client') {
      // For clients without specific order, only show their uploaded files
      filter.uploadedBy = user._id;
    }

    // Filter by file type if provided
    if (fileType && ['resume', 'cover_letter', 'document', 'attachment'].includes(fileType)) {
      filter.fileType = fileType;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch files with population
    const files = await File.find(filter)
      .populate('uploadedBy', 'name email')
      .populate('relatedOrder', 'orderNumber serviceType')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);

    const totalFiles = await File.countDocuments(filter);

    return NextResponse.json({
      success: true,
      message: 'Files retrieved successfully',
      data: {
        files,
        pagination: {
          currentPage: page,
          totalItems: totalFiles,
          totalPages: Math.ceil(totalFiles / limit),
          hasNextPage: (page * limit) < totalFiles,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve files', 
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

    // Parse form data for file upload
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const orderId = formData.get('orderId') as string | null;
    const fileType = formData.get('fileType') as string | 'document';
    const description = formData.get('description') as string | '';

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        message: 'No file provided', 
        error: 'MISSING_FILE' 
      }, { status: 400 });
    }

    // Validate file type
    if (!['resume', 'cover_letter', 'document', 'attachment'].includes(fileType)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid file type', 
        error: 'INVALID_FILE_TYPE' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        message: 'File size exceeds 10MB limit', 
        error: 'FILE_TOO_LARGE' 
      }, { status: 400 });
    }

    // Validate file type based on MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];
    
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid file format. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG', 
        error: 'INVALID_FILE_FORMAT' 
      }, { status: 400 });
    }

    // Verify order exists if orderId is provided
    if (orderId) {
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueFilename = `${timestamp}_${randomString}.${fileExtension}`;

    // In a real implementation, save file to storage (AWS S3, local filesystem, etc.)
    // For now, we'll just store metadata
    const fileBuffer = await file.arrayBuffer();
    
    // Create file record
    const newFile = new File({
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      fileType,
      uploadedBy: user._id,
      relatedOrder: orderId || undefined,
      storageProvider: 'local', // In production, use actual storage provider
      metadata: {
        description: description.trim(),
        version: 1
      }
    });

    await newFile.save();

    // Populate the file before returning
    await newFile.populate([
      { path: 'uploadedBy', select: 'name email' },
      { path: 'relatedOrder', select: 'orderNumber serviceType' }
    ]);

    // In production, you would save the actual file here
    // For demo purposes, we'll just return the metadata
    console.log(`File ${uniqueFilename} would be saved to storage. Size: ${file.size} bytes`);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: newFile }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to upload file', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
