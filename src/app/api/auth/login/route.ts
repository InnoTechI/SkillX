import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  await connectDB();
  const { email, password } = await req.json();

  try {
    const user = await User.findByCredentials(email, password);
    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Access denied. Admin privileges required.', error: 'INSUFFICIENT_PRIVILEGES' }, { status: 403 });
    }
    const accessToken = signAccessToken(String((user as any)._id));
    const refreshToken = signRefreshToken(String((user as any)._id));

    return NextResponse.json({ success: true, message: 'Login successful', data: { user: { id: (user as any)._id, email: user.email, firstName: user.firstName, lastName: user.lastName, fullName: user.fullName, role: user.role }, tokens: { accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRES_IN || '7d' } } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Invalid credentials', error: 'INVALID_CREDENTIALS' }, { status: 401 });
  }
}
