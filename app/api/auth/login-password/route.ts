/**
 * POST /api/auth/login-password
 * 密码登录
 * 请求体: { email?: string, phone?: string, password: string }
 * 响应: { success: boolean, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSessionToken, COOKIE_NAME, hasAccess } from '@/lib/auth-server';
import { verifyPassword } from '@/lib/password';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');
    const password = typeof body.password === 'string' ? body.password : '';

    if (!password) {
      return NextResponse.json(
        { success: false, error: '密码不能为空' },
        { status: 400 }
      );
    }

    const byEmail = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const byPhone = !!phone;

    if (!byEmail && !byPhone) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱或手机号' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = byEmail
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // 检查是否有密码
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: '该账号未设置密码，请使用验证码登录' },
        { status: 400 }
      );
    }

    // 验证密码
    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    // 检查权限
    if (!hasAccess(user)) {
      return NextResponse.json(
        { success: false, error: '账号未激活，请联系管理员' },
        { status: 403 }
      );
    }

    // 创建会话并设置 cookie
    const token = await createSessionToken(user.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const useSecureCookie = appUrl.startsWith('https://');

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: useSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (e) {
    console.error('[api/auth/login-password] error:', e);
    const error = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
