#!/bin/bash
# HTTPS 配置脚本 - 为日语通网站配置 HTTPS
# 使用方法：bash setup-https.sh your-domain.com

set -e

# 检查参数
if [ -z "$1" ]; then
    echo "错误：请提供域名"
    echo "使用方法：bash setup-https.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
SERVER_IP="43.135.112.39"
APP_PORT="3001"

echo "=========================================="
echo "开始配置 HTTPS for $DOMAIN"
echo "=========================================="

# 步骤 1: 更新系统包
echo ""
echo "步骤 1: 更新系统包..."
sudo apt update

# 步骤 2: 安装 Nginx
echo ""
echo "步骤 2: 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    echo "✓ Nginx 安装完成"
else
    echo "✓ Nginx 已安装"
fi

# 步骤 3: 安装 Certbot
echo ""
echo "步骤 3: 安装 Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo "✓ Certbot 安装完成"
else
    echo "✓ Certbot 已安装"
fi

# 步骤 4: 配置 Nginx
echo ""
echo "步骤 4: 配置 Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/furigana-app"

sudo tee $NGINX_CONFIG > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # 临时：HTTP 访问时转发到应用
    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo "✓ Nginx 配置已创建"

# 步骤 5: 启用配置
echo ""
echo "步骤 5: 启用 Nginx 配置..."
sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/furigana-app

# 删除默认配置（如果存在）
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# 测试配置
echo ""
echo "测试 Nginx 配置..."
if sudo nginx -t; then
    echo "✓ Nginx 配置测试通过"
    sudo systemctl restart nginx
    echo "✓ Nginx 已重启"
else
    echo "✗ Nginx 配置测试失败，请检查配置"
    exit 1
fi

# 步骤 6: 检查防火墙
echo ""
echo "步骤 6: 检查防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "✓ 防火墙端口已开放"
fi

# 步骤 7: 申请 SSL 证书
echo ""
echo "=========================================="
echo "步骤 7: 申请 SSL 证书"
echo "=========================================="
echo "请确保："
echo "1. 域名 $DOMAIN 已解析到 $SERVER_IP"
echo "2. 域名解析已生效（等待 5-30 分钟）"
echo ""
read -p "域名解析是否已生效？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "开始申请 SSL 证书..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "✓ SSL 证书申请成功！"
        echo "=========================================="
        echo ""
        echo "网站现在可以通过以下地址访问："
        echo "  https://$DOMAIN"
        echo "  https://www.$DOMAIN"
        echo ""
        echo "HTTP 请求会自动重定向到 HTTPS"
        echo ""
    else
        echo ""
        echo "✗ SSL 证书申请失败"
        echo "可能原因："
        echo "1. 域名解析未生效（等待更长时间）"
        echo "2. 防火墙阻止 80/443 端口"
        echo "3. Nginx 配置错误"
        echo ""
        echo "请检查后重试："
        echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    fi
else
    echo ""
    echo "请等待域名解析生效后，手动执行："
    echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# 步骤 8: 更新环境变量提示
echo ""
echo "=========================================="
echo "下一步：更新环境变量"
echo "=========================================="
echo "请编辑 ~/furigana-app/.env 文件："
echo ""
echo "  nano ~/furigana-app/.env"
echo ""
echo "将 NEXT_PUBLIC_APP_URL 改为："
echo "  NEXT_PUBLIC_APP_URL=\"https://$DOMAIN\""
echo ""
echo "然后重启 Docker 容器："
echo "  docker restart nihongo-go"
echo ""

echo "=========================================="
echo "配置完成！"
echo "=========================================="
