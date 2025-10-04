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
    
    const { email, password, role } = body || {};

    const user = await User.findByCredentials(email, password);
    
    // Check role-based access
    if (role === 'admin') {
      if (!['admin', 'super_admin'].includes(user.role)) {
        return NextResponse.json({ 
          success: false, 
          message: 'Access denied. Admin privileges required.', 
          error: 'INSUFFICIENT_PRIVILEGES' 
        }, { status: 403 });
      }
    } else if (role === 'user') {
      if (user.role !== 'client') {
        return NextResponse.json({ 
          success: false, 
          message: 'Access denied. User credentials required.', 
          error: 'INSUFFICIENT_PRIVILEGES' 
        }, { status: 403 });
      }
    } else {
      // If no role specified, allow any authenticated user
      // This maintains backward compatibility
    }

    const accessToken = signAccessToken(String((user as any)._id));
    const refreshToken = signRefreshToken(String((user as any)._id));

    return NextResponse.json({ 
      success: true, 
      message: 'Login successful', 
      data: { 
        user: { 
          id: (user as any)._id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          fullName: user.fullName, 
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }, 
        tokens: { 
          accessToken, 
          refreshToken, 
          expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
        } 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Invalid credentials', 
      error: 'INVALID_CREDENTIALS' 
    }, { status: 401 });
  }
}
