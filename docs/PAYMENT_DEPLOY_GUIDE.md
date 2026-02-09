# 收费功能部署详细指南

## 📋 当前状态

✅ **已完成的功能**：
- 创建订单 API (`/api/payment/create`)
- 支付回调 API (`/api/payment/callback`)
- 升级页面 (`/dashboard/upgrade`)
- Premium 用户无限次使用
- 订单和用户状态管理（Prisma）

⚠️ **需要完成**：
- 选择并注册支付平台
- 配置环境变量
- 实现支付接口对接（签名/验签）
- 测试支付流程

---

## 第一部分：选择支付平台

### 方案对比

| 平台 | 优势 | 劣势 | 适用场景 |
|------|------|------|----------|
| **Stripe** | 国际通用、文档完善、支持多币种、API 简单 | 主要面向海外，国内用户可能不便 | 面向国际用户 |
| **虎皮椒** | 国内聚合（支付宝+微信）、接入简单 | 需要企业认证 | 面向国内用户 |
| **PayJS** | 国内聚合、个人可申请 | 费率可能较高 | 面向国内用户 |
| **易支付** | 国内聚合、个人可申请 | 需要选择可靠服务商 | 面向国内用户 |
| **支付宝/微信官方** | 官方、稳定 | 需要企业资质、接入复杂 | 企业用户 |

### 推荐方案

- **主要面向国内用户**：推荐 **PayJS** 或 **虎皮椒**（个人可申请）
- **主要面向国际用户**：推荐 **Stripe**

---

## 第二部分：以 PayJS 为例的完整接入流程

### 步骤 1：注册 PayJS 账号

