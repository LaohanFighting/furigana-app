# 日语振假名（Furigana）站点 - 整体系统架构说明

## 1. 架构总览

```
                    ┌─────────────────────────────────────────────────┐
                    │                    用户浏览器                      │
                    │  Next.js 前端 (React + Tailwind) + 多语言 (中/日/英) │
                    └─────────────────────┬───────────────────────────┘
                                          │ HTTPS
                    ┌─────────────────────▼───────────────────────────┐
                    │            Vercel / Cloudflare Pages              │
                    │  Next.js App Router (SSR + API Routes)            │
                    │  - /             首页                              │
                    │  - /dashboard   标注工具（需登录）                  │
                    │  - /login       邮箱+验证码登录                    │
                    │  - /api/furigana 振假名生成（服务端）               │
                    │  - /api/auth/*  登录、验证、登出、me               │
                    │  - /api/payment/* 创建订单、支付回调               │
                    └─────────────────────┬───────────────────────────┘
                                          │
          ┌───────────────────────────────┼───────────────────────────────┐
          │                               │                                 │
          ▼                               ▼                                 ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│  数据库           │           │  振假名引擎       │           │  支付/邮件       │
│  (Vercel Postgres │           │  Kuroshiro +     │           │  聚合支付回调     │
│  或 Railway PG)   │           │  Kuromoji        │           │  SMTP 验证码     │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

- **前端**：Next.js 14 App Router、React、Tailwind CSS；多语言通过 URL `?lang=zh|ja|en` + 前端文案字典实现。
- **后端**：与前端同仓库，使用 Next.js API Routes（Node.js 运行），振假名在服务端用 Kuroshiro 生成，保证不暴露词典与逻辑。
- **数据库**：Prisma ORM，支持 SQLite（开发）/ PostgreSQL（生产）；表：users、orders、Session、Verification。
- **支付**：对接中国聚合支付（如虎皮椒、PayJS、易支付），后端生成订单并跳转支付，异步回调更新订单状态并将用户设为 premium。

## 2. 核心数据流

### 2.1 振假名生成

1. 用户在前端输入日文文本 → 点击「标注振假名」。
2. 前端 `POST /api/furigana`，body `{ text }`，携带 cookie（session）。
3. 服务端校验 session、免费用户当日次数；调用 `textToFuriganaHtml(text)`（Kuroshiro `mode: "furigana"`）得到 `漢字(よみ)` 形式，再转换为 `<ruby>漢字<rt>よみ</rt></ruby>`。
4. 返回 `{ success, html, remaining? }`；前端将 `html` 用 `dangerouslySetInnerHTML` 渲染，并可复制。

### 2.2 登录

1. 用户输入邮箱 → `POST /api/auth/send-code` → 服务端生成 6 位验证码写入 Verification 表，发邮件（或开发环境打日志）。
2. 用户输入验证码 → `POST /api/auth/verify` → 校验通过则创建/获取 User，签发 JWT 写入 cookie，返回用户信息。

### 2.3 支付

1. 用户点击升级 → `POST /api/payment/create`，body `{ channel: "alipay"|"wechat" }`。
2. 服务端创建 Order（pending），调用聚合支付 API 获取支付链接/二维码，返回 `payUrl`。
3. 前端跳转 `payUrl` 完成支付；支付平台异步 POST 到 `/api/payment/callback`。
4. 回调验签、根据 `out_trade_no` 更新订单为 paid、对应用户 `isPremium = true`，返回 `success`。

## 3. 技术选型说明

| 模块       | 选型              | 说明 |
|------------|-------------------|------|
| 日语解析   | Kuroshiro + Kuromoji | 纯 JS，Node 可用；furigana 模式输出 `漢字(読み)`，便于转 ruby。 |
| 会话       | JWT（jose）+ HttpOnly Cookie | 无状态，易横向扩展。 |
| 数据库     | Prisma + SQLite/Postgres | 开发用 SQLite，生产用 Postgres（Vercel/Railway）。 |
| 支付       | 聚合平台（支付宝+微信） | 满足「必须支持中国」；具体验签与参数以平台文档为准。 |

## 4. 安全与合规要点

- 振假名接口需登录；免费用户按日限流（如 20 次/日），付费用户不限。
- 支付回调必须验签，仅处理 `status=paid/success`，防止伪造。
- 隐私政策、服务条款、退款政策已提供页面，联系邮箱：2410382485@qq.com。
- 全站 HTTPS、生产环境 Cookie 设置 `secure`、`sameSite`。

## 5. 部署拓扑（推荐）

- **前端 + API**：整体部署在 **Vercel**（或 Cloudflare Pages + Functions），一个项目即可，API Routes 与页面同域。
- **数据库**：Vercel Postgres 或 **Railway** PostgreSQL，在 Vercel 环境变量中配置 `DATABASE_URL`。
- **域名**：在 Vercel 绑定自定义域名，自动 HTTPS。
- 若希望 API 与前端分离：前端 Vercel，API 单独部署到 Railway/Fly.io，则需将 Next.js 中的 `app/api/*` 拆成独立 Node 服务，并配置 CORS 与 cookie 域名。

本仓库采用「单 Next.js 应用」部署，便于直接上线与维护。
