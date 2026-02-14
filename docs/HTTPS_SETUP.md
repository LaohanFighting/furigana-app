# HTTPS 配置指南（解决网站不安全警告）

## 问题说明

当前网站通过 IP 地址访问（`http://43.135.112.39:3001`），浏览器会显示"不安全"警告。主要原因：
1. **没有 HTTPS**：使用 HTTP 而不是 HTTPS
2. **IP 地址访问**：使用 IP 而不是域名
3. **没有 SSL 证书**：浏览器无法验证网站身份

## 解决方案

### 方案一：配置域名 + HTTPS（推荐）

这是最彻底的解决方案，既能解决安全问题，又能提升用户体验。

#### 步骤 1：购买域名（如果还没有）

- **阿里云域名**：https://wanwang.aliyun.com
- **腾讯云域名**：https://dnspod.cloud.tencent.com
- **价格**：约 ¥10-50/年（.com/.cn）

#### 步骤 2：配置域名解析

在域名管理后台（阿里云/腾讯云），添加 A 记录：

- **主机记录**：`@`（表示根域名）或 `www`（表示 www 子域名）
- **记录类型**：A
- **记录值**：`43.135.112.39`（你的服务器 IP）
- **TTL**：600

示例：
- 如果域名是 `furigana-app.com`，添加 `@` 记录指向 `43.135.112.39`
- 访问地址：`http://furigana-app.com:3001`

#### 步骤 3：安装 Nginx 和配置 HTTPS

在服务器上执行：

```bash
# 1. 安装 Nginx
sudo apt update
sudo apt install -y nginx

# 2. 安装 Certbot（免费 SSL 证书工具）
sudo apt install -y certbot python3-certbot-nginx

# 3. 配置 Nginx（替换 your-domain.com 为你的实际域名）
sudo nano /etc/nginx/sites-available/furigana-app
```

在编辑器中输入以下配置（替换 `your-domain.com` 为你的域名）：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向 HTTP 到 HTTPS（申请证书后启用）
    # return 301 https://$server_name$request_uri;

    # 临时：HTTP 访问时转发到应用
    location / {
        proxy_pass http://localhost:3001;
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
```

保存并启用配置：

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/furigana-app /etc/nginx/sites-enabled/

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 步骤 4：申请 SSL 证书

```bash
# 申请 Let's Encrypt 免费 SSL 证书（替换为你的域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 按提示操作：
# 1. 输入邮箱（用于证书到期提醒）
# 2. 同意服务条款
# 3. 选择是否分享邮箱（可选）
# 4. Certbot 会自动配置 Nginx
```

#### 步骤 5：验证 HTTPS

访问 `https://your-domain.com`，应该看到：
- ✅ 地址栏显示"安全"（绿色锁图标）
- ✅ 不再有"不安全"警告

#### 步骤 6：自动续期

Let's Encrypt 证书有效期 90 天，Certbot 会自动配置续期任务：

```bash
# 检查自动续期任务（应该已自动配置）
sudo systemctl status certbot.timer

# 手动测试续期
sudo certbot renew --dry-run
```

#### 步骤 7：更新环境变量

在服务器上更新 `.env` 文件：

```bash
cd ~/furigana-app
nano .env
```

修改 `NEXT_PUBLIC_APP_URL`：

```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

重启 Docker 容器：

```bash
docker restart nihongo-go
```

---

### 方案二：仅配置 HTTPS（使用 IP 地址，不推荐）

如果暂时没有域名，可以尝试为 IP 地址配置 SSL，但**不推荐**，因为：
1. Let's Encrypt 不支持 IP 地址
2. 需要购买商业 SSL 证书
3. 浏览器仍可能显示警告

**建议**：优先使用方案一（域名 + HTTPS）。

---

### 方案三：临时解决方案（仅用于测试）

如果只是临时测试，可以：

1. **忽略浏览器警告**：点击"高级" → "继续访问"
2. **使用其他浏览器**：某些浏览器对 IP 地址访问更宽松
3. **配置本地 hosts**：将域名映射到 IP（仅本地有效）

---

## 常见问题

### Q1: 证书申请失败

**可能原因**：
- 域名解析未生效（等待 5-30 分钟）
- 防火墙阻止 80/443 端口
- Nginx 配置错误

**解决方法**：
```bash
# 检查域名解析
nslookup your-domain.com

# 检查端口是否开放
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 检查 Nginx 配置
sudo nginx -t
```

### Q2: 访问域名仍显示不安全

**可能原因**：
- 证书未正确安装
- Nginx 配置未启用 HTTPS
- 浏览器缓存

**解决方法**：
```bash
# 检查证书
sudo certbot certificates

# 检查 Nginx 配置（应该包含 listen 443 ssl）
sudo cat /etc/nginx/sites-available/furigana-app

# 清除浏览器缓存或使用隐私模式
```

### Q3: 证书到期续期失败

**解决方法**：
```bash
# 手动续期
sudo certbot renew

# 检查续期日志
sudo journalctl -u certbot.timer
```

---

## 完成后的效果

配置成功后：
- ✅ 网站通过 `https://your-domain.com` 访问
- ✅ 浏览器显示"安全"（绿色锁图标）
- ✅ 不再有"不安全"警告
- ✅ 自动从 HTTP 重定向到 HTTPS
- ✅ SSL 证书自动续期

---

## 参考文档

- [Let's Encrypt 官方文档](https://letsencrypt.org/docs/)
- [Certbot 使用指南](https://certbot.eff.org/)
- [Nginx 反向代理配置](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
