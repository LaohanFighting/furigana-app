# 日语假名标注工具 - Vercel 部署步骤

## 1. 把 furigana-app 推到 GitHub

**若当前仓库是 monorepo（根目录还有 backend、frontend 等）：**

- 在 GitHub 新建仓库（如 `furigana-app`），然后只推送子目录：
  ```bash
  cd furigana-app
  git init
  git remote add origin https://github.com/你的用户名/furigana-app.git
  git add .
  git commit -m "Initial: Next.js + Prisma PostgreSQL"
  git branch -M main
  git push -u origin main
  ```
- 若整个工作区就是一个 Git 仓库且根目录就是 furigana-app，直接：
  ```bash
  git add .
  git commit -m "Initial: Next.js + Prisma PostgreSQL"
  git push -u origin main
  ```

## 2. Vercel 导入并部署

1. 打开 [vercel.com](https://vercel.com) 并登录。
2. **Add New → Project**，选择 **Import Git Repository**，选中刚推送的 `furigana-app` 仓库。
3. **Root Directory**：若仓库根就是本项目，留空；若是 monorepo 且只推送了子目录，则根就是项目根，留空即可。
4. **Framework Preset**：保持 **Next.js**（自动识别）。
5. **Build Command**：保持默认 `npm run build`（已包含 `prisma generate && prisma migrate deploy && next build`）。
6. 先不要点 Deploy，先去配环境变量。

## 3. 环境变量（必配）

在 Vercel 项目 **Settings → Environment Variables** 中添加（Production / Preview / Development 按需勾选）。下方「环境变量详解」有逐项说明。

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | 见下方「数据库」 |
| `SESSION_SECRET` | JWT/会话密钥，≥32 字符 | 用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_APP_URL` | 站点根 URL | `https://xxx.vercel.app` 或自定义域名 |

---

### 环境变量详解

#### 必配（部署与构建必须）

| 变量 | 用途 | 格式 / 如何获取 | 注意 |
|------|------|-----------------|------|
| **DATABASE_URL** | Prisma 连接 PostgreSQL（用户、会话、验证码、订单等）。构建时会执行 `prisma migrate deploy`，运行时所有读写都依赖它。 | `postgresql://用户名:密码@主机:5432/数据库名?sslmode=require` | 从 Vercel Storage（Postgres）或 Railway 的数据库服务里复制；不要提交到 Git。 |
| **SESSION_SECRET** | 用于签发和校验登录态 JWT（`lib/auth-server.ts`）。未设置或过短会导致登录不可用或不安全。 | 至少 32 字符的随机字符串。生成方式：终端执行 `openssl rand -base64 32`，把输出整行粘贴进去。 | 生产环境必须设且不要泄露；每次换密钥会使所有用户需要重新登录。 |
| **NEXT_PUBLIC_APP_URL** | 站点根 URL，用于 SEO、邮件链接、支付回调等（如 `layout.tsx` 的 metadata）。带 `NEXT_PUBLIC_` 的变量会打进前端代码。 | 首次可填 Vercel 分配域名：`https://项目名-xxx.vercel.app`；绑定自定义域名后改为 `https://你的域名.com`。 | 不要末尾斜杠；必须与用户实际访问的域名一致。 |

#### 可选（需要时再配）

| 变量 | 用途 | 格式 / 如何获取 |
|------|------|-----------------|
| **SMTP_HOST** | 发验证码邮件的 SMTP 服务器（`api/auth/send-code`）。不配时验证码会打在后端日志里，不真实发邮件。 | 如 `smtp.qq.com`、`smtp.gmail.com`、SendGrid 的 `smtp.sendgrid.net` 等。 |
| **SMTP_PORT** | SMTP 端口，通常 587（TLS）或 465（SSL）。 | 数字，如 `587`。 |
| **SMTP_USER** | SMTP 登录用户名（多为邮箱）。 | 邮箱或服务商提供的用户名。 |
| **SMTP_PASS** | SMTP 密码或应用专用密码。 | 字符串；QQ 邮箱等需在邮箱设置里开启 SMTP 并生成授权码。 |
| **SMTP_FROM** | 发件人显示地址，不填时可能用 SMTP_USER。 | 如 `noreply@你的域名.com`。 |
| **PAYMENT_API_URL** | 支付接口基础 URL（`lib/payment.ts`）。不配则无法创建订单。 | 按支付平台文档，如 `https://api.xxx.com/pay`。 |
| **PAYMENT_APPID** | 支付平台分配的应用 ID。 | 字符串。 |
| **PAYMENT_KEY** | 支付平台密钥，用于签名/验签。 | 字符串；不要提交到 Git。 |
| **PAYMENT_NOTIFY_URL** | 支付成功后平台回调的地址，需公网可访问。 | 如 `https://你的域名.com/api/payment/callback`。 |
| **PAYMENT_RETURN_URL** | 支付完成或关闭页面后跳转的地址。 | 如 `https://你的域名.com/dashboard?paid=1`。 |
| **CONTACT_EMAIL** 或 **NEXT_PUBLIC_CONTACT_EMAIL** | 页脚「联系我们」等处的邮箱（`app/page.tsx` 使用）。 | 如 `your@email.com`。不配时代码里有默认邮箱。 |

**在 Vercel 里怎么填**：Deploy 前在「Environment Variables」中点「Add」，Name 填变量名，Value 填值；可勾选 Production / Preview / Development，一般三个都勾选即可。保存后重新部署一次才会生效。

## 4. 数据库（PostgreSQL）

本项目已使用 **PostgreSQL**（`prisma/schema.prisma` 中 `provider = "postgresql"`）。

**方式 A：Vercel Postgres**

1. 在 Vercel 项目里打开 **Storage**，创建 **Postgres**。
2. 创建完成后，在 Storage 页面把 **`.env`** 里列出的变量复制到项目的 **Environment Variables**；通常会把 `POSTGRES_URL` 等映射好，若提供的是 `DATABASE_URL` 可直接用，否则把给出的 URL 填到 `DATABASE_URL`。

**方式 B：Railway**

1. 在 [railway.app](https://railway.app) 新建项目，添加 **PostgreSQL** 服务。
2. 在服务里打开 **Variables**，复制 **DATABASE_URL**（或 Connection 里的 PostgreSQL URL）。
3. 把该连接串粘贴到 Vercel 的 `DATABASE_URL` 环境变量。若 Railway 给的 URL 带 `?sslmode=require` 等参数，保留即可。

## 5. 首次部署与迁移

1. 保存环境变量后，在 Vercel 点击 **Deploy**（或重新部署）。
2. 构建时会自动执行：
   - `prisma generate`
   - `prisma migrate deploy`（应用 `prisma/migrations` 中的迁移，创建表）
   - `next build`
3. 若构建失败，查看 Build Logs：常见原因是 `DATABASE_URL` 未配、网络无法连到数据库、或迁移冲突。

## 6. 可选：之后再加

- **发验证码邮件**：在 Vercel 环境变量中配置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM`。
- **收费与支付**：配置支付 API 与回调地址（如 `PAYMENT_*`、`PAYMENT_NOTIFY_URL`、`PAYMENT_RETURN_URL`）后再在支付平台后台填写回调 URL。

## 7. 本地用 Postgres 开发

- 使用同一 Vercel Postgres 或 Railway 的库（复制 `DATABASE_URL` 到本地 `.env`），或本地起一个 PostgreSQL。
- 本地首次：`npx prisma migrate deploy` 或 `npx prisma db push`（仅开发可考虑 `db push`）。
- 运行：`npm run dev`。

---

**小结**：推代码到 GitHub → Vercel 导入 → 配好 `DATABASE_URL`、`SESSION_SECRET`、`NEXT_PUBLIC_APP_URL` → 部署时自动执行 `prisma migrate deploy`；SMTP 和支付需要时再配。
