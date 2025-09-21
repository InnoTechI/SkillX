import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Refresh token is required', 
        error: 'MISSING_REFRESH_TOKEN' 
      }, { status: 400 });
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid or expired refresh token', 
        error: 'INVALID_REFRESH_TOKEN' 
      }, { status: 401 });
    }

    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found or inactive', 
        error: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Generate new tokens
    const newAccessToken = signAccessToken(String(user._id));
    const newRefreshToken = signRefreshToken(String(user._id));

    return NextResponse.json({ 
      success: true, 
      message: 'Tokens refreshed successfully', 
      data: { 
        tokens: { 
          accessToken: newAccessToken, 
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        } 
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to refresh token', 
      error: 'INTERNAL_ERROR' 
    }, { status: 500 });
  }
}
