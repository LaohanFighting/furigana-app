# 短信验证码接入指南

## 当前状态

目前手机验证码**只在 Vercel Functions 日志中打印**，不会真实发送到手机。验证码会打印在日志中，格式如：

```
[dev] SMS code for 13800138000 : 123456
```

## 如何查看验证码（临时方案）

### 在 Vercel 控制台查看

1. 打开 Vercel 项目：`furigana-app-hsl`
2. 进入 **Deployments** → 找到最新部署
3. 点击部署，进入详情页
4. 点击 **Functions** 标签
5. 找到 `/api/auth/send-code` 函数
6. 在手机上输入手机号并点击「发送验证码」
7. **刷新日志页面**，找到包含 `[dev] SMS code for` 的行
8. 复制验证码，在登录页输入

### 或使用 Vercel CLI 查看实时日志

```bash
vercel logs --follow
```

---

## 接入真实短信服务（可选）

如果需要真实发送短信到手机，需要接入短信服务商。以下是常见方案：

### 方案一：阿里云短信（推荐，国内）

#### 1. 注册并开通阿里云短信服务

1. 访问 [阿里云短信服务](https://www.aliyun.com/product/sms)
2. 开通服务，创建 AccessKey（AccessKey ID 和 AccessKey Secret）
3. 申请短信签名和模板（审核需要时间）

#### 2. 安装依赖

```bash
npm install @alicloud/sms-sdk
```

#### 3. 创建短信发送函数

创建 `lib/sms-aliyun.ts`：

```typescript
import * as SMSClient from '@alicloud/sms-sdk';

const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
const signName = process.env.SMS_SIGN_NAME; // 短信签名
const templateCode = process.env.SMS_TEMPLATE_CODE; // 模板代码

export async function sendSms(phone: string, code: string): Promise<void> {
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    console.log('[dev] SMS not configured, code for', phone, ':', code);
    return;
  }

  const client = new SMSClient({ accessKeyId, secretAccessKey: accessKeySecret });
  
  await client.sendSMS({
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  });
}
```

#### 4. 在 send-code API 中调用

修改 `app/api/auth/send-code/route.ts`：

```typescript
// 在手机号分支中，替换 console.log
import { sendSms } from '@/lib/sms-aliyun';

// ... 其他代码 ...

} else {
  const created = await prisma.verification.create({
    data: { phone, code, expiresAt },
  });
  await prisma.verification.deleteMany({
    where: { phone, id: { not: created.id } },
  });

  try {
    await sendSms(phone, code);
  } catch (e) {
    console.error('[send-code] SMS send failed:', e);
    // 即使发送失败，也记录验证码到日志，方便调试
    console.log('[dev] SMS code for', phone, ':', code);
  }
}
```

#### 5. 配置环境变量

在 Vercel **Environment Variables** 中添加：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ALIYUN_ACCESS_KEY_ID` | 阿里云 AccessKey ID | `LTAI5t...` |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云 AccessKey Secret | `xxx...` |
| `SMS_SIGN_NAME` | 短信签名（需审核） | `日语假名工具` |
| `SMS_TEMPLATE_CODE` | 模板代码（需审核） | `SMS_123456789` |

#### 6. 短信模板示例

在阿里云控制台申请模板时，内容示例：

```
您的验证码是${code}，10分钟内有效。请勿泄露给他人。
```

模板参数：`{"code":"123456"}`

---

### 方案二：Twilio（国际，支持多国）

#### 1. 注册 Twilio

访问 [twilio.com](https://www.twilio.com)，注册账号并获取：
- Account SID
- Auth Token
- Phone Number（发送短信的号码）

#### 2. 安装依赖

```bash
npm install twilio
```

#### 3. 创建发送函数

创建 `lib/sms-twilio.ts`：

```typescript
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export async function sendSms(phone: string, code: string): Promise<void> {
  if (!accountSid || !authToken || !fromPhone) {
    console.log('[dev] SMS not configured, code for', phone, ':', code);
    return;
  }

  const client = twilio(accountSid, authToken);
  
  await client.messages.create({
    body: `Your verification code is ${code}. It expires in 10 minutes.`,
    from: fromPhone,
    to: phone, // 需要包含国家代码，如 +8613800138000
  });
}
```

#### 4. 环境变量

| 变量名 | 说明 |
|--------|------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Twilio 分配的发送号码 |

---

### 方案三：腾讯云短信（国内）

类似阿里云，需要：
- 注册腾讯云，开通短信服务
- 获取 SecretId、SecretKey
- 申请签名和模板
- 安装 `tencentcloud-sdk-nodejs` SDK

---

## 推荐方案对比

| 服务商 | 优势 | 劣势 | 适用场景 |
|--------|------|------|----------|
| **阿里云** | 国内稳定、价格低、审核快 | 仅支持国内 | 主要面向国内用户 |
| **Twilio** | 支持全球、文档完善 | 价格较高、需要国际号码格式 | 面向国际用户 |
| **腾讯云** | 国内稳定 | 审核时间较长 | 国内备选方案 |

---

## 注意事项

1. **短信签名和模板需要审核**：通常需要 1-3 个工作日，提前申请
2. **成本**：短信按条计费，注意控制发送频率，避免被刷
3. **限流**：建议在 API 中添加频率限制（如每分钟最多 1 次）
4. **错误处理**：短信发送失败时，仍应在日志中打印验证码，方便调试

---

## 快速测试（不接入短信服务）

如果暂时不需要真实发送短信，可以：

1. **开发/测试阶段**：使用 Vercel 日志查看验证码
2. **生产环境**：先使用邮箱登录，手机登录作为备选（验证码在日志中）
3. **后续接入**：用户量增长后再接入短信服务

---

## 总结

- **当前**：验证码在 Vercel Functions 日志中，需要手动查看
- **接入短信**：选择服务商（推荐阿里云）→ 配置环境变量 → 修改代码 → 重新部署
- **临时方案**：继续使用日志查看，或先只用邮箱登录
