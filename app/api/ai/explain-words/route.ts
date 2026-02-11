/**
 * POST /api/ai/explain-words
 * 请求体: { words: Array<{ word: string, reading: string }> }（由前端从假名 HTML 解析得到）
 * 响应: { success: boolean, explanation?: string, error?: string }
 * 对列表中的每一个单词解释，例句为新造句，例句翻译标签为「中文翻译」。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { explainJapaneseWordsFromList } from '@/lib/ai';

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
    const raw = body.words;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { success: false, error: 'words array is required' },
        { status: 400 }
      );
    }
    const words = raw
      .map((w: unknown) => {
        if (w && typeof w === 'object' && 'word' in w && 'reading' in w) {
          return {
            word: String((w as { word: unknown }).word),
            reading: String((w as { reading: unknown }).reading),
          };
        }
        return null;
      })
      .filter((w): w is { word: string; reading: string } => w !== null);
    if (words.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid words required' },
        { status: 400 }
      );
    }
    const explanation = await explainJapaneseWordsFromList(words);
    return NextResponse.json({ success: true, explanation });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
