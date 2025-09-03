import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, message: 'Disabled in production', error: 'FORBIDDEN' }, { status: 403 });
  }
  try {
    await connectDB();
    const count = await User.countDocuments();
    const latest = await User.findOne().sort({ createdAt: -1 }).select('email firstName lastName role createdAt');
    return NextResponse.json({ success: true, data: { count, latest } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Error checking users' }, { status: 500 });
  }
}