1. 访问 [PayJS 官网](https://payjs.cn)
2. 注册账号（支持个人注册）
3. 完成实名认证
4. 创建应用，获取：
   - **商户号**（mchid）
   - **密钥**（key）

### 步骤 2：在 Vercel 配置环境变量

在 Vercel 项目 `furigana-app-hsl` → **Settings** → **Environment Variables** 中添加：

| 变量名 | 值 | 说明 | 示例 |
|--------|-----|------|------|
| `PAYMENT_API_URL` | PayJS 下单接口 | `https://payjs.cn/api/native` | PayJS 文档中的接口地址 |
| `PAYMENT_APPID` | 商户号 | PayJS 后台的 mchid | `1234567890` |
| `PAYMENT_KEY` | 密钥 | PayJS 后台的 key | `your-secret-key` |
| `PAYMENT_NOTIFY_URL` | 异步回调地址 | 支付成功后 PayJS POST 的地址 | `https://furigana-app-hsl.vercel.app/api/payment/callback` |
| `PAYMENT_RETURN_URL` | 支付完成跳转 | 用户支付完成后跳转的页面 | `https://furigana-app-hsl.vercel.app/dashboard?paid=1` |

**注意**：
- 所有变量都勾选 **Production**、**Preview**、**Development**
- `PAYMENT_NOTIFY_URL` 必须是公网可访问的 HTTPS 地址
- 保存后需要 **Redeploy** 才会生效

### 步骤 3：在 PayJS 后台配置回调

1. 登录 PayJS 后台
2. 进入 **应用设置** 或 **回调配置**
3. 设置 **异步通知地址**（Notify URL）为：
   ```
   https://furigana-app-hsl.vercel.app/api/payment/callback
   ```
4. 保存配置

### 步骤 4：实现 PayJS 接口对接

修改 `lib/payment.ts`，实现 PayJS 的签名和接口调用：

#### 4.1 安装依赖（如果需要）

PayJS 使用 MD5 签名，Node.js 内置 `crypto` 模块即可，无需额外安装。

#### 4.2 实现 PayJS 下单接口

在 `lib/payment.ts` 的 `createPaymentOrder` 函数中：

```typescript
import crypto from 'crypto';

// ... 其他代码 ...

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

  // PayJS 参数（根据 PayJS 文档调整）
  const params: Record<string, string> = {
    mchid: appId,
    total_fee: String(PREMIUM_AMOUNT_CENTS), // PayJS 使用分为单位
    out_trade_no: payOrderId,
    body: 'Furigana Premium',
    notify_url: notifyUrl,
    type: channel === 'alipay' ? 'alipay' : 'wechat',
  };

  // PayJS 签名：参数按 key 排序，拼接后加 key，MD5
  const signStr = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&') + `&key=${key}`;
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  params.sign = sign;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await res.json();
    
    if (data.return_code === 1) {
      // PayJS 返回支付链接
      return {
        success: true,
        orderId: order.id,
        payOrderId: order.orderId,
        payUrl: data.code_url || data.payurl, // PayJS 返回的支付链接
      };
    } else {
      return {
        success: false,
        error: data.msg || 'Payment request failed',
      };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Payment request failed',
    };
  }
}
```

#### 4.3 实现 PayJS 回调验签

在 `lib/payment.ts` 的 `handlePaymentNotify` 函数中：

```typescript
import crypto from 'crypto';

// ... 其他代码 ...

export async function handlePaymentNotify(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string | null
): Promise<{ success: boolean; body?: string }> {
  const key = process.env.PAYMENT_KEY;
  if (!key) {
    return { success: false, body: 'missing key' };
  }

  // PayJS 回调验签
  const sign = body.sign as string;
  if (!sign) {
    return { success: false, body: 'missing sign' };
  }

  // 构建验签字符串（排除 sign 字段）
  const signParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== 'sign' && v !== null && v !== undefined) {
      signParams[k] = String(v);
    }
  }

  const signStr = Object.keys(signParams)
    .sort()
    .map(k => `${k}=${signParams[k]}`)
    .join('&') + `&key=${key}`;
  const calculatedSign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

  if (calculatedSign !== sign.toUpperCase()) {
    console.error('[payment] Invalid signature:', { calculatedSign, receivedSign: sign });
    return { success: false, body: 'invalid sign' };
  }

  // PayJS 回调参数
  const outTradeNo = body.out_trade_no as string;
  const tradeStatus = body.status; // PayJS 使用 status 字段

  if (!outTradeNo) {
    return { success: false, body: 'missing out_trade_no' };
  }

  // PayJS: status === 1 表示支付成功
  if (Number(tradeStatus) !== 1) {
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
```

---

## 第三部分：以 Stripe 为例的完整接入流程

### 步骤 1：注册 Stripe 账号

1. 访问 [Stripe 官网](https://stripe.com)
2. 注册账号（支持全球注册）
3. 完成账号验证
4. 获取：
   - **Publishable Key**（前端用，可选）
   - **Secret Key**（后端用，用于签名）

### 步骤 2：安装 Stripe SDK

```bash
npm install stripe
```

### 步骤 3：配置环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PAYMENT_API_URL` | `https://api.stripe.com/v1/checkout/sessions` | Stripe Checkout API |
| `PAYMENT_APPID` | `pk_live_...` 或 `pk_test_...` | Stripe Publishable Key（可选） |
| `PAYMENT_KEY` | `sk_live_...` 或 `sk_test_...` | Stripe Secret Key |
| `PAYMENT_NOTIFY_URL` | `https://furigana-app-hsl.vercel.app/api/payment/callback` | Webhook URL |
| `PAYMENT_RETURN_URL` | `https://furigana-app-hsl.vercel.app/dashboard?paid=1` | Success URL |

### 步骤 4：实现 Stripe 接口对接

修改 `lib/payment.ts`：

```typescript
import Stripe from 'stripe';

// ... 其他代码 ...

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

  const key = process.env.PAYMENT_KEY;
  const notifyUrl = process.env.PAYMENT_NOTIFY_URL;
  const returnUrl = process.env.PAYMENT_RETURN_URL;

  if (!returnUrl || !notifyUrl || !key) {
    throw new Error('Missing payment environment variables');
  }

  const stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd', // 或 'cny' 人民币
          product_data: {
            name: 'Furigana Premium',
          },
          unit_amount: PREMIUM_AMOUNT_CENTS, // Stripe 使用分为单位
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl,
      metadata: {
        orderId: payOrderId,
        userId,
      },
    });

    return {
      success: true,
      orderId: order.id,
      payOrderId: order.orderId,
      payUrl: session.url || undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Payment request failed',
    };
  }
}

// Stripe Webhook 回调
export async function handlePaymentNotify(
  body: Record<string, unknown>,
  rawBody: string,
  signatureHeader: string | null
): Promise<{ success: boolean; body?: string }> {
  const key = process.env.PAYMENT_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Stripe Webhook Secret

  if (!key || !webhookSecret || !signatureHeader) {
    return { success: false, body: 'missing config' };
  }

  const stripe = new Stripe(key, { apiVersion: '2024-11-20.acacia' });

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        return { success: false, body: 'missing orderId' };
      }

      const order = await prisma.order.findUnique({
        where: { orderId },
        include: { user: true },
      });

      if (!order || order.status !== 'pending') {
        return { success: true, body: 'ok' };
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
    }

    return { success: true, body: 'success' };
  } catch (e) {
    console.error('[payment] Stripe webhook error:', e);
    return { success: false, body: 'webhook error' };
  }
}
```

### 步骤 5：配置 Stripe Webhook

1. 登录 Stripe Dashboard
2. 进入 **Developers** → **Webhooks**
3. 添加 Webhook endpoint：
   - URL: `https://furigana-app-hsl.vercel.app/api/payment/callback`
   - Events: 选择 `checkout.session.completed`
4. 复制 **Webhook Secret**，添加到 Vercel 环境变量 `STRIPE_WEBHOOK_SECRET`

---

## 第四部分：测试支付流程

### 测试清单

- [ ] 环境变量已配置并重新部署
- [ ] 支付平台后台已配置回调 URL
- [ ] 下单接口能返回支付链接
- [ ] 回调接口能正确验签并更新订单
- [ ] 用户支付后能自动升级为 Premium

### 测试步骤

1. **测试下单**
   - 登录网站
   - 访问 `/dashboard/upgrade`
   - 选择支付方式，点击"去支付"
   - 确认能跳转到支付页面或显示支付链接

2. **测试支付（使用测试金额）**
   - 在支付平台使用测试模式
   - 完成支付流程
   - 检查 Vercel Functions 日志，确认收到回调

3. **验证结果**
   - 检查数据库：`Order.status` 应为 `paid`
   - 检查数据库：`User.isPremium` 应为 `true`
   - 刷新页面，确认用户显示为 Premium

---

## 第五部分：金额和定价

### 当前定价

- **代码中**：`PREMIUM_AMOUNT_CENTS = 990`（9.9 元 = 990 分）

### 修改定价

在 `lib/payment.ts` 顶部修改：

```typescript
const PREMIUM_AMOUNT_CENTS = 1990; // 改为 19.9 元
```

或根据支付平台要求调整单位（元或分）。

---

## 第六部分：常见问题

### ❌ 支付链接无法跳转

**原因**：下单接口返回的 `payUrl` 为空或格式错误

**处理**：
- 检查支付平台 API 返回格式
- 确认 `payUrl` 字段名是否正确（可能是 `url`、`payurl`、`code_url` 等）
- 查看 Vercel Functions 日志

### ❌ 回调验签失败

**原因**：签名算法或参数不正确

**处理**：
- 确认签名算法（MD5、HMAC-SHA256 等）
- 确认参数排序规则
- 确认密钥是否正确
- 查看回调日志，对比计算出的签名和平台传来的签名

### ❌ 用户支付后未升级

**原因**：回调未正确处理或订单状态未更新

**处理**：
- 检查 Vercel Functions 日志（`/api/payment/callback`）
- 确认回调验签是否通过
- 确认订单状态字段是否正确（`status`、`trade_status` 等）
- 检查数据库事务是否成功执行

---

## 📝 总结

### 部署流程：

1. ✅ **选择支付平台**（PayJS / Stripe / 其他）
2. ✅ **注册并获取凭证**（APPID、Key）
3. ✅ **配置 Vercel 环境变量**（5 个变量）
4. ✅ **在支付平台配置回调 URL**
5. ✅ **实现接口对接**（修改 `lib/payment.ts`）
6. ✅ **测试支付流程**
7. ✅ **正式上线**

### 关键文件：

- `lib/payment.ts` - 支付逻辑（需要按平台文档实现）
- `app/api/payment/create/route.ts` - 创建订单 API
- `app/api/payment/callback/route.ts` - 支付回调 API
- `app/dashboard/upgrade/page.tsx` - 升级页面

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看支付平台官方文档
2. 检查 Vercel Functions 日志
3. 使用支付平台的测试模式进行调试
4. 联系支付平台客服
