# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat git bash && corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build-time public environment (baked into Next.js bundle)
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_DEV_ALLOW_UNAUTH
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_DEV_ALLOW_UNAUTH=${NEXT_PUBLIC_DEV_ALLOW_UNAUTH}

# Copy source and build
COPY . .
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN adduser -D -H -u 10001 appuser && corepack enable && apk add --no-cache ca-certificates curl && update-ca-certificates

ENV NODE_ENV=production \
    PORT=4000

# Copy build artifacts and runtime deps
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fsS http://localhost:${PORT}/ || exit 1
USER appuser
CMD ["sh","-lc","node node_modules/next/dist/bin/next start -p ${PORT:-4000}"]
