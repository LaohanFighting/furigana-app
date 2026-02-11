/**
 * POST /api/ai/translate
 * 请求体: { text: string }
 * 响应: { success: boolean, translation?: string, error?: string }
 * 将日语全文翻译为中文纯文本。与假名注音逻辑独立，需登录且已审批。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { translateJapaneseToChinese } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !hasAccess(user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }
    const translation = await translateJapaneseToChinese(text);
    return NextResponse.json({ success: true, translation });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    console.error('[api/ai/translate]', message, e);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
