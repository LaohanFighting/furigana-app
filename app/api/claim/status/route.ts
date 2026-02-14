/**
 * GET /api/claim/status?orderId=xxx&suffix=xxxx
 * 用户查询是否已发放（无需登录）
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId')?.trim() ?? '';
    const suffix = searchParams.get('suffix')?.replace(/\D/g, '').slice(-4) ?? '';

    if (!orderId || suffix.length !== 4) {
      return NextResponse.json(
        { success: false, error: '请提供订单号和手机号后4位' },
        { status: 400 }
      );
    }

    const req = await prisma.deliveryRequest.findFirst({
      where: { orderId, contactSuffix: suffix },
      orderBy: { createdAt: 'desc' },
      include: { activationCode: true },
    });

    if (!req) {
      return NextResponse.json(
        { success: false, error: '未找到该订单记录，请先提交领取申请' },
        { status: 404 }
      );
    }

    if (req.status === 'issued' && req.activationCode) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
      return NextResponse.json({
        success: true,
        status: 'issued',
        activationCode: req.activationCode.code,
        activateUrl: baseUrl ? `${baseUrl}/activate` : '/activate',
      });
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: '尚未发放，请稍后再查',
    });
  } catch (e) {
    console.error('[api/claim/status]', e);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
