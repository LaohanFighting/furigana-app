/**
 * 服务端鉴权：从请求中解析 session，返回 userId；并计算免费用户当日用量与上限
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'furigana_session';
const FREE_DAILY_LIMIT = 999999; /* 测试阶段取消限制，上线前改回 5 */

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = getSecret();
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret);
  return token;
}

export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    if (typeof sub !== 'string') return null;
    return sub;
  } catch {
    return null;
  }
}

export async function getSessionUser(request: Request): Promise<User | null> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

export async function getUsageAndLimit(user: User): Promise<{
  used: number;
  limit: number;
  resetAt: Date | null;
}> {
  if (user.isPremium) {
    return { used: 0, limit: Number.MAX_SAFE_INTEGER, resetAt: null };
  }
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const resetAt = user.dailyResetAt && user.dailyResetAt >= todayStart
    ? new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    : new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const used = user.dailyResetAt && user.dailyResetAt >= todayStart ? user.dailyUsed : 0;
  return { used, limit: FREE_DAILY_LIMIT, resetAt };
}

export { COOKIE_NAME };
