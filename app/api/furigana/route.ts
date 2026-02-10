/**
 * POST /api/furigana
 * 请求体: { text: string }
 * 响应: { html: string, success: boolean, error?: string, remaining?: number }
 * 仅对汉字标注平假名，输出标准 <ruby><rt> HTML；需登录，免费用户有总共次数限制（不重置）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { textToFuriganaHtml } from '@/lib/furigana';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

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

    if (!hasAccess(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access not approved. Please request access and wait for approval.',
          html: '',
        },
        { status: 403 }
      );
    }

    const html = await textToFuriganaHtml(text);

    return NextResponse.json({
      success: true,
      html,
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
