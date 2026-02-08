/**
 * POST /api/payment/create
 * 请求体: { channel: 'alipay' | 'wechat' }
 * 创建支付订单，返回支付链接供前端跳转
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth-server';
import { createPaymentOrder } from '@/lib/payment';

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const channel = body.channel === 'wechat' ? 'wechat' : 'alipay';
  const result = await createPaymentOrder(userId, channel);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }
  return NextResponse.json({
    success: true,
    orderId: result.orderId,
    payUrl: result.payUrl,
    qrCode: result.qrCode,
  });
}
