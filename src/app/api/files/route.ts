import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Simple file interface for this implementation
interface FileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploaderName: string;
  orderId?: string;
  uploadDate: Date;
  isPublic: boolean;
  downloadCount: number;
}

// In-memory storage for demo purposes (in production, use MongoDB and actual file storage)
let fileRecords: FileRecord[] = [];

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredFiles = fileRecords;
    
    // Filter by order ID if provided
    if (orderId) {
      filteredFiles = fileRecords.filter(file => file.orderId === orderId);
    }

    // Filter by user role
    if (user.role === 'client') {
      filteredFiles = filteredFiles.filter(file => 
        file.uploadedBy === String(user._id) || file.isPublic
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      message: 'Files retrieved successfully',
      data: {
        files: paginatedFiles,
        pagination: {
          currentPage: page,
          totalItems: filteredFiles.length,
          totalPages: Math.ceil(filteredFiles.length / limit),
          hasNextPage: endIndex < filteredFiles.length,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
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

    // In a real implementation, you would handle multipart/form-data
    // For this demo, we'll accept JSON with file metadata
    const { filename, originalName, mimeType, size, orderId, isPublic = false } = await req.json();

    if (!filename || !originalName || !mimeType || !size) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required file information', 
        error: 'MISSING_FILE_INFO' 
      }, { status: 400 });
    }

    const newFile: FileRecord = {
      id: Date.now().toString(),
      filename,
      originalName,
      mimeType,
      size,
      uploadedBy: String(user._id),
      uploaderName: user.fullName,
      orderId: orderId || undefined,
      uploadDate: new Date(),
      isPublic,
      downloadCount: 0
    };

    fileRecords.push(newFile);

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: { file: newFile }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to upload file', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
