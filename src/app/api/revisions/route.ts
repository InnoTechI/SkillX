import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: false, message: 'Revisions API not implemented yet', error: 'NOT_IMPLEMENTED' }, { status: 501 });
}
