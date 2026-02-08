/**
 * 支付接口设计示例（支持支付宝/微信，中国聚合支付）
 * 以虎皮椒 / PayJS / 易支付 等聚合平台为例，不含真实密钥
 */

import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';

const PREMIUM_AMOUNT_CENTS = 990; // 9.9 元 = 990 分（若平台按元则改为 9.9）

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;       // 我方订单 id（Prisma Order.id）
  payOrderId?: string;    // 支付平台订单号，用于回调
  payUrl?: string;        // 前端跳转支付的 URL（支付宝/微信）
  qrCode?: string;        // 部分平台返回二维码 content
  error?: string;
}

/**
 * 创建支付订单
 * 1. 在 DB 创建 Order 记录 status=pending
 * 2. 调用聚合平台 API 生成支付链接/二维码
 * 3. 返回 payUrl 给前端跳转
 */
export async function createPaymentOrder(
  userId: string,
  channel: 'alipay' | 'wechat'
): Promise<CreateOrderResult> {
  const payOrderId = `F${Date.now()}${nanoid(8)}`;
  const order = await prisma.order.create({
    data: {
      orderId: payOrderId,
      userId,
      amount: PREMIUM_AMOUNT_CENTS,
      status: 'pending',
      channel,
    },
  });

  const apiUrl = process.env.PAYMENT_API_URL;
  const appId = process.env.PAYMENT_APPID;
  const key = process.env.PAYMENT_KEY;
  const notifyUrl = process.env.PAYMENT_NOTIFY_URL;
  const returnUrl = process.env.PAYMENT_RETURN_URL;

  if (!returnUrl || !notifyUrl) {
    throw new Error('Missing payment callback environment variables');
  }

  if (!apiUrl || !appId || !key) {
    return {
      success: true,
      orderId: order.id,
      payOrderId: order.orderId,
      payUrl: undefined,
      error: 'Payment not configured; use env PAYMENT_*',
    };
  }

  // 示例：虎皮椒风格参数（具体以所选平台文档为准）
  const params: Record<string, string> = {
    out_trade_no: payOrderId,
    total_fee: String(PREMIUM_AMOUNT_CENTS / 100), // 元
    type: channel === 'alipay' ? 'alipay' : 'wechat',
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: 'Furigana Premium',
  };
  // 签名示例（MD5(appId+key+params) 等，按平台文档）
  // params.sign = signParams(params, key);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, appid: appId }),
    });
    const data = await res.json();
    const payUrl = data.url || data.pay_url || data.code_url;
    return {
      success: true,
      orderId: order.id,
      payOrderId: order.orderId,
      payUrl: payUrl || undefined,
      qrCode: data.qr_code || undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Payment request failed',
    };
  }
}

/**
 * 支付回调（Notify）：支付平台 POST 到 /api/payment/callback
 * 1. 验签
 * 2. 根据 out_trade_no 找到 Order，若 status 仍为 pending 则更新为 paid
 * 3. 将对应用户 isPremium 设为 true
 * 4. 返回 success 字符串给平台
 */
export async function handlePaymentNotify(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string | null
): Promise<{ success: boolean; body?: string }> {
  // 验签逻辑（示例，按平台文档实现）
  // if (!verifySign(rawBody, signatureHeader)) return { success: false, body: 'invalid sign' };

  const outTradeNo = body.out_trade_no || body.order_id;
  const tradeStatus = body.trade_status ?? body.status;
  if (typeof outTradeNo !== 'string') {
    return { success: false, body: 'missing out_trade_no' };
  }
  if (String(tradeStatus).toLowerCase() !== 'success' && String(tradeStatus) !== 'paid') {
    return { success: false, body: 'not paid' };
  }

  const order = await prisma.order.findUnique({
    where: { orderId: outTradeNo },
    include: { user: true },
  });
  if (!order || order.status !== 'pending') {
    return { success: true, body: 'ok' }; // 已处理过也返回 ok
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'paid' },
    }),
    prisma.user.update({
      where: { id: order.userId },
      data: { isPremium: true },
    }),
  ]);

  return { success: true, body: 'success' };
}
