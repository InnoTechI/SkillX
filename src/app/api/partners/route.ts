import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Partner } from '@/models/Partner';

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
    
    const partners = await Partner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: partners
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const partner = new Partner(body);
    await partner.save();
    
    return NextResponse.json({
      success: true,
      data: partner
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}