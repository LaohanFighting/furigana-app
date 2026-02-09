# 详细部署到 Vercel 步骤

## 📋 前置检查清单

在开始部署前，确认以下内容：

- ✅ 本地代码已测试通过（`npm run dev` 能正常运行）
- ✅ 数据库迁移已执行（`npx prisma migrate deploy` 成功）
- ✅ 本地 `.env` 中有正确的 `DATABASE_URL`（PostgreSQL）
- ✅ Git 仓库已准备好（GitHub 上有对应的仓库）

---

## 步骤 1：提交并推送代码到 GitHub

### 1.1 检查当前修改状态

在项目根目录（`furigana-app`）执行：

```powershell
git status
```

应该能看到以下文件被修改：
- `prisma/schema.prisma`（添加了 phone 字段）
- `prisma/migrations/20250208100000_add_phone_login/migration.sql`（新迁移文件）
- `app/api/auth/send-code/route.ts`（支持手机号）
- `app/api/auth/verify/route.ts`（支持手机号）
- `app/api/auth/me/route.ts`（返回 identity）
- `app/login/page.tsx`（邮箱/手机双 Tab）
- `app/dashboard/page.tsx`（显示 identity）
- `lib/i18n.ts`（新增手机号相关文案）
- `app/globals.css`（横向滚动样式，如果之前有修改）

### 1.2 添加所有修改到 Git

```powershell
git add .
```

### 1.3 提交更改

```powershell
git commit -m "feat: 添加手机号验证码登录功能

- User 和 Verification 表支持 phone 字段
- send-code API 支持邮箱或手机号发送验证码
- verify API 支持邮箱或手机号登录
- 登录页增加邮箱/手机号切换 Tab
- 仪表盘显示用户身份（邮箱或手机号）"
```

### 1.4 推送到 GitHub

```powershell
git push origin main
```

（如果主分支是 `master`，改为 `git push origin master`）

**验证**：打开 GitHub 仓库页面，确认最新提交已显示。

---

## 步骤 2：在 Vercel 中配置项目

### 2.1 登录 Vercel

