# PayJS 支付接入完整指南

## ✅ 代码已完成

`lib/payment.ts` 已实现 PayJS 的完整对接：
- ✅ PayJS 签名算法（MD5）
- ✅ 创建订单接口（Native 扫码支付）
- ✅ 支付回调验签
- ✅ 订单状态更新和用户升级

---

## 第一步：注册 PayJS 账号

### 1.1 访问官网注册

1. 访问 [PayJS 官网](https://payjs.cn)
2. 点击 **注册**，填写手机号、验证码、密码
3. 完成注册并登录

### 1.2 完成实名认证

1. 在 PayJS 后台，进入 **账户设置** → **实名认证**
2. 上传身份证正反面照片
3. 填写个人信息
4. 等待审核（通常 1-2 个工作日）

### 1.3 获取商户信息

认证通过后，在 PayJS 后台可以获取：

| 信息 | 位置 | 说明 |
|------|------|------|
| **商户号（mchid）** | 账户设置 → 商户信息 | 用于 `PAYMENT_APPID` |
| **密钥（key）** | 账户设置 → 商户信息 | 用于 `PAYMENT_KEY`，请妥善保管 |

---

## 第二步：配置 Vercel 环境变量

### 2.1 进入环境变量设置

1. 打开 Vercel 项目：`furigana-app-hsl`
2. 进入 **Settings** → **Environment Variables**

### 2.2 添加以下环境变量

| 变量名 | 值 | 说明 | 示例 |
|--------|-----|------|------|
| `PAYMENT_API_URL` | PayJS 接口地址 | 固定值 | `https://payjs.cn/api/native` |
| `PAYMENT_APPID` | PayJS 商户号 | 从 PayJS 后台复制 | `1234567890` |
| `PAYMENT_KEY` | PayJS 密钥 | 从 PayJS 后台复制 | `your-secret-key-here` |
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

## 第三步：在 PayJS 后台配置回调

### 3.1 设置异步通知地址

1. 登录 PayJS 后台
2. 进入 **账户设置** → **支付设置** 或 **API 设置**
3. 找到 **异步通知地址**（Notify URL）或 **回调地址**
4. 填写：
   ```
   https://furigana-app-hsl.vercel.app/api/payment/callback
   ```
5. 点击 **保存**

**重要**：
- 必须是 HTTPS 地址
- 必须是公网可访问的地址
- PayJS 会在用户支付成功后 POST 到这个地址

### 3.2 检查支付方式

在 PayJS 后台查看：
- **微信支付**：注册后即可使用 ✅
- **支付宝支付**：需要满足条件后自动开通（交易天数、交易额等）

---

## 第四步：测试支付流程

### 4.1 测试下单

1. 访问 `https://furigana-app-hsl.vercel.app/login`
2. 登录账号（邮箱或手机号）
3. 访问 `/dashboard/upgrade`
4. 选择支付方式（**微信支付** 或 **支付宝支付**）
5. 点击 **去支付**

**预期结果**：
- 应该跳转到支付页面或显示支付二维码
- 如果显示错误，查看浏览器控制台和 Vercel Functions 日志

### 4.2 测试支付（使用测试金额）

1. 使用 PayJS 的测试模式（如果有）或小额真实支付
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
   - `Order.orderId` 对应 PayJS 订单号

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
1. 确认 `PAYMENT_KEY` 是否正确（从 PayJS 后台复制，不要有空格）
2. 确认 `PAYMENT_APPID` 是否正确（商户号 mchid）
3. 查看 Vercel Functions 日志，对比计算出的签名和 PayJS 传来的签名

### ❌ 错误：支付链接无法跳转

**原因**：PayJS API 返回的 `code_url` 为空或格式错误

**处理**：
1. 查看 Vercel Functions 日志（`/api/payment/create`）
2. 确认 PayJS API 返回的数据格式
3. 检查 `PAYMENT_API_URL` 是否正确（`https://payjs.cn/api/native`）

### ❌ 错误：回调未收到 / 用户未升级

**原因**：回调地址配置错误或回调处理失败

**处理**：
1. 确认 PayJS 后台的异步通知地址是否正确
2. 确认回调地址是 HTTPS 且公网可访问
3. 查看 Vercel Functions 日志（`/api/payment/callback`）
4. 检查回调验签是否通过
5. 检查订单状态字段是否正确（`return_code === 1`）

### ❌ 支付宝支付不可用

**原因**：新账户需要满足条件才能开通支付宝

**处理**：
1. 先使用 **微信支付**（注册后即可使用）
2. 在 PayJS 后台查看支付宝开通状态
3. 满足以下条件后自动开通：
   - 过去 40 天交易日达 30 天
   - 日均交易额 100 元以上
   - 日均交易 10 笔以上
   - 日均支付用户 10 人以上

---

## 第六步：金额和定价

### 当前定价

- **代码中**：`PREMIUM_AMOUNT_CENTS = 990`（9.9 元 = 990 分）

### 修改定价

在 `lib/payment.ts` 顶部修改：

```typescript
const PREMIUM_AMOUNT_CENTS = 1990; // 改为 19.9 元
```

**注意**：PayJS 使用 **分** 作为单位，所以 19.9 元 = 1990 分。

---

## 第七步：生产环境注意事项

### 7.1 安全建议

- ✅ **不要将密钥提交到 Git**：密钥只在 Vercel 环境变量中配置
- ✅ **使用 HTTPS**：回调地址必须是 HTTPS
- ✅ **验证签名**：回调必须验签，防止伪造支付成功
- ✅ **幂等性处理**：已处理的订单直接返回 success，避免重复处理

### 7.2 监控建议

- 定期查看 PayJS 后台的交易记录
- 监控 Vercel Functions 日志，及时发现异常
- 设置费用预警，避免异常消费

### 7.3 费率说明

- PayJS 会收取一定的手续费（具体费率查看 PayJS 官网）
- 实际到账金额 = 支付金额 - 手续费

---

## 📝 总结

### 配置流程：

1. ✅ **注册 PayJS** → 完成实名认证 → 获取商户号和密钥
2. ✅ **配置 Vercel 环境变量** → 添加 5 个支付相关变量
3. ✅ **在 PayJS 后台配置回调** → 设置异步通知地址
4. ✅ **重新部署** → 让环境变量生效
5. ✅ **测试支付** → 验证下单、支付、回调、升级流程

### 关键信息：

- **接口地址**：`https://payjs.cn/api/native`
- **签名算法**：MD5（参数排序 + key）
- **支付方式**：微信支付（立即可用）、支付宝支付（需满足条件）
- **回调验签**：必须验证签名，确保安全

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看 PayJS 官方文档：https://payjs.cn/docs/
2. 查看 Vercel Functions 日志
3. 联系 PayJS 客服
4. 检查代码实现：`lib/payment.ts`
