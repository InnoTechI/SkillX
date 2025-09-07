import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { getAuthUser } from '@/lib/auth';

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

    // Return user details (excluding sensitive information)
    const userDetails = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({ 
      success: true, 
      message: 'User details retrieved successfully', 
      data: { user: userDetails } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve user details', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
