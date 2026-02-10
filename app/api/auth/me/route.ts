/**
 * GET /api/auth/me
 * 返回当前登录用户信息及剩余次数
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUsageAndLimit, isPremiumUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }
  const { used, limit } = await getUsageAndLimit(user);
  const isPremium = isPremiumUser(user);
  return NextResponse.json({
    loggedIn: true,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    identity: user.email ?? user.phone ?? '',
    isPremium,
    remaining: isPremium ? undefined : Math.max(0, limit - used),
    accessStatus: user.accessStatus ?? null,
    accessRejectReason: user.accessRejectReason ?? null,
    isAdmin: user.isAdmin ?? false,
  });
}
