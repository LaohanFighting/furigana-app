-- 日语振假名站点 - 数据库表结构 SQL
-- 与 Prisma schema 对应；生产环境建议使用 PostgreSQL。

-- SQLite 版本（开发）
-- Prisma 会据此生成迁移；以下为等价的手动建表参考。

-- Users: 用户
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "isPremium" INTEGER NOT NULL DEFAULT 0,
  "dailyUsed" INTEGER NOT NULL DEFAULT 0,
  "dailyResetAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- Sessions: 可选，当前实现使用 JWT 存 cookie，此表可预留
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Verification: 邮箱验证码
CREATE TABLE IF NOT EXISTS "Verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders: 支付订单
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "channel" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- 索引（按需）
CREATE INDEX IF NOT EXISTS "Order_orderId_idx" ON "Order"("orderId");
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Verification_email_idx" ON "Verification"("email");

-- ----------------
-- PostgreSQL 版本（生产）字段类型对照
-- ----------------
-- "id" TEXT -> id VARCHAR(255) 或 UUID
-- "isPremium" INTEGER -> is_premium BOOLEAN
-- "dailyUsed" INTEGER -> daily_used INT
-- "dailyResetAt" DATETIME -> daily_reset_at TIMESTAMP
-- "createdAt"/"updatedAt" -> created_at, updated_at TIMESTAMP
-- 使用 Prisma migrate 时，选择 provider = "postgresql" 即可自动生成对应 SQL。
