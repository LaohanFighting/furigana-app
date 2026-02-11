/**
 * POST /api/ai/explain-words
 * 请求体: { text: string } 原始日语文本
 * 响应: { success: boolean, explanation?: string, error?: string }
 * 使用重点单词筛选规则（含汉字、实词、排除助词/形式名词/基础词），对筛选出的全部重点词生成解释。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { explainJapaneseWordsFromList } from '@/lib/ai';
import { getTokensFromText } from '@/lib/furigana';
import { filterKeyWords } from '@/lib/word-filter';
import type { KuromojiToken } from '@/lib/word-filter';

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
    const rawTokens = await getTokensFromText(text);
    const tokens = Array.isArray(rawTokens) ? (rawTokens as KuromojiToken[]) : [];
    const words = filterKeyWords(tokens);
    if (words.length === 0) {
      return NextResponse.json({ success: true, explanation: '' });
    }
    const CHUNK_SIZE = 10;
    const parts: string[] = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      const chunk = words.slice(i, i + CHUNK_SIZE);
      const part = await explainJapaneseWordsFromList(chunk);
      if (part) parts.push(part);
    }
    const explanation = parts.join('\n\n');
    return NextResponse.json({ success: true, explanation });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
