import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Feature } from '@/models/Feature';

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
    
    const features = await Feature.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const feature = new Feature(body);
    await feature.save();
    
    return NextResponse.json({
      success: true,
      data: feature
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create feature' },
      { status: 500 }
    );
  }
}