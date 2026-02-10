/**
 * 服务端鉴权：从请求中解析 session，返回 userId；并计算免费用户当日用量与上限
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/db';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'furigana_session';
const FREE_TOTAL_LIMIT = 3; /* 免费用户总共使用次数限制（不重置） */

/**
 * 检查用户是否是有效的 Premium 用户
 * 优先检查 premiumExpiresAt，如果不存在则向后兼容 isPremium
 */
export function isPremiumUser(user: User): boolean {
  const now = new Date();
  const isPremiumActive = user.premiumExpiresAt && user.premiumExpiresAt > now;
  // 向后兼容：如果 premiumExpiresAt 不存在但 isPremium 为 true，也视为 Premium
  return isPremiumActive || (user.isPremium && !user.premiumExpiresAt);
}

/** 是否管理员（可审批他人） */
export function isAdminUser(user: User): boolean {
  return user.isAdmin === true;
}

/** 是否有权使用功能：已审批通过 或 管理员 */
export function hasAccess(user: User): boolean {
  if (user.isAdmin) return true;
  return user.accessStatus === 'approved';
}

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
  if (isPremiumUser(user)) {
    return { used: 0, limit: Number.MAX_SAFE_INTEGER, resetAt: null };
  }
  // 总共限制：使用 dailyUsed 字段存储总使用次数，不重置
  const used = user.dailyUsed || 0;
  return { used, limit: FREE_TOTAL_LIMIT, resetAt: null };
}

export { COOKIE_NAME };
