import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (_jsonError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON in request body', 
        error: 'INVALID_JSON' 
      }, { status: 400 });
    }
    
    const { email, password, firstName, lastName, phone } = body || {};

    // Check if user already exists
    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return NextResponse.json({
        success: false, 
        message: 'User with this email already exists', 
        error: 'USER_ALREADY_EXISTS' 
      }, { status: 400 });
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email, password, first name, and last name are required', 
        error: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        success: false, 
        message: 'Password must be at least 8 characters long', 
        error: 'WEAK_PASSWORD' 
      }, { status: 400 });
    }

    // Create new user with client role
    const user = new User({
      email: String(email).toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: 'client',
      isEmailVerified: false, // Users need to verify email
      isActive: true
    });

    await user.save();

    // Generate tokens
    const accessToken = signAccessToken(String(user._id));
    const refreshToken = signRefreshToken(String(user._id));

    return NextResponse.json({ 
      success: true, 
      message: 'User registered successfully', 
      data: { 
        user: { 
          id: (user as any)._id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          fullName: user.fullName, 
          role: user.role, 
          isEmailVerified: user.isEmailVerified, 
          createdAt: (user as any).createdAt 
        }, 
        tokens: { 
          accessToken, 
          refreshToken, 
          expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
        } 
      } 
    }, { status: 201 });

  } catch (error: any) {
    console.error('User registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ 
        success: false, 
        message: 'Validation failed', 
        error: 'VALIDATION_ERROR',
        details: validationErrors
      }, { status: 400 });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        message: 'User with this email already exists', 
        error: 'USER_ALREADY_EXISTS' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error', 
      error: 'INTERNAL_SERVER_ERROR' 
    }, { status: 500 });
  }
}
