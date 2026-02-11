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

在 `.env` 中至少填写（**DATABASE_URL 必须以 `postgresql://` 或 `postgres://` 开头**，否则 Prisma 会报 P1012）：

```env
# 数据库（可继续用 Neon / Vercel Postgres 的 URL）
DATABASE_URL="postgresql://用户:密码@主机:5432/库名?sslmode=require"

# 会话密钥（至少 32 字符，随机生成）
SESSION_SECRET="请替换为至少32位的随机字符串"

# 站点 URL（用服务器 IP 或你绑定的域名）
NEXT_PUBLIC_APP_URL="http://43.135.112.39:3000"

# OpenAI（翻译、单词解释、朗读）- 值不要加双引号
OPENAI_API_KEY=sk-...
# 若服务器在大陆被 OpenAI 403（unsupported_country_region），必须设代理，推荐 Cloudflare AI Gateway，见下文。
# OPENAI_API_BASE=https://gateway.ai.cloudflare.com/v1/你的账户ID/网关名称/openai
```

未配置 `OPENAI_API_KEY` 时，仅假名注音可用，翻译/单词解释/朗读会报错并在页面显示原因。

**大陆用户收不到邮箱验证码**：登录页已支持「手机登录」。建议配置阿里云短信（`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_CODE`），让用户用手机号收验证码，到达率更高。详见 [大陆用户验证码说明](MAINLAND_VERIFICATION.md)。可选：SMTP、支付等按需填写，见 `.env.example`。

#### 3.1 使用 Cloudflare AI Gateway（推荐，解决 403 地区限制）

服务器在大陆时，OpenAI 会返回 `403 unsupported_country_region_territory`。通过 Cloudflare AI Gateway 转发请求可规避地区限制，且免费额度通常够用。

**步骤一：创建 AI Gateway**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，选择你的账户。
2. 左侧进入 **AI** → **AI Gateway**。
3. 点击 **Create Gateway**。
4. 输入 **Gateway name**（例如 `furigana-openai`），点击 **Create**。
5. 创建完成后，在网关列表或详情页找到：
   - **Account ID**（账户 ID）
   - **Gateway 名称**（你刚填的 name）

**步骤二：获取 Base URL**

Base URL 格式为（把两处替换成你的实际值）：

```text
https://gateway.ai.cloudflare.com/v1/{Account_ID}/{Gateway_Name}/openai
```

示例：Account ID 为 `abc123`，Gateway 名为 `furigana-openai` 时：

```text
https://gateway.ai.cloudflare.com/v1/abc123/furigana-openai/openai
```

**步骤三：配置 .env**

在服务器 `~/furigana-app/.env` 中：

- `OPENAI_API_KEY` 仍填你的 **OpenAI API Key**（sk-...），不要加引号。
- 新增一行（不要加引号）：

```env
OPENAI_API_BASE=https://gateway.ai.cloudflare.com/v1/你的Account_ID/你的Gateway_Name/openai
```

若网关开启了 **Authentication**，需在 `.env` 中增加 Cloudflare 的 AIG 令牌（在 AI Gateway 中为该网关创建 API Token），例如：

```env
CLOUDFLARE_AIG_TOKEN=你的Cloudflare_AIG_令牌
```

应用会据此在请求中自动添加 `cf-aig-authorization: Bearer <令牌>`。若不设此变量，请保持网关**未开启认证**。

**步骤四：重新构建并启动容器**

修改过 `.env`（例如新增 `CLOUDFLARE_AIG_TOKEN`）或拉取过新代码后，必须**先重新构建镜像**再启动，否则容器内仍是旧版本，会继续 401。在服务器上执行：

```bash
cd ~/furigana-app
git pull
docker build -t nihongo-go .
docker rm -f nihongo-go
docker run -d --name nihongo-go -p 3001:3000 --env-file .env --restart unless-stopped nihongo-go
```

若未用 git，请把本地已改的 `lib/ai.ts`、`lib/tts.ts` 等同步到服务器后再执行 `docker build` 及下面两行。

