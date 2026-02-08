# 下一步你需要做什么

按顺序完成下面步骤即可本地运行，并（可选）上线。

---

## 一、本地跑起来（必做）

1. **打开终端**，进入项目目录：
   ```bash
   cd furigana-app
   ```

2. **安装依赖**（需已安装 Node.js 18+）：
   ```bash
   npm install
   ```

3. **初始化数据库**：
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **启动开发服务器**：
   ```bash
   npm run dev
   ```

5. 浏览器打开 **http://localhost:3000**  
   - 先点「登录」→ 输入邮箱 → 点「发送验证码」  
   - **验证码会在运行 `npm run dev` 的终端里打印**（未配 SMTP 时）  
   - 输入验证码登录后，进入「标注工具」即可试用振假名

---

## 二、要上线时再做

| 步骤 | 说明 |
|------|------|
| **部署** | 把 `furigana-app` 推到 GitHub，在 [Vercel](https://vercel.com) 里 Import 该仓库，用默认 Next.js 配置即可部署 |
| **数据库** | 在 Vercel 或 [Railway](https://railway.app) 建一个 PostgreSQL，把连接串填到 Vercel 环境变量 `DATABASE_URL`；并把 `prisma/schema.prisma` 里 `provider` 改为 `"postgresql"`，然后执行 `npx prisma migrate deploy` |
| **环境变量** | 在 Vercel 项目 Settings → Environment Variables 里至少填：`DATABASE_URL`、`SESSION_SECRET`（随机长串）、`NEXT_PUBLIC_APP_URL`（你的域名，如 `https://xxx.vercel.app`） |
| **发邮件（可选）** | 要用真实验证码邮件时，配置 `SMTP_*` 等变量，见 `.env.example` |
| **支付（可选）** | 选一家聚合支付（支付宝+微信），在后台配置回调 URL 为 `https://你的域名/api/payment/callback`，并把 `PAYMENT_*` 填到 Vercel 环境变量，见 `docs/PAYMENT_DESIGN.md` |

---

## 三、建议顺序

1. 先在本机完成「一」：能登录、能标注、能在终端看到验证码。  
2. 再部署到 Vercel，只配数据库和 `SESSION_SECRET`，确认线上能访问、能登录。  
3. 需要正式发验证码时再配 SMTP。  
4. 需要收费时再配支付与回调。

详细部署说明见 **`docs/DEPLOYMENT.md`**。
