/**
 * POST /api/claim - 用户提交领取请求（订单号 + 手机后4位）
 * 无需登录，用于小红书等渠道付款后自助填写
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const contactSuffix = typeof body.contactSuffix === 'string' ? body.contactSuffix.replace(/\D/g, '').slice(-4) : '';

    if (!orderId || orderId.length < 2) {
      return NextResponse.json(
        { success: false, error: '请填写订单号' },
        { status: 400 }
      );
    }
    if (!contactSuffix || contactSuffix.length !== 4) {
      return NextResponse.json(
        { success: false, error: '请填写手机号后4位（4位数字）' },
        { status: 400 }
      );
    }

    const existing = await prisma.deliveryRequest.findFirst({
      where: { orderId, contactSuffix },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      if (existing.status === 'issued' && existing.activationCodeId) {
        const code = await prisma.activationCode.findUnique({
          where: { id: existing.activationCodeId },
        });
        return NextResponse.json({
          success: true,
          status: 'issued',
          activationCode: code?.code ?? null,
          activateUrl: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/activate`
            : '/activate',
        });
      }
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: '您已提交过，请等待发放后刷新查询',
      });
    }

    await prisma.deliveryRequest.create({
      data: {
        orderId,
        contactSuffix,
        contactFull: typeof body.contactFull === 'string' ? body.contactFull.trim().slice(0, 100) : null,
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: '提交成功，请等待发放（约5-15分钟）。发放后可在此页用同一订单号+手机后4位查询激活码。',
    });
  } catch (e) {
    console.error('[api/claim]', e);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
