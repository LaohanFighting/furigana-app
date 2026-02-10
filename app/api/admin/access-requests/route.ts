/**
 * GET /api/admin/access-requests
 * 管理员：获取待审批列表（accessStatus === 'pending'）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminUser } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const list = await prisma.user.findMany({
    where: { accessStatus: 'pending' },
    select: {
      id: true,
      email: true,
      phone: true,
      accessRequestedAt: true,
      createdAt: true,
    },
    orderBy: { accessRequestedAt: 'asc' },
  });

  return NextResponse.json({
    success: true,
    list: list.map((u) => ({
      id: u.id,
      identity: u.email ?? u.phone ?? '',
      email: u.email ?? undefined,
      phone: u.phone ?? undefined,
      accessRequestedAt: u.accessRequestedAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
