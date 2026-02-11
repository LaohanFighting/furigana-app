# 日语通 - 腾讯云轻量 / Docker 部署
# 使用 slim（Debian）而非 alpine，避免 Prisma schema engine 在 Alpine/OpenSSL 下报错
# 构建阶段
FROM node:18-slim AS builder

WORKDIR /app

# 使用国内镜像加速（腾讯云服务器在大陆时 npm 拉包更稳定）
RUN npm config set registry https://registry.npmmirror.com && npm config set fetch-timeout 120000

# 安装依赖时跳过 postinstall（此时尚未 COPY prisma，prisma generate 会失败）
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --ignore-scripts || npm install --legacy-peer-deps --ignore-scripts

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
# 项目若无 public 目录，Next 运行期仍需该路径；确保存在供 runner 阶段 COPY
RUN mkdir -p public
RUN npx next build

# 运行阶段
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma/
# 若项目无 public 目录，builder 中已 mkdir -p public，此处可安全复制
COPY --from=builder /app/public ./public

EXPOSE 3000

# 启动时先执行数据库迁移，再启动 Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
