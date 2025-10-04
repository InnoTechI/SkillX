import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Testimonial } from '@/models/Testimonial';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const isActive = searchParams.get('active') !== 'false';
    
    const filter: any = { isActive };
    
    const testimonials = await Testimonial.find(filter)
      .sort({ featured: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch testimonials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const testimonial = new Testimonial(body);
    await testimonial.save();
    
    return NextResponse.json({
      success: true,
      data: testimonial
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create testimonial' },
      { status: 500 }
    );
  }
}