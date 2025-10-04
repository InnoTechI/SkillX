import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { User } from '@/models/User';

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

export async function PUT(req: Request) {
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

    const body = await req.json();
    const { firstName, lastName, phone, email } = body;

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        firstName,
        lastName,
        phone,
        email,
        fullName: `${firstName} ${lastName}`.trim(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found', 
        error: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Return updated user details (excluding sensitive information)
    const userDetails = {
      id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      phone: updatedUser.phone,
      isEmailVerified: updatedUser.isEmailVerified,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully', 
      data: { user: userDetails } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to update profile', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
