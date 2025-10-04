import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { CareerPath } from '@/models/CareerPath';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');
    const isActive = searchParams.get('active') !== 'false';
    
    const filter: any = { isActive };
    if (category) filter.category = category;
    
    const careerPaths = await CareerPath.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: careerPaths
    });
  } catch (error) {
    console.error('Error fetching career paths:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch career paths' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const careerPath = new CareerPath(body);
    await careerPath.save();
    
    return NextResponse.json({
      success: true,
      data: careerPath
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating career path:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create career path' },
      { status: 500 }
    );
  }
}