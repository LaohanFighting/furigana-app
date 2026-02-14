/**
 * GET /api/admin/deliveries - 管理员：待发放/已发放列表
 */

import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const list = await prisma.deliveryRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        activationCode: { select: { code: true } },
      },
    });

    return NextResponse.json({
      success: true,
      list: list.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        contactSuffix: r.contactSuffix,
        contactFull: r.contactFull,
        status: r.status,
        activationCode: r.activationCode?.code ?? null,
        createdAt: r.createdAt,
        issuedAt: r.issuedAt,
      })),
    });
  } catch (e) {
    console.error('[api/admin/deliveries]', e);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
