import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import type jwtTypes from 'jsonwebtoken';

export function signAccessToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.sign({ id: userId }, secret as jwtTypes.Secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as unknown as jwtTypes.SignOptions } as jwtTypes.SignOptions);
}

export function signRefreshToken(userId: string) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');
  return jwt.sign({ id: userId, type: 'refresh' }, secret as jwtTypes.Secret, { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as unknown as jwtTypes.SignOptions } as jwtTypes.SignOptions);
}

export function verifyAccessToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return jwt.verify(token, secret as jwtTypes.Secret) as any;
}

export function verifyRefreshToken(token: string) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');
  try {
    const decoded = jwt.verify(token, secret as jwtTypes.Secret) as any;
    return decoded.type === 'refresh' ? { userId: decoded.id } : null;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.replace('Bearer ', '');
  const decoded = verifyAccessToken(token);
  const user = await (User as any).findById((decoded as any).id);
  return user || null;
}
