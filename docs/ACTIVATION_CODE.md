# 激活码系统使用指南

## 概述

激活码系统用于在小红书等平台售卖网站使用权。用户付款后，管理员生成激活码发给用户，用户输入激活码即可自动创建账号并获得使用权限。

## 功能特点

- ✅ **无需验证码**：用户不需要邮箱/SMS验证码，直接输入激活码即可
- ✅ **自动创建账号**：激活码使用后自动创建用户账号并设为 `approved`
- ✅ **自动登录**：激活成功后自动设置 session cookie，用户可直接使用
- ✅ **可设置过期时间**：激活码可设置有效期（可选）
- ✅ **可追踪**：每个激活码关联用户，便于管理

## 使用流程

### 1. 生成激活码

在服务器上执行（需要先配置好 `.env` 中的 `DATABASE_URL`）：

```bash
cd ~/furigana-app
node scripts/generate-activation-code.js [数量] [过期天数]
```

示例：
```bash
# 生成 10 个激活码，30 天后过期
node scripts/generate-activation-code.js 10 30

# 生成 1 个激活码，永不过期
node scripts/generate-activation-code.js 1 0
```

输出示例：
```
正在生成 10 个激活码（30天后过期）...

1. FURIGANA-A1B2-C3D4
2. FURIGANA-E5F6-G7H8
...

✅ 成功生成 10 个激活码！
```

### 2. 发给用户

用户在小红书付款后，把激活码发给用户，格式：`FURIGANA-XXXX-XXXX`

### 3. 用户激活

用户访问：`https://your-site.com/activate`

输入：
- **激活码**（必填）
- **邮箱**（可选，用于创建账号）
- **手机号**（可选，用于创建账号）

点击「激活」后：
- 系统自动创建账号（如果邮箱/手机号已存在，则更新该账号）
- 账号自动设为 `accessStatus: 'approved'`
- 自动登录并跳转到工具页面

## 数据库迁移

首次使用前，需要执行数据库迁移：

```bash
cd ~/furigana-app
npx prisma migrate deploy
```

或在开发环境：
```bash
npx prisma migrate dev
```

## 激活码格式

- 格式：`FURIGANA-XXXX-XXXX`
- 示例：`FURIGANA-A1B2-C3D4`
- 自动生成，确保唯一性

## 注意事项

1. **激活码只能使用一次**：使用后 `used` 字段设为 `true`，不能重复使用
2. **过期检查**：如果设置了 `expiresAt`，过期后无法使用
3. **邮箱/手机号**：激活时至少需要提供一个（邮箱或手机号），用于创建账号
4. **已存在账号**：如果邮箱/手机号已存在，会更新该账号为 `approved`，而不是创建新账号

## 管理员查看激活码使用情况

可在数据库中查询：

```sql
-- 查看所有激活码
SELECT code, used, "usedAt", "expiresAt", email, phone, "userId"
FROM "ActivationCode"
ORDER BY "createdAt" DESC;

-- 查看已使用的激活码
SELECT code, "usedAt", email, phone, "userId"
FROM "ActivationCode"
WHERE used = true
ORDER BY "usedAt" DESC;

-- 查看未使用的激活码
SELECT code, "expiresAt", email, phone
FROM "ActivationCode"
WHERE used = false
ORDER BY "createdAt" DESC;
```

## 在小红书售卖的流程

1. **用户付款**：用户在小红书完成付款
2. **生成激活码**：你执行脚本生成激活码
3. **发给用户**：通过小红书私信/评论把激活码发给用户
4. **用户激活**：用户访问 `/activate` 输入激活码
5. **开始使用**：激活后用户可直接使用所有功能

## 与现有登录系统的关系

- **激活码激活**：自动创建账号并设为 `approved`，无需验证码
- **邮箱/手机登录**：仍然保留，但需要 `accessStatus: 'approved'` 才能使用功能
- **申请权限**：仍然保留，管理员可手动审批

激活码系统是**付费用户的快速通道**，普通用户仍可通过申请权限的方式使用。
