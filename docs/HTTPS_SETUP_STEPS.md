# HTTPS 配置步骤（详细版）

## 前置条件

1. ✅ 已购买域名（如果没有，请先购买）
2. ✅ 域名已解析到服务器 IP `43.135.112.39`
3. ✅ 域名解析已生效（等待 5-30 分钟）

## 快速配置（使用脚本）

### 步骤 1: 上传脚本到服务器

将 `scripts/setup-https.sh` 上传到服务器，或直接在服务器上创建：

```bash
cd ~/furigana-app
nano scripts/setup-https.sh
```

复制脚本内容并保存。

### 步骤 2: 执行脚本

```bash
# 添加执行权限
chmod +x scripts/setup-https.sh

# 执行脚本（替换 your-domain.com 为你的实际域名）
bash scripts/setup-https.sh your-domain.com
```

脚本会自动：
- 安装 Nginx 和 Certbot
- 配置 Nginx 反向代理
- 申请 SSL 证书
- 配置自动续期

---

## 手动配置（如果脚本失败）

### 步骤 1: 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 步骤 2: 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 步骤 3: 配置 Nginx

创建配置文件（替换 `your-domain.com` 为你的域名）：

```bash
sudo nano /etc/nginx/sites-available/furigana-app
```

输入以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

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

保存并退出（Ctrl+X, Y, Enter）。

### 步骤 4: 启用配置

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

### 步骤 5: 开放防火墙端口

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 步骤 6: 申请 SSL 证书

```bash
# 替换 your-domain.com 为你的实际域名
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

按提示操作：
1. 输入邮箱（用于证书到期提醒）
2. 输入 `A` 同意服务条款
3. 选择是否分享邮箱（可选，输入 `Y` 或 `N`）
4. Certbot 会自动配置 Nginx 并申请证书

### 步骤 7: 验证 HTTPS

访问 `https://your-domain.com`，应该看到：
- ✅ 地址栏显示"安全"（绿色锁图标）
- ✅ 不再有"不安全"警告

### 步骤 8: 更新环境变量

```bash
cd ~/furigana-app
nano .env
```

修改 `NEXT_PUBLIC_APP_URL`：

```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

保存并退出。

### 步骤 9: 重启 Docker 容器

```bash
docker restart nihongo-go
```

---

## 验证配置

### 检查 SSL 证书

```bash
sudo certbot certificates
```

### 检查 Nginx 配置

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/furigana-app
```

### 检查服务状态

```bash
sudo systemctl status nginx
sudo systemctl status certbot.timer
```

---

## 常见问题

### Q1: 证书申请失败 - "Failed to verify domain"

**原因**：域名解析未生效或防火墙阻止

**解决**：
```bash
# 检查域名解析
nslookup your-domain.com

# 检查防火墙
sudo ufw status

# 确保 80/443 端口开放
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Q2: Nginx 配置测试失败

**解决**：
```bash
# 查看详细错误
sudo nginx -t

# 检查配置文件语法
sudo nginx -T | grep -A 20 "server_name"
```

### Q3: 访问域名仍显示不安全

**解决**：
```bash
# 检查证书是否安装
sudo certbot certificates

# 检查 Nginx 是否监听 443 端口
sudo netstat -tlnp | grep :443

# 清除浏览器缓存或使用隐私模式
```

### Q4: HTTP 未自动重定向到 HTTPS

Certbot 应该自动配置重定向，如果没有，手动添加：

```bash
sudo nano /etc/nginx/sites-available/furigana-app
```

在 `server { listen 80; ... }` 块中添加：

```nginx
return 301 https://$server_name$request_uri;
```

然后重启 Nginx：

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 完成后的检查清单

- [ ] 域名解析已生效（`nslookup your-domain.com`）
- [ ] Nginx 已安装并运行（`sudo systemctl status nginx`）
- [ ] SSL 证书已申请（`sudo certbot certificates`）
- [ ] HTTPS 访问正常（浏览器显示"安全"）
- [ ] HTTP 自动重定向到 HTTPS
- [ ] 环境变量已更新（`NEXT_PUBLIC_APP_URL`）
- [ ] Docker 容器已重启
- [ ] 网站功能正常

---

## 自动续期

Let's Encrypt 证书有效期 90 天，Certbot 会自动配置续期任务：

```bash
# 检查自动续期任务
sudo systemctl status certbot.timer

# 手动测试续期
sudo certbot renew --dry-run
```

证书会在到期前自动续期，无需手动操作。
