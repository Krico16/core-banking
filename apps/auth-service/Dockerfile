# Multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy auth-service package files
COPY apps/auth-service/package*.json ./
RUN npm install

# Copy source files
COPY apps/auth-service/. .
COPY apps/auth-service/keys ./keys
RUN npm run build

# Production image
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY apps/auth-service/package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/keys ./keys

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main"]
