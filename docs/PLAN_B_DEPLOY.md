# 方案 B 推进与部署清单

## 一、已就绪内容

- **领取页**：`/claim`（用户填订单号+手机后4位，提交/查询激活码）
- **管理后台**：`/dashboard/admin/deliveries`（待发放列表、点击「发放」自动分配激活码）
- **API**：`POST /api/claim`、`GET /api/claim/status`、`GET/POST /api/admin/deliveries`、`POST /api/admin/deliveries/issue`
- **数据库**：新增表 `DeliveryRequest`，迁移文件 `prisma/migrations/20250212000000_add_delivery_request/migration.sql`
- **话术模板**：见 `docs/XIAOHONGSHU_AUTO_DELIVERY.md`

## 二、部署步骤（服务器）

在**服务器**上按顺序执行。

### 1. 拉取代码

```bash
cd ~/furigana-app
git pull
```

### 2. 安装依赖（若需）

若之前未装过 `bcryptjs`，在**项目目录**执行（若用 Docker 部署可跳过，见下）：

```bash
npm install
```

### 3. 执行数据库迁移

**重要**：必须在能连上生产数据库的环境执行（本机或服务器，有正确 `DATABASE_URL` 即可）。

在服务器上（若应用跑在 Docker 里，进容器执行）：

```bash
cd ~/furigana-app
npx prisma migrate deploy
```

若迁移在容器内执行：

```bash
docker exec -it nihongo-go npx prisma migrate deploy
```

（若容器内没有迁移文件，需先在宿主机执行 `npx prisma migrate deploy`，再重新 build 并重启容器。）

### 4. 重新构建并重启容器

```bash
cd ~/furigana-app
docker build -t nihongo-go .
docker rm -f nihongo-go
docker run -d --name nihongo-go -p 3001:3000 --env-file .env --restart unless-stopped nihongo-go
```

### 5. 确认管理员账号

发货管理仅**管理员**可访问。确保至少有一个用户的 `isAdmin = true`。

在数据库或通过脚本设置，例如（需在能连库的环境执行）：

```sql
-- 将某用户设为管理员（替换为实际用户 id 或 email）
UPDATE "User" SET "isAdmin" = true WHERE email = '你的管理员邮箱';
```

或临时在 Prisma Studio / 数据库管理工具里把对应用户的 `isAdmin` 设为 `true`。

## 三、上线后自测

1. **领取页**  
   打开 `https://你的域名/claim`，填写订单号（可填测试如 `test001`）+ 手机后4位（如 `1234`），提交。应提示「提交成功，请等待发放」。

2. **管理后台**  
   用管理员账号登录 → 打开「管理」→「发货管理」（或 `https://你的域名/dashboard/admin/deliveries`）。应看到刚才的待发放记录，点击「发放」。若提示「暂无可用激活码」，需先生成：
   ```bash
   docker exec -it nihongo-go node scripts/generate-activation-code.js 10 0
   ```

3. **用户查询**  
   回到领取页，再次输入同一订单号+手机后4位，点「查询是否已发放」。应看到激活码和激活链接。

4. **激活与登录**  
   用查到的激活码打开 `https://你的域名/activate`，按提示设置密码，再打开 `https://你的域名/login` 用邮箱/手机号+密码登录。

## 四、可选：预生成激活码

建议上线前预生成一批激活码，避免首单发放时提示「暂无可用激活码」：

```bash
docker exec -it nihongo-go node scripts/generate-activation-code.js 50 0
```

## 五、链接汇总（替换为你的域名）

| 用途         | 链接                    |
|--------------|-------------------------|
| 领取激活码   | https://你的域名/claim  |
| 激活并设密码 | https://你的域名/activate |
| 登录         | https://你的域名/login  |
| 管理员-发货  | https://你的域名/dashboard/admin/deliveries |

将上述链接写入 `docs/XIAOHONGSHU_AUTO_DELIVERY.md` 中的话术模板后即可发给用户使用。
