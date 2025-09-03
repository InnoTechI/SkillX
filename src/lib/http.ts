import { NextResponse } from 'next/server';

export function ok(data: any, message = 'OK') {
  return NextResponse.json({ success: true, message, data });
}

export function badRequest(message = 'Bad request', error = 'BAD_REQUEST', details?: any) {
  return NextResponse.json({ success: false, message, error, details }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized', error = 'UNAUTHORIZED') {
  return NextResponse.json({ success: false, message, error }, { status: 401 });
}

export function forbidden(message = 'Forbidden', error = 'FORBIDDEN') {
  return NextResponse.json({ success: false, message, error }, { status: 403 });
}

export function notFound(message = 'Not found', error = 'NOT_FOUND') {
  return NextResponse.json({ success: false, message, error }, { status: 404 });
}

export function serverError(message = 'Something went wrong', error = 'INTERNAL_SERVER_ERROR') {
  return NextResponse.json({ success: false, message, error }, { status: 500 });
}
