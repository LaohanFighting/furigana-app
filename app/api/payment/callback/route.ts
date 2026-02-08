/**
 * POST /api/payment/callback
 * 支付平台异步回调（支付宝/微信/聚合平台通知）
 * 验签后更新订单状态并将用户设为 premium
 */

import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentNotify } from '@/lib/payment';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = Object.fromEntries(new URLSearchParams(rawBody));
  }
  const signature = request.headers.get('x-signature') ?? request.headers.get('sign');
  const result = await handlePaymentNotify(body, rawBody, signature);
  if (!result.success) {
    return new NextResponse(result.body ?? 'fail', { status: 400 });
  }
  return new NextResponse(result.body ?? 'success', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
