# 腾讯云轻量服务器部署（大陆用户访问）

将「日语通」部署到腾讯云轻量应用服务器（Lighthouse），供大陆用户直接访问。

## 一、前提条件

- 已购买腾讯云轻量服务器（推荐 Docker CE 镜像，如你当前的 2核/2GB/40GB SSD）
- 服务器公网 IP：例如 `43.135.112.39`
- 已有 PostgreSQL 数据库（可继续用 Vercel Postgres / Neon，或改用腾讯云 PostgreSQL）

## 二、服务器环境

你的实例已带 **Docker CE**，无需再装 Docker。若需确认：

```bash
docker --version
```

## 三、部署步骤

### 1. SSH 登录服务器

在腾讯云控制台获取 SSH 登录方式（密钥或密码），例如：

```bash
ssh root@43.135.112.39
```

### 2. 克隆代码

```bash
cd /opt
git clone https://github.com/LaohanFighting/furigana-app.git
cd furigana-app
```

（若仓库为私有，需在服务器配置 SSH key 或使用 Personal Access Token。）

### 3. 配置环境变量

```bash
cp .env.example .env
nano .env
```

在 `.env` 中至少填写：

```env
# 数据库（可继续用 Neon / Vercel Postgres 的 URL）
DATABASE_URL="postgresql://用户:密码@主机:5432/库名?sslmode=require"

# 会话密钥（至少 32 字符，随机生成）
SESSION_SECRET="请替换为至少32位的随机字符串"

# 站点 URL（用服务器 IP 或你绑定的域名）
NEXT_PUBLIC_APP_URL="http://43.135.112.39:3000"

# OpenAI（翻译、单词解释、朗读）
OPENAI_API_KEY="sk-..."
```

可选：SMTP、支付、短信等按需填写，见 `.env.example`。

### 4. 构建并运行 Docker

构建时已使用国内 npm 镜像（npmmirror），若 `npm ci` 失败会自动退回到 `npm install`。

```bash
docker build -t nihongo-go .

docker run -d \
  --name nihongo-go \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  nihongo-go
```

首次运行会自动执行 `prisma migrate deploy`，再启动 Next.js。

### 5. 开放端口

在腾讯云轻量服务器控制台 → 防火墙 / 安全组中，放行 **TCP 3000**。  
然后访问：`http://43.135.112.39:3000`。

### 6. 使用域名（可选）

若你有已备案域名（如 `nihongo.example.com`）：

1. 在域名 DNS 中添加 A 记录，指向 `43.135.112.39`。
2. 将 `.env` 中 `NEXT_PUBLIC_APP_URL` 改为 `https://nihongo.example.com`（若用 HTTPS，需在服务器上配置 Nginx + SSL 或使用腾讯云 SSL）。

## 四、更新部署

代码更新后，在服务器上：

```bash
cd /opt/furigana-app
git pull
docker build -t nihongo-go .
docker stop nihongo-go
docker rm nihongo-go
docker run -d --name nihongo-go -p 3000:3000 --env-file .env --restart unless-stopped nihongo-go
```

## 五、常用命令

```bash
# 查看容器日志
docker logs -f nihongo-go

# 停止
docker stop nihongo-go

# 启动
docker start nihongo-go
```

## 六、数据库说明

- 可继续使用当前 Vercel/Neon 的 PostgreSQL，只需在服务器 `.env` 里配置同一 `DATABASE_URL`，大陆用户访问的是腾讯云站点，数据库仍在海外，延迟可接受。
- 若希望数据库也在国内，可购买腾讯云 PostgreSQL，将 `DATABASE_URL` 改为腾讯云实例连接串。

## 七、与 Vercel 的关系

- **Vercel**（如 https://furigana-app-hsl.vercel.app）：可保留给海外用户或备用。
- **腾讯云轻量**（如 http://43.135.112.39:3000）：给大陆用户使用，同一套代码与数据库，仅部署在不同环境。
