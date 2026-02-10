# 虎皮椒支付中转服务部署指南（方案一）

## 📋 概述

由于 Vercel 服务器在国外无法直接访问虎皮椒 API，我们需要在国内/香港部署一个中转服务来代理支付请求。

**架构：**
```
用户浏览器 → Vercel 网站 → 中转服务器（国内/香港）→ 虎皮椒 API
```

---

## 第一步：购买服务器（约 5-10 分钟）

### 1.1 推荐方案（按价格从低到高）

#### 选项 A：阿里云轻量应用服务器（推荐）
- **价格**：约 ¥24/月（1核2G，香港节点）
- **优点**：便宜、配置简单、有中文支持
- **购买地址**：https://www.aliyun.com/product/swas
- **选择**：香港节点（保证能访问外网）

#### 选项 B：腾讯云轻量应用服务器
- **价格**：约 ¥24-30/月（1核2G，香港节点）
- **购买地址**：https://cloud.tencent.com/product/lighthouse

#### 选项 C：华为云 ECS（按需付费）
- **价格**：约 ¥0.5-1/小时（按需计费）
- **适合**：短期测试

### 1.2 购买时注意
- ✅ **地域选择**：香港或国内（北京/上海/广州）
- ✅ **配置**：1核2G 足够（中转服务很轻量）
- ✅ **系统**：Ubuntu 20.04 或 22.04（推荐）
- ✅ **网络**：公网 IP（必须）

---

## 第二步：配置服务器（约 15-30 分钟）

### 2.1 连接服务器

**Windows（PowerShell）：**
```powershell
ssh root@你的服务器IP
# 输入密码（购买时设置的）
```

**Mac/Linux：**
```bash
ssh root@你的服务器IP
```

### 2.2 安装 Node.js（约 5 分钟）

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 18.x（LTS 版本）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# 验证安装
node -v  # 应该显示 v18.x.x
npm -v   # 应该显示 9.x.x
```

### 2.3 安装 PM2（进程管理，可选但推荐）

```bash
npm install -g pm2
```

PM2 可以让服务在后台运行，服务器重启后自动启动。

### 2.4 配置防火墙（如果需要）

```bash
# 开放 3000 端口（中转服务默认端口）
ufw allow 3000/tcp
ufw enable
```

---

## 第三步：部署中转服务（约 10-15 分钟）

### 3.1 创建项目目录

```bash
mkdir -p /opt/xunhu-proxy
cd /opt/xunhu-proxy
```

### 3.2 创建 `package.json`

```bash
cat > package.json << 'EOF'
{
  "name": "xunhu-proxy",
  "version": "1.0.0",
  "description": "XunhuPay proxy service",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-fetch": "^2.7.0"
  }
}
EOF
```

### 3.3 创建 `index.js`（中转服务代码）

```bash
cat > index.js << 'EOF'
const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// 从环境变量读取虎皮椒的 APPID / KEY
const APPID = process.env.XUNHU_APPID;
const APPSECRET = process.env.XUNHU_APPSECRET;

