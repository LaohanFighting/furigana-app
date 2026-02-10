/**
 * 虎皮椒（XunhuPay）支付接口实现
 * 支持微信支付和支付宝支付
 * 文档：https://www.xunhupay.com/doc/api/pay.html
 */

import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';

const PREMIUM_AMOUNT_CENTS = 990; // 9.9 元 = 990 分

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;       // 我方订单 id（Prisma Order.id）
  payOrderId?: string;    // 支付平台订单号，用于回调
  payUrl?: string;        // 前端跳转支付的 URL（支付宝/微信）
  qrCode?: string;        // 支付二维码链接
  error?: string;
}

/**
 * 虎皮椒签名算法
 * 1. 将所有非空参数按照参数名ASCII码从小到大排序（字典序）
 * 2. 使用URL键值对格式拼接成字符串（key1=value1&key2=value2...）
 * 3. 在字符串末尾拼接APPSECRET（秘钥）
 * 4. 对结果进行MD5运算，得到32位小写hash值
 * 
 * 规则：
 * - 参数值为空不参与签名
 * - 参数名区分大小写
 * - hash参数本身不参与签名
 */
function signXunhuPay(params: Record<string, string>, secret: string): string {
  // 过滤空值和 hash 字段，然后排序
  const filteredParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'hash' && v !== null && v !== undefined && v !== '') {
      filteredParams[k] = String(v);
    }
  }

  // 按 key 排序
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 拼接成 key=value&key=value 格式
  const signStr = sortedKeys
    .map(k => `${k}=${filteredParams[k]}`)
    .join('&') + secret;

  // MD5 加密，32位小写
  return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * 创建支付订单（虎皮椒）
 * 1. 在 DB 创建 Order 记录 status=pending
 * 2. 调用虎皮椒 API 生成支付链接
 * 3. 返回支付链接给前端
 */
export async function createPaymentOrder(
  userId: string,
  channel: 'alipay' | 'wechat'
): Promise<CreateOrderResult> {
  const apiUrl = process.env.PAYMENT_API_URL || 'https://api.xunhupay.com/payment/do.html';
  const appid = process.env.PAYMENT_APPID; // 虎皮椒使用 appid（如果使用中转服务器，这个不需要）
  const secret = process.env.PAYMENT_KEY; // 虎皮椒使用 APPSECRET（如果使用中转服务器，这个不需要）
  const notifyUrl = process.env.PAYMENT_NOTIFY_URL;
  const returnUrl = process.env.PAYMENT_RETURN_URL;

  if (!returnUrl || !notifyUrl) {
    return {
      success: false,
      error: 'Missing PAYMENT_NOTIFY_URL or PAYMENT_RETURN_URL',
    };
  }

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

  // 判断是否使用中转服务器（如果 PAYMENT_API_URL 包含 /xunhu/create，说明是中转服务器）
  const isProxyServer = apiUrl.includes('/xunhu/create') || apiUrl.includes('/xunhu');

  if (isProxyServer) {
    // 使用中转服务器：发送 JSON 格式，不需要签名（中转服务器会处理）
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_order_id: payOrderId,
          total_fee: String(PREMIUM_AMOUNT_CENTS / 100), // 元为单位，例如 "9.9"
          title: 'Furigana Premium - 每月无限次使用',
          notify_url: notifyUrl,
          return_url: returnUrl,
          channel,
        }),
      });

      const data = await res.json();

      if (data.success && data.payUrl) {
        return {
          success: true,
          orderId: order.id,
          payOrderId: order.orderId,
          payUrl: data.payUrl,
          qrCode: data.payUrl,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Proxy server returned error',
        };
      }
    } catch (e) {
      console.error('[payment] Proxy server error:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Proxy server request failed',
      };
    }
  } else {
    // 直接调用虎皮椒（旧方式，如果中转服务器不可用时可以回退）
    if (!appid || !secret) {
      return {
        error: 'Payment not configured; set PAYMENT_APPID and PAYMENT_KEY, or use proxy server',
        success: false,
      };
    }

    // 虎皮椒支付参数
    const params: Record<string, string> = {
      version: '1.1',
      trade_order_id: payOrderId,
      total_fee: String(PREMIUM_AMOUNT_CENTS / 100), // 虎皮椒使用元为单位
      title: 'Furigana Premium - 每月无限次使用',
      notify_url: notifyUrl,
      return_url: returnUrl,
      type: channel === 'alipay' ? 'alipay' : 'wechat', // alipay 或 wechat
      appid: appid,
    };

    // 计算签名
    const hash = signXunhuPay(params, secret);
    params.hash = hash;

    try {
      // 虎皮椒使用 POST 方式，参数可以是 form-data 或 JSON
      // 根据文档，使用 form-data 格式
      const formData = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        formData.append(k, v);
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const data = await res.json();

      // 虎皮椒返回格式：{ errcode: 0, errmsg: "success", url: "...", hash: "..." }
      if (data.errcode === 0 && data.url) {
        return {
          success: true,
          orderId: order.id,
          payOrderId: order.orderId,
          payUrl: data.url, // 支付链接
          qrCode: data.url, // 虎皮椒返回的 url 就是支付链接
        };
      } else {
        return {
          success: false,
          error: data.errmsg || 'Payment request failed',
        };
      }
    } catch (e) {
      console.error('[payment] XunhuPay create order error:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Payment request failed',
      };
    }
  }
}

