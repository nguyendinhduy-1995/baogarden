import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';
import type { User } from '@prisma/client';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'bao_garden_token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export type SafeUser = Omit<User, 'passwordHash'>;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;
    return user as unknown as SafeUser;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: Request): Promise<SafeUser | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    const token = tokenMatch?.[1];
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;
    return user as unknown as SafeUser;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): string {
  const secure = IS_PRODUCTION ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}