// 签名函数（和 Vercel 项目里一样）
function signXunhu(params, secret) {
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'hash' && v !== undefined && v !== null && v !== '') {
      filtered[k] = String(v);
    }
  }
  const sortedKeys = Object.keys(filtered).sort();
  const signStr = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&') + secret;
  return crypto.createHash('md5').update(signStr).digest('hex');
}

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 你的 Vercel 网站会 POST 到这里
app.post('/xunhu/create', async (req, res) => {
  try {
    const { trade_order_id, total_fee, title, notify_url, return_url, channel } = req.body || {};
    
    if (!APPID || !APPSECRET) {
      console.error('[proxy] Missing XUNHU_APPID or XUNHU_APPSECRET');
      return res.status(500).json({ 
        success: false, 
        error: 'Proxy server not configured. Set XUNHU_APPID and XUNHU_APPSECRET environment variables.' 
      });
    }

    if (!trade_order_id || !total_fee || !notify_url || !return_url) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: trade_order_id, total_fee, notify_url, return_url' 
      });
    }

    const params = {
      version: '1.1',
      appid: APPID,
      trade_order_id,
      total_fee: String(total_fee),  // 确保是字符串，例如 "9.9"
      title: title || 'Furigana Premium',
      notify_url,
      return_url,
      type: channel === 'wechat' ? 'wechat' : 'alipay',
    };

    const hash = signXunhu(params, APPSECRET);
    params.hash = hash;

    // 转换为 form-data 格式
    const form = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => form.append(k, v));

    console.log('[proxy] Calling XunhuPay API:', {
      trade_order_id,
      total_fee,
      channel,
      notify_url,
    });

    const resp = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const data = await resp.json().catch(() => null);
    
    if (!data) {
      console.error('[proxy] Failed to parse XunhuPay response');
      return res.status(500).json({ success: false, error: 'Failed to parse XunhuPay response' });
    }

    if (data.errcode !== 0 || !data.url) {
      console.error('[proxy] XunhuPay error:', data);
      return res.status(400).json({ 
        success: false, 
        error: data.errmsg || 'XunhuPay API error',
        errcode: data.errcode,
      });
    }

    console.log('[proxy] Success, payUrl generated for order:', trade_order_id);
    
    // 只返回支付链接给 Vercel
    return res.json({ 
      success: true, 
      payUrl: data.url,
      orderId: trade_order_id,
    });
  } catch (e) {
    console.error('[proxy] Error:', e);
    return res.status(500).json({ 
      success: false, 
      error: e.message || 'Proxy server error' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[proxy] XunhuPay proxy server listening on port ${PORT}`);
  console.log(`[proxy] Health check: http://localhost:${PORT}/health`);
  if (!APPID || !APPSECRET) {
    console.warn('[proxy] WARNING: XUNHU_APPID or XUNHU_APPSECRET not set!');
  }
});
EOF
```

### 3.4 安装依赖

```bash
npm install
```

### 3.5 配置环境变量

```bash
# 设置虎皮椒的 APPID 和 APPSECRET（从虎皮椒后台复制）
export XUNHU_APPID="你的虎皮椒APPID"
export XUNHU_APPSECRET="你的虎皮椒APPSECRET"

# 测试运行（前台运行，看日志）
node index.js
```

**预期输出：**
```
[proxy] XunhuPay proxy server listening on port 3000
[proxy] Health check: http://localhost:3000/health
```

按 `Ctrl+C` 停止测试。

### 3.6 使用 PM2 后台运行（推荐）

```bash
# 设置环境变量（PM2 会读取）
export XUNHU_APPID="你的虎皮椒APPID"
export XUNHU_APPSECRET="你的虎皮椒APPSECRET"

# 启动服务
pm2 start index.js --name xunhu-proxy --env production

# 设置开机自启
pm2 save
pm2 startup

# 查看状态
pm2 status
pm2 logs xunhu-proxy
```

---

## 第四步：配置域名和 HTTPS（可选但推荐）

### 4.1 购买域名（如果还没有）

- 阿里云域名：https://wanwang.aliyun.com
- 腾讯云域名：https://dnspod.cloud.tencent.com
- 价格：约 ¥10-50/年（.com/.cn）

### 4.2 配置域名解析

在域名管理后台，添加 A 记录：
- **主机记录**：`proxy`（或 `pay`）
- **记录类型**：A
- **记录值**：你的服务器 IP 地址
- **TTL**：600

等待解析生效（通常 5-30 分钟）。

### 4.3 安装 Nginx 和配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Nginx
apt install -y nginx

# 安装 Certbot（免费 SSL 证书）
apt install -y certbot python3-certbot-nginx

# 配置 Nginx（替换 your-domain.com 为你的域名）
cat > /etc/nginx/sites-available/xunhu-proxy << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/xunhu-proxy /etc/nginx/sites-enabled/
nginx -t  # 测试配置
systemctl restart nginx

# 申请 SSL 证书
certbot --nginx -d your-domain.com  # 改成你的域名

# 自动续期（已自动配置）
```

**完成后，你的中转服务地址就是：**
```
https://your-domain.com/xunhu/create
```

**如果没有域名，也可以直接用 IP（不推荐生产环境）：**
```
http://你的服务器IP:3000/xunhu/create
```

---

## 第五步：修改 Vercel 项目代码（约 5 分钟）

### 5.1 修改 `lib/payment.ts`

需要修改 `createPaymentOrder` 函数，将直接调用虎皮椒改为调用中转服务器。

**关键改动：**
- 不再直接 `fetch('https://api.xunhupay.com/...')`
- 改为 `fetch(process.env.PAYMENT_API_URL, ...)`，其中 `PAYMENT_API_URL` 指向你的中转服务器

### 5.2 更新 Vercel 环境变量

在 Vercel 项目 → **Settings** → **Environment Variables**：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PAYMENT_API_URL` | `https://your-domain.com/xunhu/create` | 你的中转服务器地址 |
| `PAYMENT_NOTIFY_URL` | `https://furigana-app-hsl.vercel.app/api/payment/callback` | 保持不变 |
| `PAYMENT_RETURN_URL` | `https://furigana-app-hsl.vercel.app/dashboard` | 保持不变 |

**删除或保留（不再使用）：**
- `PAYMENT_APPID`（可选删除，中转服务器已配置）
- `PAYMENT_KEY`（可选删除，中转服务器已配置）

### 5.3 重新部署

```bash
git add .
git commit -m "feat: use proxy server for XunhuPay API"
git push origin main
```

---

## 第六步：测试（约 5 分钟）

### 6.1 测试中转服务

```bash
# 在服务器上测试
curl http://localhost:3000/health

# 从外部测试（用你的域名或 IP）
curl https://your-domain.com/health
```

**预期返回：**
```json
{"status":"ok","timestamp":"2026-02-09T..."}
```

### 6.2 测试支付流程

1. 访问 `https://furigana-app-hsl.vercel.app/dashboard/upgrade`
2. 选择支付方式（支付宝或微信）
3. 点击「去支付」
4. **预期**：应该跳转到虎皮椒支付页面（不再是 "fetch failed"）

### 6.3 查看日志

**中转服务器日志：**
```bash
pm2 logs xunhu-proxy
```

**Vercel 日志：**
- Vercel Dashboard → Deployments → 最新部署 → Functions → `/api/payment/create`

---

## 第七步：常见问题排查

### ❌ 错误：中转服务无法启动

**检查：**
```bash
# 检查 Node.js 是否安装
node -v

# 检查端口是否被占用
netstat -tulpn | grep 3000

# 检查环境变量
echo $XUNHU_APPID
echo $XUNHU_APPSECRET
```

### ❌ 错误：Vercel 无法访问中转服务器

**检查：**
1. 服务器防火墙是否开放 3000 端口（或 80/443）
2. 域名解析是否正确
3. 中转服务是否在运行：`pm2 status`

### ❌ 错误：支付链接生成失败

**检查中转服务器日志：**
```bash
pm2 logs xunhu-proxy --lines 50
```

**常见原因：**
- APPID 或 APPSECRET 错误
- 虎皮椒 API 返回错误（查看 `errcode` 和 `errmsg`）

---

## 📝 总结

**完成后的架构：**
```
用户 → Vercel 网站 → 中转服务器（国内/香港）→ 虎皮椒 API ✅
```

**关键点：**
- ✅ 中转服务器在国内/香港，可以访问虎皮椒
- ✅ Vercel 网站调用中转服务器（不受地域限制）
- ✅ 回调地址仍然指向 Vercel（虎皮椒 → Vercel，可以正常到达）

**成本：**
- 服务器：约 ¥24-30/月（轻量应用服务器）
- 域名：约 ¥10-50/年（可选）
- **总计：约 ¥30-80/月**

---

## 🆘 需要帮助？

如果遇到问题：
1. 查看中转服务器日志：`pm2 logs xunhu-proxy`
2. 查看 Vercel Functions 日志
3. 检查环境变量是否正确配置
4. 确认服务器能访问 `https://api.xunhupay.com`
