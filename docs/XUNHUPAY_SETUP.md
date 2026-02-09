# 虎皮椒（XunhuPay）支付接入完整指南

## ✅ 代码已完成

`lib/payment.ts` 已实现虎皮椒的完整对接：
- ✅ 虎皮椒签名算法（MD5，参数排序 + APPSECRET）
- ✅ 创建订单接口（扫码支付）
- ✅ 支付回调验签
- ✅ 订单状态更新和用户升级

---

## 第一步：注册虎皮椒账号

### 1.1 访问官网注册

1. 访问 [虎皮椒官网](https://www.xunhupay.com)
2. 点击 **注册** 或 **免费接入**
3. 填写注册信息：
   - 手机号
   - 验证码
   - 密码
4. 完成注册并登录

### 1.2 完成签约

1. 登录后，进入 **商户中心**
2. 完成实名认证（上传身份证等）
3. 完成签约流程
4. 获取：
   - **APPID**（应用ID）
   - **APPSECRET**（应用密钥）

### 1.3 支付方式

- **微信支付**：签约后即可使用 ✅
- **支付宝支付**：签约后即可使用 ✅

---

## 第二步：配置 Vercel 环境变量

### 2.1 进入环境变量设置

1. 打开 Vercel 项目：`furigana-app-hsl`
2. 进入 **Settings** → **Environment Variables**

### 2.2 添加以下环境变量

| 变量名 | 值 | 说明 | 示例 |
|--------|-----|------|------|
| `PAYMENT_API_URL` | 虎皮椒接口地址 | 固定值 | `https://api.xunhupay.com/payment/do.html` |
| `PAYMENT_APPID` | 虎皮椒 APPID | 从虎皮椒后台复制 | `1234567890` |
| `PAYMENT_KEY` | 虎皮椒 APPSECRET | 从虎皮椒后台复制 | `your-app-secret-here` |
| `PAYMENT_NOTIFY_URL` | 异步回调地址 | 你的网站回调地址 | `https://furigana-app-hsl.vercel.app/api/payment/callback` |
| `PAYMENT_RETURN_URL` | 支付完成跳转 | 支付成功后跳转页面 | `https://furigana-app-hsl.vercel.app/dashboard?paid=1` |

### 2.3 环境选择

每个变量添加时，勾选：
- ✅ **Production**（生产环境）
- ✅ **Preview**（预览环境）
- ✅ **Development**（开发环境，可选）

### 2.4 保存并重新部署

1. 所有变量添加完成后，点击 **Save**
2. 进入 **Deployments** 标签
3. 找到最新部署，点击 **⋯** → **Redeploy**
4. 等待部署完成

---

## 第三步：在虎皮椒后台配置回调

### 3.1 设置异步通知地址

1. 登录虎皮椒后台
2. 进入 **商户中心** → **API 设置** 或 **支付设置**
3. 找到 **异步通知地址**（Notify URL）或 **回调地址**
4. 填写：
   ```
   https://furigana-app-hsl.vercel.app/api/payment/callback
   ```
5. 点击 **保存**

**重要**：
- 必须是 HTTPS 地址
- 必须是公网可访问的地址
- 虎皮椒会在用户支付成功后 POST 到这个地址

---

## 第四步：测试支付流程

### 4.1 测试下单

1. 访问 `https://furigana-app-hsl.vercel.app/login`
2. 登录账号（邮箱或手机号）
3. 访问 `/dashboard/upgrade`
4. 选择支付方式（**微信支付** 或 **支付宝支付**）
5. 点击 **去支付**

**预期结果**：
- 应该跳转到支付页面或显示支付链接
- 如果显示错误，查看浏览器控制台和 Vercel Functions 日志

### 4.2 测试支付（使用测试金额）

1. 使用虎皮椒的测试模式（如果有）或小额真实支付
2. 完成支付流程
3. 检查 Vercel Functions 日志（`/api/payment/callback`）

**查看日志**：
1. Vercel 项目 → **Deployments** → 最新部署
2. 点击 **Functions** → `/api/payment/callback`
3. 查看是否有回调日志

### 4.3 验证结果

支付成功后，检查：

1. **数据库订单状态**：
   - `Order.status` 应为 `paid`
   - `Order.orderId` 对应虎皮椒订单号

2. **用户 Premium 状态**：
   - `User.isPremium` 应为 `true`

3. **页面显示**：
   - 刷新 `/dashboard` 页面
   - 应该显示 **Premium** 标识
   - 应该显示 **无限** 次数

---

## 第五步：常见问题排查

### ❌ 错误：Payment not configured

**原因**：环境变量未配置或配置错误

**处理**：
1. 检查 Vercel 环境变量是否已添加
2. 确认 `PAYMENT_APPID` 和 `PAYMENT_KEY` 是否正确
3. 确认已重新部署

### ❌ 错误：Invalid signature / 验签失败

**原因**：签名计算错误或密钥错误

**处理**：
1. 确认 `PAYMENT_KEY` 是否正确（APPSECRET，不要有空格）
2. 确认 `PAYMENT_APPID` 是否正确（APPID）
3. 查看 Vercel Functions 日志，对比计算出的 hash 和虎皮椒传来的 hash
4. 确认签名算法：参数排序 → 拼接 → 末尾加 APPSECRET → MD5（小写）

### ❌ 错误：支付链接无法跳转

**原因**：虎皮椒 API 返回的 `url` 为空或格式错误

**处理**：
1. 查看 Vercel Functions 日志（`/api/payment/create`）
2. 确认虎皮椒 API 返回的数据格式
3. 检查 `PAYMENT_API_URL` 是否正确（`https://api.xunhupay.com/payment/do.html`）
4. 确认返回的 `errcode` 是否为 0

### ❌ 错误：回调未收到 / 用户未升级

**原因**：回调地址配置错误或回调处理失败

**处理**：
1. 确认虎皮椒后台的异步通知地址是否正确
2. 确认回调地址是 HTTPS 且公网可访问
3. 查看 Vercel Functions 日志（`/api/payment/callback`）
4. 检查回调验签是否通过
5. 检查订单状态字段是否正确（`status === 'OD'` 表示支付成功）

### ❌ 错误：errcode 不为 0

**原因**：API 请求参数错误

**处理**：
1. 查看返回的 `errmsg` 字段，了解具体错误原因
2. 检查参数格式：
   - `total_fee` 使用元为单位（如 9.9，不是 990）
   - `trade_order_id` 订单号格式正确
   - `type` 为 `alipay` 或 `wechat`
3. 确认签名计算正确

---

## 第六步：金额和定价

### 当前定价

- **代码中**：`PREMIUM_AMOUNT_CENTS = 990`（9.9 元 = 990 分）
- **虎皮椒传参**：`total_fee = 9.9`（元为单位）

### 修改定价

在 `lib/payment.ts` 顶部修改：

```typescript
const PREMIUM_AMOUNT_CENTS = 1990; // 改为 19.9 元
```

**注意**：代码中会自动转换为元（除以 100），所以 19.9 元 = 1990 分。

---

## 第七步：虎皮椒 API 说明

### 7.1 支付接口

**接口地址**：`https://api.xunhupay.com/payment/do.html`

**请求方式**：POST

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `version` | string | 是 | 版本号，固定值 `1.1` |
| `appid` | string | 是 | 应用ID（APPID） |
| `trade_order_id` | string | 是 | 商户订单号 |
| `total_fee` | string | 是 | 订单金额（元，如 `9.9`） |
| `title` | string | 是 | 订单标题 |
| `notify_url` | string | 是 | 异步通知地址 |
| `return_url` | string | 是 | 支付完成跳转地址 |
| `type` | string | 是 | 支付方式：`alipay` 或 `wechat` |
| `hash` | string | 是 | 签名（MD5） |

**返回格式**：

```json
{
  "errcode": 0,
  "errmsg": "success",
  "url": "https://...",  // 支付链接
  "hash": "..."          // 签名
}
```

### 7.2 回调通知

**回调参数**：

| 参数名 | 说明 |
|--------|------|
| `trade_order_id` | 商户订单号 |
| `status` | 订单状态：`OD` 表示支付成功 |
| `hash` | 签名（需验签） |

**回调返回**：返回 `success` 字符串表示处理成功

---

## 第八步：生产环境注意事项

### 8.1 安全建议

- ✅ **不要将密钥提交到 Git**：密钥只在 Vercel 环境变量中配置
- ✅ **使用 HTTPS**：回调地址必须是 HTTPS
- ✅ **验证签名**：回调必须验签，防止伪造支付成功
- ✅ **幂等性处理**：已处理的订单直接返回 success，避免重复处理

### 8.2 监控建议

- 定期查看虎皮椒后台的交易记录
- 监控 Vercel Functions 日志，及时发现异常
- 设置费用预警，避免异常消费

### 8.3 费率说明

- 虎皮椒会收取一定的手续费（具体费率查看虎皮椒官网）
- 实际到账金额 = 支付金额 - 手续费

---

## 📝 总结

### 配置流程：

1. ✅ **注册虎皮椒** → 完成签约 → 获取 APPID 和 APPSECRET
2. ✅ **配置 Vercel 环境变量** → 添加 5 个支付相关变量
3. ✅ **在虎皮椒后台配置回调** → 设置异步通知地址
4. ✅ **重新部署** → 让环境变量生效
5. ✅ **测试支付** → 验证下单、支付、回调、升级流程

### 关键信息：

- **接口地址**：`https://api.xunhupay.com/payment/do.html`
- **签名算法**：MD5（参数排序 + APPSECRET，32位小写）
- **支付方式**：微信支付、支付宝支付（签约后即可使用）
- **回调验签**：必须验证签名，确保安全
- **金额单位**：`total_fee` 使用元（如 9.9），代码会自动转换

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看虎皮椒官方文档：https://www.xunhupay.com/doc/api/pay.html
2. 查看 Vercel Functions 日志
3. 联系虎皮椒客服
4. 检查代码实现：`lib/payment.ts`
