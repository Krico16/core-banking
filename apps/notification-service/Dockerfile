# Multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/notification-service/package*.json ./
RUN npm install
COPY apps/notification-service/. .
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY apps/notification-service/package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3007/api/health || exit 1
CMD ["node", "-r", "./dist/infrastructure/observability/tracing.js", "dist/main"]
