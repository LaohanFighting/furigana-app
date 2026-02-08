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

在 Vercel 项目 **Settings → Environment Variables** 中添加（Production / Preview / Development 按需勾选）：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | 见下方「数据库」 |
| `SESSION_SECRET` | JWT/会话密钥，≥32 字符 | 用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_APP_URL` | 站点根 URL | `https://xxx.vercel.app` 或自定义域名 |

- **SESSION_SECRET**：本地执行 `openssl rand -base64 32`，把输出粘贴进去。
- **NEXT_PUBLIC_APP_URL**：首次部署可用 Vercel 分配的域名，如 `https://furigana-app-xxx.vercel.app`，绑定自定义域名后再改。

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
