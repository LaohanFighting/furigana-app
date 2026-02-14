/**
 * POST /api/admin/deliveries/issue - 管理员：为某条领取请求发放一个激活码
 * body: { requestId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!requestId) {
      return NextResponse.json({ success: false, error: '缺少 requestId' }, { status: 400 });
    }

    const delivery = await prisma.deliveryRequest.findUnique({
      where: { id: requestId },
      include: { activationCode: true },
    });
    if (!delivery) {
      return NextResponse.json({ success: false, error: '未找到该领取请求' }, { status: 404 });
    }
    if (delivery.status === 'issued' && delivery.activationCodeId) {
      return NextResponse.json({
        success: true,
        alreadyIssued: true,
        activationCode: delivery.activationCode?.code ?? null,
      });
    }

    const available = await prisma.activationCode.findFirst({
      where: { used: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!available) {
      return NextResponse.json(
        { success: false, error: '暂无可用激活码，请先生成：docker exec -it nihongo-go node scripts/generate-activation-code.js 数量 0' },
        { status: 400 }
      );
    }

    await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'issued',
        activationCodeId: available.id,
        issuedAt: new Date(),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    return NextResponse.json({
      success: true,
      activationCode: available.code,
      activateUrl: baseUrl ? `${baseUrl}/activate` : '/activate',
    });
  } catch (e) {
    console.error('[api/admin/deliveries/issue]', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