/**
 * 虎皮椒支付回调处理
 * 1. 验签
 * 2. 根据 trade_order_id 找到 Order，若 status 仍为 pending 则更新为 paid
 * 3. 将对应用户 isPremium 设为 true
 * 4. 返回 success 字符串给虎皮椒
 */
export async function handlePaymentNotify(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string | null
): Promise<{ success: boolean; body?: string }> {
  const secret = process.env.PAYMENT_KEY;
  if (!secret) {
    console.error('[payment] Missing PAYMENT_KEY');
    return { success: false, body: 'missing secret' };
  }

  // 虎皮椒回调参数
  const hash = body.hash as string;
  if (!hash) {
    console.error('[payment] Missing hash in callback');
    return { success: false, body: 'missing hash' };
  }

  // 虎皮椒验签：排除 hash 字段，其他参数排序后签名
  const signParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== 'hash' && v !== null && v !== undefined && v !== '') {
      signParams[k] = String(v);
    }
  }

  const calculatedHash = signXunhuPay(signParams, secret);

  if (calculatedHash !== hash.toLowerCase()) {
    console.error('[payment] Invalid signature:', {
      calculatedHash,
      receivedHash: hash,
      params: signParams,
    });
    return { success: false, body: 'invalid hash' };
  }

  // 虎皮椒回调参数
  const tradeOrderId = body.trade_order_id as string;
  const status = body.status as string;

  if (!tradeOrderId) {
    return { success: false, body: 'missing trade_order_id' };
  }

  // 虎皮椒: status === 'OD' 表示支付成功（Order Done）
  if (status !== 'OD') {
    console.log('[payment] Payment not successful, status:', status);
    return { success: false, body: 'not paid' };
  }

  const order = await prisma.order.findUnique({
    where: { orderId: tradeOrderId },
    include: { user: true },
  });

  if (!order) {
    console.error('[payment] Order not found:', tradeOrderId);
    return { success: false, body: 'order not found' };
  }

  if (order.status !== 'pending') {
    // 已处理过，返回 success 避免虎皮椒重复通知
    console.log('[payment] Order already processed:', tradeOrderId);
    return { success: true, body: 'success' };
  }

  // 更新订单状态和用户 Premium 状态（每月订阅）
  try {
    const now = new Date();
    // 每月订阅：当前时间 + 30 天
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid' },
      }),
      prisma.user.update({
        where: { id: order.userId },
        data: { 
          isPremium: true,
          premiumExpiresAt: expiresAt,
        },
      }),
    ]);

    console.log('[payment] Order paid and user upgraded:', {
      orderId: order.id,
      userId: order.userId,
    });

    return { success: true, body: 'success' };
  } catch (e) {
    console.error('[payment] Transaction failed:', e);
    return { success: false, body: 'transaction failed' };
  }
}
