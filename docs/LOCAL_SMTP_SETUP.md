# 本地开发配置 SMTP 发送验证码邮件

## 当前状态

本地 `.env` 文件中**未配置 SMTP**，所以验证码不会真实发送到邮箱，而是打印在终端日志中。

---

## 方法一：查看终端日志（当前方式，无需配置）

### 步骤：

1. **找到运行 `npm run dev` 的终端窗口**
2. **在登录页输入邮箱，点击"发送验证码"**
3. **立即查看终端窗口**，会看到类似：
   ```
   [dev] Verification code for your@email.com : 123456
   ```
4. **复制验证码**（如 `123456`），在登录页输入

### 如果找不到终端窗口：

- 检查任务栏是否有 Node.js 或 PowerShell 窗口
- 或者在项目目录重新运行 `npm run dev`，然后发送验证码

---

## 方法二：配置 SMTP（真实发送邮件）

如果需要验证码真实发送到邮箱，需要配置 SMTP。

### 使用 QQ 邮箱示例

#### 1. 开启 QQ 邮箱 SMTP 服务

1. 登录 QQ 邮箱：https://mail.qq.com
2. 点击 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **POP3/SMTP服务** 或 **IMAP/SMTP服务**
5. 点击 **生成授权码**，按提示操作
6. **保存授权码**（这是 `SMTP_PASS`，只显示一次）

#### 2. 在 `.env` 文件中添加配置

打开 `furigana-app/.env` 文件，添加以下内容：

```env
# SMTP 配置（QQ 邮箱示例）
SMTP_HOST="smtp.qq.com"
SMTP_PORT=587
SMTP_USER="your-qq-email@qq.com"
SMTP_PASS="your-authorization-code"
SMTP_FROM="your-qq-email@qq.com"
```

**替换说明**：
- `SMTP_USER`：你的 QQ 邮箱地址
- `SMTP_PASS`：QQ 邮箱的授权码（不是密码）
- `SMTP_FROM`：发件人地址（通常和 `SMTP_USER` 相同）

#### 3. 重启开发服务器

1. 停止当前的 `npm run dev`（按 `Ctrl+C`）
2. 重新运行：
   ```powershell
   npm run dev
   ```

#### 4. 测试

1. 访问 `http://localhost:3000/login`
2. 输入邮箱，点击"发送验证码"
3. 检查邮箱收件箱和垃圾邮件文件夹
4. 应该收到主题为 "Your verification code - Furigana" 的邮件

---

## 其他邮箱 SMTP 配置

### Gmail

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"  # 需要生成应用专用密码
SMTP_FROM="your@gmail.com"
```

### 163 邮箱

```env
SMTP_HOST="smtp.163.com"
SMTP_PORT=25
SMTP_USER="your@163.com"
SMTP_PASS="your-authorization-code"
SMTP_FROM="your@163.com"
```

### SendGrid（第三方服务）

```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="noreply@yourdomain.com"
```

---

## 常见问题

### ❌ 错误：Connection timeout / ETIMEDOUT

**原因**：网络问题或端口被阻止

**处理**：
- 尝试使用端口 465（SSL）：
  ```env
  SMTP_PORT=465
  ```
- 检查防火墙设置
- 尝试使用其他 SMTP 服务（如 SendGrid）

### ❌ 错误：Authentication failed

**原因**：用户名或密码错误

**处理**：
- 确认 `SMTP_USER` 是正确的邮箱地址
- 确认 `SMTP_PASS` 是授权码（不是邮箱密码）
- QQ 邮箱需要使用授权码，不是登录密码

### ❌ 错误：Greeting never received

**原因**：SMTP 服务器连接问题

**处理**：
- 检查 `SMTP_HOST` 是否正确
- 尝试使用端口 465（SSL）
- 检查网络连接

---

## 推荐方案

### 开发阶段
- **使用终端日志查看验证码**（当前方式）
- 简单快速，无需配置

### 生产环境
- **配置 SMTP 真实发送邮件**
- 用户体验更好，验证码直接发送到邮箱

---

## 总结

- **当前**：验证码在终端日志中，查看运行 `npm run dev` 的终端窗口
- **配置 SMTP 后**：验证码会真实发送到邮箱
- **配置步骤**：在 `.env` 中添加 SMTP 配置 → 重启开发服务器 → 测试
