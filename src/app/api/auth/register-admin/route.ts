import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const { email, password, firstName, lastName, phone } = body || {};

  const existingAdmins = await User.countDocuments({ role: { $in: ['admin', 'super_admin'] } });
  const existingUser = await User.findOne({ email: String(email).toLowerCase() });
  if (existingUser) {
    return NextResponse.json({ success: false, message: 'User with this email already exists', error: 'USER_ALREADY_EXISTS' }, { status: 400 });
  }

  const admin = await User.createAdmin({ email: String(email).toLowerCase(), password, firstName, lastName, phone, role: existingAdmins === 0 ? 'super_admin' as any : 'admin', isEmailVerified: true, isActive: true } as any);

  const accessToken = signAccessToken(String(admin._id));
  const refreshToken = signRefreshToken(String(admin._id));

  return NextResponse.json({ success: true, message: 'Admin registered successfully', data: { user: { id: (admin as any)._id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, fullName: admin.fullName, role: admin.role, isEmailVerified: admin.isEmailVerified, createdAt: (admin as any).createdAt }, tokens: { accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRES_IN || '7d' } } }, { status: 201 });
}
