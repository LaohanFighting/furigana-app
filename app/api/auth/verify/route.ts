/**
 * POST /api/auth/verify
 * 请求体: { email: string, code: string }
 * 验证通过则创建/登录用户，设置 session cookie，返回用户信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth-server';
import { getUsageAndLimit } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: 'Email and code required' },
        { status: 400 }
      );
    }

    const verification = await prisma.verification.findFirst({
      where: { email, code },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email },
      });
    }

    await prisma.verification.deleteMany({ where: { id: verification.id } });

    const token = await createSessionToken(user.id);
    const { used, limit } = await getUsageAndLimit(user);

    const response = NextResponse.json({
      success: true,
      email: user.email,
      isPremium: user.isPremium,
      remaining: user.isPremium ? undefined : Math.max(0, limit - used),
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
