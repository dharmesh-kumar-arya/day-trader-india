# ==============================================================================
# Day Trader India - Frontend Dockerfile (Multi-stage Node.js + Nginx Alpine)
# ==============================================================================

# Stage 1: Build React 19 + TypeScript + Vite production bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using package-lock for reproducible builds
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source code
COPY . .

# Compile optimized static bundle to /app/dist
RUN npm run build

# Stage 2: Serve with lightweight Nginx Alpine
FROM nginx:alpine

# Set Indian Standard Time (Asia/Kolkata)
ENV TZ=Asia/Kolkata
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Copy Nginx configuration with reverse proxy to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard web port
EXPOSE 80

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

