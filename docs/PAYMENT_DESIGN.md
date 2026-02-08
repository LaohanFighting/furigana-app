# 支付接口设计示例（不含真实密钥）

支持支付宝、微信支付，通过中国聚合支付平台（如虎皮椒、PayJS、易支付）对接。以下为接口设计与示例代码说明，**不包含真实密钥**。

## 1. 环境变量（示例）

```env
# 支付 API 根地址（示例，以实际平台为准）
PAYMENT_API_URL=https://api.xorpay.com/pay
PAYMENT_APPID=your_app_id
PAYMENT_KEY=your_secret_key
# 异步通知地址（支付成功后平台 POST 到此 URL）
PAYMENT_NOTIFY_URL=https://yourdomain.com/api/payment/callback
# 用户支付完成后跳转
PAYMENT_RETURN_URL=https://yourdomain.com/dashboard?paid=1
```

## 2. 创建订单流程

1. 前端：用户选择「支付宝」或「微信」后，请求 `POST /api/payment/create`，body `{ "channel": "alipay" | "wechat" }`。
2. 后端：
   - 校验登录态；
   - 在 DB 创建 `Order`（orderId、userId、amount、status=pending、channel）；
   - 调用聚合平台「下单」接口，传入：商户订单号、金额、支付类型、notify_url、return_url 等；
   - 平台返回支付链接（或二维码 URL）。
3. 响应示例：

```json
{
  "success": true,
  "orderId": "clxxx...",
  "payUrl": "https://pay.xxx.com/xxx?order=...",
  "qrCode": null
}
```

4. 前端：若存在 `payUrl` 则 `window.location.href = payUrl` 跳转支付；若仅返回 `qrCode` 可展示二维码供扫码。

## 3. 支付回调（Notify）

- 支付平台在用户支付成功后会 **POST** 到 `PAYMENT_NOTIFY_URL`。
- 请求体一般为 JSON 或 form，常见字段示例（以实际文档为准）：
  - `out_trade_no`：商户订单号（即我方 Order.orderId）
  - `trade_status` / `status`：支付状态，如 `success`、`paid`
  - 可能带 `sign` 或 header 中的签名，用于验签。

后端处理逻辑（参见 `lib/payment.ts` 中 `handlePaymentNotify`）：

1. **验签**：使用 `PAYMENT_KEY` 按平台文档计算签名，与传入的 sign 比对，防止伪造。
2. 解析 `out_trade_no`、`trade_status`；仅当状态为「已支付」时继续。
3. 根据 `out_trade_no` 查询 Order，若 `status === 'pending'` 则：
   - 更新 Order 为 `status = 'paid'`；
   - 更新对应用户 `isPremium = true`。
4. 返回 **纯文本** `success` 或平台要求的字符串，状态码 200。

## 4. 验签示例（伪代码，以平台文档为准）

```ts
// 示例：部分平台使用 MD5(appId + key + 参数排序拼接)
function verifySign(params: Record<string, string>, key: string, sign: string): boolean {
  const sorted = Object.keys(params).filter(k => k !== 'sign').sort();
  const str = sorted.map(k => params[k]).join('') + key;
  const computed = md5(str);
  return computed === sign;
}
```

回调处理时使用 **原始 body** 参与验签，避免 JSON 序列化导致字段顺序变化。

## 5. 订单表与用户状态

- **orders**：id, orderId（平台商户订单号）, userId, amount, status（pending/paid/failed/refunded）, channel（alipay/wechat）, createdAt。
- 仅当回调确认支付成功后将 `Order.status` 置为 `paid`，并将 `User.isPremium` 置为 `true`。

以上为设计示例，实际对接时请以所选聚合支付平台的官方文档为准（参数名、签名算法、回调格式可能不同）。
