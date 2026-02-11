/**
 * POST /api/activate
 * 使用激活码激活账号
 * 请求体: { code: string, email?: string, phone?: string }
 * 响应: { success: boolean, message?: string, userId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth-server';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '激活码不能为空' },
        { status: 400 }
      );
    }

    // 查找激活码
    const activationCode = await prisma.activationCode.findUnique({
      where: { code },
    });

    if (!activationCode) {
      return NextResponse.json(
        { success: false, error: '激活码无效' },
        { status: 400 }
      );
    }

    if (activationCode.used) {
      return NextResponse.json(
        { success: false, error: '激活码已被使用' },
        { status: 400 }
      );
    }

    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: '激活码已过期' },
        { status: 400 }
      );
    }

    // 确定邮箱/手机号（优先使用用户输入的，其次使用激活码预填的）
    const finalEmail = email || activationCode.email || '';
    const finalPhone = phone || activationCode.phone || '';

    if (!finalEmail && !finalPhone) {
      return NextResponse.json(
        { success: false, error: '请提供邮箱或手机号' },
        { status: 400 }
      );
    }

    // 检查邮箱/手机号格式
    const byEmail = !!finalEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalEmail);
    const byPhone = !!finalPhone;

    if (!byEmail && !byPhone) {
      return NextResponse.json(
        { success: false, error: '邮箱或手机号格式不正确' },
        { status: 400 }
      );
    }

    // 查找或创建用户
    let user = byEmail
      ? await prisma.user.findUnique({ where: { email: finalEmail } })
      : await prisma.user.findUnique({ where: { phone: finalPhone } });

    if (!user) {
      // 创建新用户，直接设为 approved
      user = await prisma.user.create({
        data: {
          email: byEmail ? finalEmail : null,
          phone: byPhone ? finalPhone : null,
          accessStatus: 'approved',
          accessApprovedAt: new Date(),
        },
      });
    } else {
      // 已有用户，更新为 approved
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accessStatus: 'approved',
          accessApprovedAt: new Date(),
        },
      });
    }

    // 标记激活码为已使用
    await prisma.activationCode.update({
      where: { id: activationCode.id },
      data: {
        used: true,
        usedAt: new Date(),
        userId: user.id,
      },
    });

    // 激活成功，但需要设置密码后才能登录
    // 返回需要设置密码的状态
    return NextResponse.json({
      success: true,
      message: '激活成功！请设置密码',
      userId: user.id,
      needsPassword: !user.password, // 如果已有密码则不需要设置
    });
  } catch (e) {
    console.error('[api/activate] error:', e);
    const error = e instanceof Error ? e.message : '激活失败';
    return NextResponse.json(
      { success: false, error },
      { status: 500 }
    );
  }
}
