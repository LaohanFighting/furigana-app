# 日语振假名（Furigana）商业级网站

日文汉字自动标注平假名（振假名），输出标准 `<ruby><rt>` HTML，可复制、可 SEO。支持邮箱验证码登录、免费每日次数限制、付费无限次（支付宝/微信）。

## 技术栈

- **前端**：Next.js 14 (App Router)、React、Tailwind CSS、多语言（中/日/英）
- **后端**：Next.js API Routes（Node.js）、Kuroshiro + Kuromoji 日语解析
- **数据库**：Prisma（SQLite 开发 / PostgreSQL 生产）
- **支付**：聚合支付（支付宝/微信），见 `docs/PAYMENT_DESIGN.md`

## 快速开始

```bash
npm install
cp .env.example .env
# 至少设置 DATABASE_URL 和 SESSION_SECRET
npx prisma generate
npx prisma db push
npm run dev
```

打开 http://localhost:3000 。未配置 SMTP 时验证码会在终端输出。

## 文档

- [整体系统架构](docs/ARCHITECTURE.md)
- [数据库表结构 SQL](docs/DATABASE.sql)
- [支付接口设计示例](docs/PAYMENT_DESIGN.md)
- [部署流程与注意事项](docs/DEPLOYMENT.md)

## 核心接口

- `POST /api/furigana` — 请求体 `{ "text": "日文" }`，返回 `{ "html": "<ruby>...</ruby>", "remaining" }`
- `POST /api/auth/send-code` — 发送验证码
- `POST /api/auth/verify` — 验证码登录
- `GET /api/auth/me` — 当前用户信息
- `POST /api/payment/create` — 创建支付订单
- `POST /api/payment/callback` — 支付平台回调（验签后更新订单与 premium）

## 合规与联系

- [服务条款](/terms)
- [隐私政策](/privacy)
- [退款政策](/refund)
- 联系邮箱：2410382485@qq.com
