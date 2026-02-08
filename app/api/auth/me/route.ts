/**
 * GET /api/auth/me
 * 返回当前登录用户信息及剩余次数
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUsageAndLimit } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ loggedIn: false }, { status: 200 });
  }
  const { used, limit } = await getUsageAndLimit(user);
  return NextResponse.json({
    loggedIn: true,
    email: user.email,
    isPremium: user.isPremium,
    remaining: user.isPremium ? undefined : Math.max(0, limit - used),
  });
}
