# 日语通 - 腾讯云轻量 / Docker 部署
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npx next build

# 运行阶段
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/public ./public

EXPOSE 3000

# 启动时先执行数据库迁移，再启动 Next.js
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
