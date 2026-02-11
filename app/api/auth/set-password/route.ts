/**
 * POST /api/auth/set-password
 * 设置密码（激活码用户首次设置，或已登录用户修改密码）
 * 请求体: { password: string, userId?: string }
 * 如果提供 userId（激活流程），直接设置；否则从 session 获取 userId
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId : null;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 确定 userId：优先使用传入的，否则从 session 获取
    let finalUserId: string | null = userId;
    if (!finalUserId) {
      finalUserId = await getUserIdFromRequest(request);
    }

    if (!finalUserId) {
      return NextResponse.json(
        { success: false, error: '未登录或用户ID无效' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: finalUserId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 更新密码
    await prisma.user.update({
      where: { id: finalUserId },
      data: { password: hashedPassword },
    });

    // 如果是激活流程（提供了 userId），设置 session 并返回 cookie
    if (userId && userId === finalUserId) {
      const { createSessionToken, COOKIE_NAME } = await import('@/lib/auth-server');
      const token = await createSessionToken(finalUserId);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const useSecureCookie = appUrl.startsWith('https://');

      const response = NextResponse.json({
        success: true,
        message: '密码设置成功！',
      });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: useSecureCookie,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({
      success: true,
      message: '密码设置成功！',
    });
  } catch (e) {
    console.error('[api/auth/set-password] error:', e);
    const error = e instanceof Error ? e.message : '设置密码失败';
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
