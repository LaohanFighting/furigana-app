/**
 * POST /api/tts
 * 请求体: { text: string } 原始日语文本
 * 响应: 音频流 (Content-Type: audio/mpeg)，与假名注音逻辑独立，需登录且已审批
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, hasAccess } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { generateJapaneseAudio } from '@/lib/tts';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !hasAccess(user)) {
      return new NextResponse(null, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    const buffer = await generateJapaneseAudio(text);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
