/**
 * POST /api/admin/access-requests/reject
 * 管理员：拒绝某用户的使用权限
 * Body: { userId: string, reason?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, isAdminUser } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const admin = await getSessionUser(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdminUser(admin)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }
  if (user.accessStatus !== 'pending') {
    return NextResponse.json({ success: false, error: 'User is not pending' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessStatus: 'rejected',
      accessApprovedAt: new Date(),
      accessRejectReason: reason ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Rejected',
    userId,
  });
}
