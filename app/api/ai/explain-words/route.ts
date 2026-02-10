/**
 * POST /api/ai/explain-words
 * 请求体: { text: string }
 * 响应: { success: boolean, explanation?: string, error?: string }
 * 对输入日文中有假名注音的单词进行解释，输出结构化纯文本。与假名注音逻辑独立，需登录且已审批。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { explainJapaneseWords } from '@/lib/ai';

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
    const explanation = await explainJapaneseWords(text);
    return NextResponse.json({ success: true, explanation });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
