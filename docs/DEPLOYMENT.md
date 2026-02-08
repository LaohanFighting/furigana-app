# 部署流程与注意事项

## 1. 前置条件

- Node.js 18+
- npm 或 pnpm
- Vercel 账号（或 Cloudflare / Railway）
- 可选：PostgreSQL（Vercel Postgres / Railway / Supabase）
- 可选：SMTP（发验证码）、聚合支付（支付宝/微信）

## 2. 本地运行

```bash
cd furigana-app
npm install
cp .env.example .env
# 编辑 .env：至少设置 DATABASE_URL 和 SESSION_SECRET
echo 'DATABASE_URL="file:./dev.db"' >> .env
echo 'SESSION_SECRET="your-secret-at-least-32-characters-long"' >> .env
npx prisma generate
npx prisma db push
npm run dev
```

访问 http://localhost:3000 。未配置 SMTP 时，验证码会在终端日志中打印。

## 3. 部署到 Vercel（推荐）

### 3.1 一键部署

1. 将仓库推送到 GitHub，在 Vercel 中 Import 该仓库。
2. 根目录选择 `furigana-app`（若项目在子目录）或保持根目录为项目根。
3. Build Command: `npm run build` 或 `npx prisma generate && next build`（若需在 build 时生成 Prisma Client）。
4. Output: Next.js 自动识别。

### 3.2 环境变量（Vercel Dashboard → Settings → Environment Variables）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接串（生产用 Postgres） | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | JWT 密钥，至少 32 字符 | 随机字符串 |
| `NEXT_PUBLIC_APP_URL` | 站点根 URL | `https://yourdomain.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | 发邮件（验证码） | 按 SMTP 服务商填写 |
| `PAYMENT_API_URL` / `PAYMENT_APPID` / `PAYMENT_KEY` | 聚合支付 API | 按支付平台文档 |
| `PAYMENT_NOTIFY_URL` | 支付回调地址 | `https://yourdomain.com/api/payment/callback` |
| `PAYMENT_RETURN_URL` | 支付完成后跳转 | `https://yourdomain.com/dashboard?paid=1` |

### 3.3 数据库（生产）

- 本项目已使用 **PostgreSQL**（`prisma/schema.prisma` 中 `provider = "postgresql"`）。构建脚本已包含 `prisma migrate deploy`，Vercel 部署时会自动执行迁移。
- **Vercel Postgres**：在 Vercel 项目下创建 Storage → Postgres，将自动注入的 URL 填到 `DATABASE_URL`。
- **Railway**：创建 PostgreSQL 服务，复制连接串到 `DATABASE_URL`。
- 详细步骤见项目根目录 **VERCEL_DEPLOY.md**。

### 3.4 自定义域名与 HTTPS

- 在 Vercel 项目 Settings → Domains 添加域名，按提示在 DNS 添加 CNAME 或 A 记录。
- HTTPS 由 Vercel 自动签发。

## 4. 后端单独部署（可选）

若希望「前端 Vercel + 后端 Railway/Fly.io」：

1. 将 `app/api`、`lib`、Prisma、支付与鉴权逻辑抽成独立 Node 服务（如 Express/Fastify）。
2. 前端 `NEXT_PUBLIC_APP_URL` 指向前端域名；API 请求指向后端域名（如 `https://api.yourdomain.com`）。
3. 后端配置 CORS 允许前端域名；Cookie 若跨域需设置 `sameSite=None; secure` 且前端请求 `credentials: 'include'`。
4. 支付回调 URL 填后端地址，例如 `https://api.yourdomain.com/api/payment/callback`。

## 5. 注意事项

- **Kuroshiro/Kuromoji**：词典较大，首次冷启动可能较慢；Vercel Serverless 可能遇到 50MB 包限制，若超限可考虑将振假名接口部署到 Node 兼容的 Edge 或单独后端。
- **SESSION_SECRET**：生产必须使用强随机串，不要提交到仓库。
- **支付回调**：务必在支付平台后台配置正确的 notify_url；回调需验签，避免伪造。
- **邮件**：开发环境可不配 SMTP，验证码打日志；生产建议使用 SendGrid、阿里云邮件等。
- **合规**：上线前确认 Terms、Privacy、Refund 页面可访问，并在页脚提供联系邮箱（2410382485@qq.com）。

## 6. 上线检查清单

- [ ] 环境变量全部配置（含生产 DATABASE_URL、SESSION_SECRET）
- [ ] 数据库迁移已执行（Postgres）
- [ ] 自定义域名与 HTTPS 正常
- [ ] 登录与验证码（或日志）正常
- [ ] 振假名接口登录后可调通
- [ ] 支付回调 URL 已配置并验签
- [ ] Terms / Privacy / Refund 可访问，联系邮箱正确