1. 打开 [https://vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录（推荐，便于自动连接仓库）

### 2.2 导入项目

1. 点击 **Add New...** → **Project**
2. 在 **Import Git Repository** 中找到你的 `furigana-app` 仓库
3. 点击 **Import**

### 2.3 配置项目设置

在导入页面，检查以下设置：

- **Framework Preset**：应为 **Next.js**（自动识别）
- **Root Directory**：如果仓库根目录就是 `furigana-app`，留空；如果是 monorepo，填写 `furigana-app`
- **Build Command**：应为 `npm run build`（已在 `package.json` 中配置，会自动执行 `prisma generate && prisma migrate deploy && next build`）
- **Output Directory**：留空（Next.js 默认）
- **Install Command**：`npm install`（默认）

**⚠️ 先不要点 Deploy！** 先配置环境变量。

---

## 步骤 3：配置环境变量

### 3.1 进入环境变量设置

在项目配置页面，点击左侧 **Environment Variables**，或部署后进入项目 → **Settings** → **Environment Variables**。

### 3.2 添加必配环境变量

按以下顺序添加，每个变量添加时**三个环境都勾选**（Production、Preview、Development）：

#### ① DATABASE_URL（数据库连接串）

- **Name**：`DATABASE_URL`
- **Value**：你的 PostgreSQL 连接串
  - 如果使用 **Neon**：从 Neon 控制台复制，格式如：
    ```
    postgresql://用户名:密码@ep-xxx.region.aws.neon.tech/数据库名?sslmode=require
    ```
  - 如果使用 **Vercel Postgres**：
    1. 在 Vercel 项目里打开 **Storage** 标签
    2. 创建 **Postgres** 数据库
    3. 创建后会自动生成环境变量，复制 `POSTGRES_URL` 或 `DATABASE_URL` 的值
  - 如果使用 **Railway**：从 Railway 项目的 **Variables** 标签复制 `DATABASE_URL`
- **Environment**：✅ Production ✅ Preview ✅ Development

#### ② SESSION_SECRET（会话密钥）

- **Name**：`SESSION_SECRET`
- **Value**：生成一个至少 32 字符的随机字符串
  - **Windows PowerShell**：
    ```powershell
    [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    ```
  - **或使用在线工具**：生成后复制整行
- **Environment**：✅ Production ✅ Preview ✅ Development

#### ③ NEXT_PUBLIC_APP_URL（站点根 URL）

- **Name**：`NEXT_PUBLIC_APP_URL`
- **Value**：
  - **首次部署**：先填 Vercel 分配的域名，如 `https://furigana-app-hsl.vercel.app`
  - **绑定自定义域名后**：改为 `https://你的域名.com`
- **Environment**：✅ Production ✅ Preview ✅ Development

### 3.3 可选环境变量（按需添加）

如果需要**发送验证码邮件**，添加：

| Name | Value | 说明 |
|------|-------|------|
| `SMTP_HOST` | `smtp.qq.com` 或 `smtp.gmail.com` | SMTP 服务器地址 |
| `SMTP_PORT` | `587` 或 `465` | SMTP 端口 |
| `SMTP_USER` | 你的邮箱 | SMTP 登录用户名 |
| `SMTP_PASS` | 邮箱授权码/密码 | SMTP 密码 |
| `SMTP_FROM` | `noreply@yourdomain.com` | 发件人显示地址 |

**注意**：手机号验证码目前只在后端日志中打印，暂不支持真实发送短信。如需真实发送，需接入短信服务商（如阿里云、Twilio）并配置相应环境变量。

### 3.4 保存环境变量

每添加一个变量后点击 **Save**，全部添加完成后返回项目配置页面。

---

## 步骤 4：首次部署

### 4.1 开始部署

在项目配置页面，点击 **Deploy** 按钮。

### 4.2 查看构建日志

部署开始后，Vercel 会显示构建进度。点击 **Building...** 或 **View Build Logs** 查看详细日志。

**正常构建流程**：
1. `npm install` - 安装依赖
2. `prisma generate` - 生成 Prisma Client
3. `prisma migrate deploy` - 应用数据库迁移（创建/更新表结构）
4. `next build` - 构建 Next.js 应用

### 4.3 常见构建错误及处理

#### ❌ 错误：`DATABASE_URL` must start with `postgresql://`

**原因**：环境变量未配置或格式错误。

**处理**：
1. 检查 **Settings → Environment Variables** 中是否有 `DATABASE_URL`
2. 确认值以 `postgresql://` 或 `postgres://` 开头
3. 重新部署

#### ❌ 错误：`SESSION_SECRET` must be at least 32 characters

**原因**：`SESSION_SECRET` 未配置或太短。

**处理**：
1. 在环境变量中添加 `SESSION_SECRET`（至少 32 字符）
2. 重新部署

#### ❌ 错误：Migration failed / Database connection error

**原因**：数据库连接失败或迁移冲突。

**处理**：
1. 检查 `DATABASE_URL` 是否正确（用户名、密码、主机、数据库名）
2. 确认数据库服务可访问（Neon/Railway 控制台检查状态）
3. 如果本地已执行过迁移，Vercel 部署时会检测到已应用，不会重复执行
4. 查看构建日志中的具体错误信息

#### ❌ 错误：Build failed / Module not found

**原因**：依赖安装失败或代码错误。

**处理**：
1. 本地运行 `npm run build` 检查是否有编译错误
2. 确认 `package.json` 中所有依赖都已正确安装
3. 检查构建日志中的具体错误

### 4.4 部署成功

当看到 **✅ Ready** 状态时，部署成功！

---

## 步骤 5：验证部署

### 5.1 访问网站

点击部署完成后的 **Visit** 链接，或直接访问：
- 生产环境：`https://furigana-app-hsl.vercel.app`（或你的自定义域名）
- 预览环境：每次 push 会生成预览链接

### 5.2 测试功能

#### ① 测试邮箱登录

1. 访问 `/login` 页面
2. 选择 **邮箱登录** Tab
3. 输入邮箱，点击「发送验证码」
4. 如果配置了 SMTP，检查邮箱收件箱；如果未配置，查看 Vercel 的 **Functions** 日志（`/api/auth/send-code`）
5. 输入验证码，点击「验证登录」
6. 应能成功登录并跳转到 `/dashboard`

#### ② 测试手机号登录

1. 在登录页选择 **手机登录** Tab
2. 输入手机号（如 `13800138000`），点击「发送验证码」
3. 查看 Vercel 的 **Functions** 日志（`/api/auth/send-code`），找到打印的验证码
4. 输入验证码，点击「验证登录」
5. 应能成功登录并跳转到 `/dashboard`

#### ③ 测试振假名功能

1. 登录后访问 `/dashboard`
2. 输入日文文本，点击「标注假名」
3. 确认结果正常显示，横向滚动条和滑块正常工作

### 5.3 检查数据库

如果使用 Neon 或 Railway，可以在控制台查看数据库表：

- `User` 表应有 `email`（可为空）和 `phone`（可为空）字段
- `Verification` 表应有 `email`（可为空）和 `phone`（可为空）字段
- 测试登录后，`User` 表中应有新用户记录

---

## 步骤 6：后续更新部署

### 6.1 代码更新后自动部署

Vercel 已连接 GitHub，每次 push 到主分支会自动触发部署：

```powershell
git add .
git commit -m "你的提交信息"
git push origin main
```

### 6.2 手动重新部署

如果需要手动触发部署：

1. 在 Vercel 项目页面，点击 **Deployments** 标签
2. 找到最新部署，点击右侧 **⋯** → **Redeploy**

### 6.3 预览部署

每次 push 到非主分支（如 `feature/xxx`）会生成预览部署，不影响生产环境。

---

## 步骤 7：可选配置

### 7.1 绑定自定义域名

1. 在 Vercel 项目 → **Settings** → **Domains**
2. 输入你的域名（如 `furigana.yourdomain.com`）
3. 按提示配置 DNS（添加 CNAME 记录）
4. 等待 DNS 生效后，更新 `NEXT_PUBLIC_APP_URL` 环境变量为你的域名

### 7.2 配置邮件发送（SMTP）

如果需要真实发送验证码邮件：

1. 准备 SMTP 服务（QQ 邮箱、Gmail、SendGrid 等）
2. 在 Vercel **Environment Variables** 中添加 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`
3. 重新部署后生效

### 7.3 配置短信发送（SMS）

目前手机验证码只在日志中打印。如需真实发送：

1. 选择短信服务商（阿里云、Twilio、腾讯云等）
2. 在代码中实现短信发送逻辑（参考 `app/api/auth/send-code/route.ts` 中的注释）
3. 添加相应的环境变量（如 `SMS_PROVIDER`、`SMS_API_KEY` 等）
4. 重新部署

---

## 📝 总结

部署流程总结：

1. ✅ **提交代码**：`git add .` → `git commit` → `git push`
2. ✅ **Vercel 导入**：连接 GitHub 仓库
3. ✅ **配置环境变量**：`DATABASE_URL`、`SESSION_SECRET`、`NEXT_PUBLIC_APP_URL`
4. ✅ **部署**：点击 Deploy，等待构建完成
5. ✅ **验证**：测试邮箱/手机登录、振假名功能

**重要提示**：
- 环境变量配置后需要重新部署才会生效
- 数据库迁移会在每次构建时自动执行（`prisma migrate deploy`）
- 如果本地和生产使用同一个数据库，迁移只会执行一次（已应用的迁移会被跳过）

---

## 🆘 遇到问题？

- **构建失败**：查看构建日志，检查环境变量、数据库连接、代码错误
- **登录失败**：检查 `SESSION_SECRET` 是否配置，查看 Functions 日志
- **数据库错误**：确认 `DATABASE_URL` 正确，数据库服务可访问
- **功能异常**：检查浏览器控制台和 Vercel Functions 日志