**说明**：Cloudflare 文档中 OpenAI 网关主要提供 `chat/completions`（翻译、单词解释可用）。**日语朗读**使用 `/audio/speech`（TTS），需确认当前网关是否支持；若朗读仍 404 或报错，可单独为 TTS 使用其他代理，或仅使用翻译与单词解释。官方文档：[AI Gateway - Get started](https://developers.cloudflare.com/ai-gateway/get-started/)、[OpenAI provider](https://developers.cloudflare.com/ai-gateway/usage/providers/openai/)。

### 4. 构建并运行 Docker

构建时已使用国内 npm 镜像（npmmirror），若 `npm ci` 失败会自动退回到 `npm install`。

```bash
cd ~/furigana-app
docker build -t nihongo-go .
```

构建成功后，再启动容器。下面按顺序做即可。

#### 4.1 确认环境变量文件

```bash
# 必须在 ~/furigana-app 目录下，且 .env 已按「步骤 3」配置好
cd ~/furigana-app
ls -la .env
```

若没有 `.env`，先执行 `cp .env.example .env` 并用 `nano .env` 填写后再继续。

#### 4.2 处理旧容器（若之前跑过同名容器）

若之前已经用 `nihongo-go` 这个名字跑过容器，需要先停掉并删除，否则 `docker run` 会报“名字已存在”：

```bash
docker stop nihongo-go
docker rm nihongo-go
```

若从未跑过，可跳过；若不确定，执行上述两行也不会报错。

#### 4.3 启动容器

```bash
cd ~/furigana-app

docker run -d \
  --name nihongo-go \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  nihongo-go
```

- `-d`：后台运行  
- `--name nihongo-go`：容器名称，便于后续 `docker logs` / `docker stop`  
- `-p 3000:3000`：把主机 3000 端口映射到容器内 3000  
- `--env-file .env`：把当前目录下的 `.env` 注入为容器环境变量  
- `--restart unless-stopped`：服务器重启后容器自动拉起  

首次运行会先执行镜像内的 `prisma migrate deploy`，再启动 Next.js。

#### 4.4 检查是否启动成功

```bash
# 查看容器状态，应为 Up
docker ps

# 查看最近日志（若有报错会在这里）
docker logs --tail 50 nihongo-go
```

若 `docker ps` 里能看到 `nihongo-go` 且状态为 `Up`，说明容器已启动。此时在**服务器本机**可先测：

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000
```

若返回 `200` 或 `307` 等，说明应用在监听 3000 端口。若外网仍打不开，多半是防火墙未放行，见下一步。

---

### 5. 放行端口（防火墙）

容器把应用暴露在主机 **3000** 端口，外网要访问必须在腾讯云轻量控制台里放行该端口。

#### 5.1 进入防火墙设置

1. 登录 [腾讯云轻量应用服务器控制台](https://console.cloud.tencent.com/lighthouse/instance)。  
2. 在实例列表中点击你的服务器（如 `VM-0-9-ubuntu`）。  
3. 在实例详情页，找到并点击 **「防火墙」** 标签（或「安全」/「安全组」，不同控制台文案可能略有差异）。  
4. 若提示“未创建防火墙”，先点 **「创建防火墙」** 并关联到该实例。

#### 5.2 添加放行规则

1. 在防火墙规则列表中，点击 **「添加规则」**。  
2. 按下面填写：  
   - **协议**：TCP  
   - **端口**：`3000`（或 `3000/3000`，依控制台格式）  
   - **来源**：`0.0.0.0/0`（表示允许所有 IP 访问；若只允许自己访问可填本机公网 IP）  
   - **策略**：允许  
3. 保存 / 确定。

#### 5.3 验证外网访问

在浏览器访问（把 IP 换成你的服务器公网 IP）：

```
http://43.135.112.39:3000
```

若能打开日语通页面，说明启动容器和放行端口都已生效。

#### 若仍无法访问

- 再确认 `docker ps` 里 `nihongo-go` 为 `Up`。  
- 确认防火墙规则中 **协议为 TCP、端口为 3000**，且策略为 **允许**。  
- 若使用域名，需在 DNS 里把域名 A 记录指到该公网 IP，并视情况配置 Nginx/HTTPS（见下文「使用域名」）。

### 6. 使用域名（可选）

若你有已备案域名（如 `nihongo.example.com`）：

1. 在域名 DNS 中添加 A 记录，指向 `43.135.112.39`。
2. 将 `.env` 中 `NEXT_PUBLIC_APP_URL` 改为 `https://nihongo.example.com`（若用 HTTPS，需在服务器上配置 Nginx + SSL 或使用腾讯云 SSL）。

## 四、更新部署

代码更新后，在服务器上：

```bash
cd ~/furigana-app
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
