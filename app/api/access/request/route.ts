/**
 * POST /api/access/request
 * 用户申请使用权限，将 accessStatus 设为 pending
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
  }

  // 已通过或已拒绝不允许重复申请（可改为允许被拒后再次申请，这里简单处理）
  if (user.accessStatus === 'approved') {
    return NextResponse.json({ success: true, message: 'Already approved', accessStatus: 'approved' });
  }
  if (user.accessStatus === 'pending') {
    return NextResponse.json({ success: true, message: 'Already requested', accessStatus: 'pending' });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessStatus: 'pending',
      accessRequestedAt: new Date(),
      accessApprovedAt: null,
      accessRejectReason: null,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Access requested. Please wait for approval.',
    accessStatus: 'pending',
  });
}
