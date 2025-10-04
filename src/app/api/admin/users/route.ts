import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';

export async function GET() {
  try {
    await connectDB();

    // Get all users with basic info
    const users = await User.find({})
      .select('fullName email role isEmailVerified createdAt lastLogin')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate user statistics
    const totalUsers = users.length;
    const adminUsers = users.filter((user: any) => 
      user.role === 'admin' || user.role === 'super_admin'
    ).length;
    const clientUsers = users.filter((user: any) => user.role === 'client').length;
    const verifiedUsers = users.filter((user: any) => user.isEmailVerified).length;

    // Get new users this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter((user: any) => 
      new Date(user.createdAt) > oneWeekAgo
    ).length;

    // Get active users (logged in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter((user: any) => 
      user.lastLogin && new Date(user.lastLogin) > thirtyDaysAgo
    ).length;

    const userStats = {
      totalUsers,
      adminUsers,
      clientUsers,
      verifiedUsers,
      newUsersThisWeek,
      activeUsers,
      users: users.map((user: any) => ({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.lastLogin && new Date(user.lastLogin) > thirtyDaysAgo ? 'Active' : 'Inactive'
      }))
    };

    return NextResponse.json({
      success: true,
      data: userStats
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}