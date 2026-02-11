# 阿里云短信服务配置指南

## 📋 当前状态

✅ **代码已更新**：已集成阿里云短信 SDK，支持真实发送手机验证码  
⚠️ **需要配置**：在 Vercel 环境变量中配置阿里云凭证后，短信功能才会生效

---

## ⚠️ 个人用户：只能用「短信认证」免资质（不能走普通短信签名）

根据当前运营商与阿里云要求，**国内短信的「签名」必须绑定企业资质**，个人无法用「个人资质」报备签名。  
**个人开发者**请使用阿里云 **「短信认证」** 服务（免资质、免申请签名/模板，即开即用）：

- **控制台**：[号码认证服务 → 短信认证](https://dypns.console.aliyun.com)（开通「短信认证」功能）
- **官方说明**：[个人开发者如何接入短信验证码服务](https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers)

本仓库支持两种方式（二选一）：

| 方式 | 适用 | 配置说明 |
|------|------|----------|
| **短信认证（推荐个人）** | 个人实名、无企业资质 | 在号码认证控制台开通后，配置 `ALIYUN_SMS_USE_AUTH=1` 及控制台里提供的签名/模板（见下文「个人用户：短信认证」） |
| **短信服务（需企业资质）** | 已企业认证、有签名/模板 | 在短信服务控制台申请签名与模板，配置 `SMS_SIGN_NAME`、`SMS_TEMPLATE_CODE` |

---

## ⚠️ 国内短信请用「中国站」（不要用国际站/日本站）

给**中国大陆手机号**发验证码，必须在 **阿里云中国站** 开通（短信认证或短信服务）。  
若打开 [https://www.aliyun.com](https://www.aliyun.com) 显示为英文或国际版界面：

1. **切换语言**：在页面底部或右上角把语言改为 **简体中文**，或  
2. **直接进中国站控制台**：  
   - 控制台首页：[https://home.console.aliyun.com](https://home.console.aliyun.com)  
   - 短信服务控制台：[https://dysms.console.aliyun.com](https://dysms.console.aliyun.com)  

用上述链接登录后，在控制台里完成**中国站实名认证**（身份证等），再开通短信服务。  
若你之前是在 **alibabacloud.com** 或地区选成日本的账号，那是国际站，无法用于国内短信；需在中国站用手机号/邮箱重新注册并实名。

---

## 个人用户：短信认证（免资质，无需企业）

个人账号无法在「短信服务」里申请签名（需企业资质）。请改用 **号码认证服务 → 短信认证**，免申请签名/模板，即开即用。

### 1. 开通短信认证

1. 打开 [号码认证服务控制台](https://dypns.console.aliyun.com)，在左侧找到并开通 **短信认证**。
2. 在控制台里查看并记下系统提供的 **签名名称**（SignName）和 **验证码模板 CODE**（TemplateCode）——多为预置的，可直接用于 API。
3. 创建 AccessKey： [AccessKey 管理](https://ram.console.aliyun.com/manage/ak)（与短信服务共用同一对即可）。

### 2. 配置 .env（短信认证方式）

在服务器 `.env` 中配置（**不要**再填 `SMS_SIGN_NAME` / `SMS_TEMPLATE_CODE`，改用下面三项）：

```env
ALIYUN_ACCESS_KEY_ID=你的AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_USE_AUTH=1
ALIYUN_SMS_AUTH_SIGN_NAME=控制台里看到的签名名称
ALIYUN_SMS_AUTH_TEMPLATE_CODE=控制台里看到的验证码模板Code
```

配置后重启应用。项目会通过 **短信认证 API**（Dypnsapi）发验证码，无需企业签名/模板审核。

更多说明：[个人开发者如何接入短信验证码服务](https://help.aliyun.com/zh/pnvs/use-cases/sms-verify-for-individual-developers)。

---

## 步骤 1：注册并开通阿里云短信服务（企业用户走此路径）

### 1.1 注册阿里云账号

1. 访问 [阿里云中国站](https://www.aliyun.com) 并切换为 **简体中文**，或直接打开 [控制台](https://home.console.aliyun.com) 登录
2. 注册/登录账号
3. 在中国站完成**实名认证**（发送国内短信必须；个人认证用中国大陆身份证等，按页面提示操作）

### 1.2 开通短信服务

1. 进入 [短信服务控制台](https://dysms.console.aliyun.com/)
2. 点击 **开通服务**（首次使用需要）
3. 选择 **国内消息** 或 **国际/港澳台消息**（根据需求）

---

## 步骤 2：创建 AccessKey

### 2.1 创建 AccessKey

1. 鼠标悬停在右上角头像 → **AccessKey 管理**
2. 或直接访问：https://ram.console.aliyun.com/manage/ak
3. 点击 **创建 AccessKey**
4. **重要**：保存 `AccessKey ID` 和 `AccessKey Secret`（Secret 只显示一次）

### 2.2 安全建议

- 不要将 AccessKey 提交到 Git
- 定期轮换 AccessKey
- 使用子账号 AccessKey（更安全，需要 RAM 权限配置）

---

## 步骤 3：申请短信签名

### 3.1 申请签名

1. 在短信服务控制台，进入 **国内消息** → **签名管理**
2. 点击 **添加签名**
3. 填写信息：
   - **签名名称**：如 `日语假名工具`、`Furigana`（2-12 个字符）
   - **签名来源**：选择 **网站** 或 **APP**
   - **网站地址**：填写你的网站地址（如 `https://furigana-app-hsl.vercel.app`）
   - **证明文件**：上传网站截图或备案信息（可选，但有助于审核通过）
4. 提交审核

### 3.2 审核时间

- 通常 **1-3 个工作日**
- 审核通过后，签名状态变为 **审核通过**

---

## 步骤 4：申请短信模板

### 4.1 创建模板

1. 在短信服务控制台，进入 **国内消息** → **模板管理**
2. 点击 **添加模板**
3. 填写信息：
   - **模板名称**：如 `验证码模板`
   - **模板类型**：选择 **验证码**
   - **模板内容**：
     ```
     您的验证码是${code}，${minutes}分钟内有效。请勿泄露给他人。
     ```
     或更简单的：
     ```
     您的验证码是${code}，10分钟内有效。
     ```
   - **申请说明**：填写用途说明（如：用于用户登录验证）
4. 提交审核

### 4.2 模板参数说明

- `${code}`：验证码变量（必填）
- `${minutes}`：有效期分钟数（可选）
- 模板中只能包含验证码相关变量，不能有营销内容

### 4.3 审核通过后

- 记录 **模板代码**（格式如 `SMS_123456789`）

---

## 步骤 5：在 Vercel 中配置环境变量

### 5.1 进入环境变量设置

1. 打开 Vercel 项目：`furigana-app-hsl`
2. 进入 **Settings** → **Environment Variables**

### 5.2 添加以下环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ALIYUN_ACCESS_KEY_ID` | `LTAI5t...` | 阿里云 AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | `xxx...` | 阿里云 AccessKey Secret |
| `SMS_SIGN_NAME` | `日语假名工具` | 短信签名（需与申请的一致） |
| `SMS_TEMPLATE_CODE` | `SMS_123456789` | 短信模板代码 |

### 5.3 环境选择

每个变量添加时，勾选：
- ✅ **Production**（生产环境）
- ✅ **Preview**（预览环境）
- ✅ **Development**（开发环境，可选）

### 5.4 保存并重新部署

1. 所有变量添加完成后，点击 **Save**
2. 进入 **Deployments** 标签
3. 找到最新部署，点击 **⋯** → **Redeploy**
4. 等待部署完成

---

## 步骤 6：测试短信功能

### 6.1 测试发送

1. 访问 `https://furigana-app-hsl.vercel.app/login`
2. 选择 **手机登录** Tab
3. 输入手机号（如 `13800138000`）
4. 点击 **发送验证码**

### 6.2 检查结果

- **成功**：手机收到验证码短信
- **失败**：查看 Vercel Functions 日志（`/api/auth/send-code`）

### 6.3 常见错误

#### ❌ 错误：`InvalidSignName`

**原因**：短信签名未配置或与申请的不一致

**处理**：
- 检查 `SMS_SIGN_NAME` 是否与阿里云控制台中的签名完全一致（包括空格、大小写）

#### ❌ 错误：`InvalidTemplateCode`

**原因**：模板代码错误或未审核通过

**处理**：
- 检查 `SMS_TEMPLATE_CODE` 是否正确
- 确认模板状态为 **审核通过**

#### ❌ 错误：`InvalidAccessKeyId`

**原因**：AccessKey ID 或 Secret 错误

**处理**：
- 重新检查 `ALIYUN_ACCESS_KEY_ID` 和 `ALIYUN_ACCESS_KEY_SECRET`
- 确认没有多余空格或换行

#### ❌ 错误：`SignatureDoesNotMatch`

**原因**：AccessKey Secret 错误

**处理**：
- 重新生成 AccessKey 并更新环境变量

---

## 步骤 7：查看短信发送记录

### 7.1 在阿里云控制台查看

1. 进入短信服务控制台 → **发送记录**
2. 可以查看：
   - 发送状态（成功/失败）
   - 发送时间
   - 手机号（脱敏显示）
   - 费用消耗

### 7.2 在 Vercel 日志中查看

1. 进入 Vercel 项目 → **Deployments** → 最新部署
2. 点击 **Functions** → `/api/auth/send-code`
3. 查看日志中的 `[sms] SMS sent successfully` 或错误信息

---

## 💰 费用说明

### 7.1 计费方式

- **按量付费**：按发送条数计费
- **国内短信**：约 **0.045 元/条**（具体以阿里云定价为准）
- **国际短信**：价格更高，按国家/地区不同

### 7.2 免费额度

- 新用户可能有少量免费额度（如 100 条）
- 查看 [阿里云短信定价](https://www.aliyun.com/price/product#/sms/detail) 了解详情

### 7.3 成本控制建议

- 添加发送频率限制（如每分钟最多 1 次）
- 监控发送量，避免被刷
- 设置费用预警

---

## 🔒 安全建议

### 8.1 AccessKey 安全

- ✅ 使用子账号 AccessKey（通过 RAM 分配最小权限）
- ✅ 定期轮换 AccessKey
- ✅ 不要将 AccessKey 提交到 Git
- ✅ 在 Vercel 中使用环境变量存储

### 8.2 短信发送限制

建议在代码中添加频率限制，防止被刷：

```typescript
// 示例：每分钟最多发送 1 次
const lastSent = await prisma.verification.findFirst({
  where: { phone, createdAt: { gte: new Date(Date.now() - 60000) } },
});
if (lastSent) {
  return NextResponse.json({ success: false, error: '请稍后再试' }, { status: 429 });
}
```

---

## 📝 总结

配置流程：

1. ✅ **注册阿里云** → 开通短信服务
2. ✅ **创建 AccessKey** → 保存 ID 和 Secret
3. ✅ **申请短信签名** → 等待审核（1-3 天）
4. ✅ **申请短信模板** → 等待审核（1-3 天）
5. ✅ **配置 Vercel 环境变量** → 添加 4 个变量
6. ✅ **重新部署** → 测试短信功能

**重要提示**：
- 签名和模板需要审核，提前申请
- 环境变量配置后需要重新部署才会生效
- 未配置时，验证码会在日志中打印（开发模式）

---

## 🆘 遇到问题？

- **审核未通过**：检查签名/模板是否符合规范，联系阿里云客服
- **发送失败**：查看 Vercel Functions 日志，检查环境变量是否正确
- **费用问题**：在阿里云控制台查看消费记录，设置费用预警
