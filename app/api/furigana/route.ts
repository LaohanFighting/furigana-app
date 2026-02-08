/**
 * POST /api/furigana
 * 请求体: { text: string }
 * 响应: { html: string, success: boolean, error?: string, remaining?: number }
 * 仅对汉字标注平假名，输出标准 <ruby><rt> HTML；需登录，免费用户有每日次数限制。
 */

import { NextRequest, NextResponse } from 'next/server';
import { textToFuriganaHtml } from '@/lib/furigana';
import { getUserIdFromRequest, getUsageAndLimit } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

const FREE_DAILY_LIMIT = 999999; /* 测试阶段取消限制，上线前改回 5 */

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', html: '' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text is required', html: '' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', html: '' },
        { status: 401 }
      );
    }

    const { used, limit, resetAt } = await getUsageAndLimit(user);
    if (!user.isPremium && used >= limit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Daily limit reached',
          remaining: 0,
          resetAt: resetAt?.toISOString(),
          html: '',
        },
        { status: 429 }
      );
    }

    const html = await textToFuriganaHtml(text);

    if (!user.isPremium) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (!user.dailyResetAt || user.dailyResetAt < todayStart) {
        await prisma.user.update({
          where: { id: userId },
          data: { dailyUsed: 1, dailyResetAt: todayStart },
        });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { dailyUsed: { increment: 1 } },
        });
      }
    }

    const nextRemaining = user.isPremium ? undefined : Math.max(0, limit - used - 1);

    return NextResponse.json({
      success: true,
      html,
      remaining: nextRemaining,
    });
  } catch (e) {
    console.error('/api/furigana error:', e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'Server error',
        html: '',
      },
      { status: 500 }
    );
  }
}
