/**
 * POST /api/auth/verify
 * 请求体: { email?: string, phone?: string, code: string }
 * 验证通过则创建/登录用户，设置 session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSessionToken, COOKIE_NAME, getUsageAndLimit, isPremiumUser } from '@/lib/auth-server';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    const byEmail = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const byPhone = !!phone;

    if (!code || (!byEmail && !byPhone)) {
      return NextResponse.json(
        { success: false, error: 'Email or phone and code required' },
        { status: 400 }
      );
    }
    if (byEmail && byPhone) {
      return NextResponse.json(
        { success: false, error: 'Provide either email or phone, not both' },
        { status: 400 }
      );
    }

    const verification = await prisma.verification.findFirst({
      where: byEmail ? { email, code } : { phone, code },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    let user = byEmail
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: byEmail ? { email } : { phone },
      });
    }

    await prisma.verification.deleteMany({ where: { id: verification.id } });

    const token = await createSessionToken(user.id);
    const { used, limit } = await getUsageAndLimit(user);
    const identity = user.email ?? user.phone ?? '';
    const isPremium = isPremiumUser(user);

    const response = NextResponse.json({
      success: true,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      identity,
      isPremium,
      remaining: isPremium ? undefined : Math.max(0, limit - used),
    });
    // 仅当站点为 HTTPS 时设置 secure，否则 HTTP 访问时浏览器不会带 cookie（登录后仍提示未登录）
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const useSecureCookie = appUrl.startsWith('https://');
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (e) {
    console.error('verify error:', e);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}
