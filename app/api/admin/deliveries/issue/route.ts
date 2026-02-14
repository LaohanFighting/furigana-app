/**
 * POST /api/admin/deliveries/issue - 管理员：为某条领取请求发放一个激活码
 * body: { requestId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
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

    // 显式排除已被任意 DeliveryRequest 占用的激活码，避免 P2002
    const assignedIds = await prisma.deliveryRequest
      .findMany({
        where: { activationCodeId: { not: null } },
        select: { activationCodeId: true },
      })
      .then((rows) => rows.map((r) => r.activationCodeId).filter((id): id is string => id != null));
    const available = await prisma.activationCode.findFirst({
      where: { used: false, id: { notIn: assignedIds } },
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

    const raw = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const baseUrl = raw.replace(/\/$/, '').replace(/^["']|["']$/g, '').trim();
    return NextResponse.json({
      success: true,
      activationCode: available.code,
      activateUrl: baseUrl ? `${baseUrl}/activate` : '/activate',
    });
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error('[api/admin/deliveries/issue]', err?.message ?? e, err);
    // 常见原因：未执行迁移或数据库不可用
    const hint =
      err?.code === 'P2021' || err?.message?.includes('does not exist')
        ? '数据库表未就绪，请在服务器执行: npx prisma migrate deploy'
        : err?.code === 'P2002'
          ? '该激活码已被发放，请重新生成新激活码后再试'
          : err?.message && err.message.length < 120
            ? err.message
            : 'Server error（请查看服务器日志: docker logs nihongo-go）';
    return NextResponse.json({ success: false, error: hint }, { status: 500 });
  }
}
