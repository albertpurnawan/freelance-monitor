# syntax=docker/dockerfile:1

# --- Build stage ---
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Ensure build tools available
RUN apk add --no-cache git ca-certificates tzdata

# Cache dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . ./

# Build the API binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/bin/seed ./cmd/seed

# --- Runtime stage ---
FROM alpine:3.19 AS runtime
WORKDIR /srv

# Add necessary runtime packages
RUN apk add --no-cache ca-certificates tzdata && adduser -D -H -u 10001 appuser

# Copy binary from builder
COPY --from=builder /app/bin/api /srv/api
COPY --from=builder /app/bin/seed /srv/seed

# Prepare writable static directories; ownership will be preserved when populating a fresh named volume
RUN mkdir -p /srv/static/pdfs /srv/static/uploads/signed_offers \
    && chown -R 10001:10001 /srv/static

# Minimal, non-sensitive defaults. Provide DB_* and JWT_* via runtime env or --env-file.
ENV PORT=8080 \
    GIN_MODE=release

# Expose API port
EXPOSE 8080

# Healthcheck against the health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:${PORT}/api/health || exit 1

# Run as non-root
USER appuser

CMD ["/srv/api"]

# --- Dev runtime stage with Air (includes Go toolchain) ---
FROM golang:1.24-alpine AS dev
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata curl && update-ca-certificates
# Install Air reloader
RUN curl -sSfL https://raw.githubusercontent.com/cosmtrek/air/master/install.sh | sh -s -- -b /usr/local/bin
# Source code is bind-mounted in compose; keep env for dev
ENV PORT=8080 \
    GIN_MODE=debug \
    DB_HOST=db \
    DB_PORT=5432 \
    DB_USER=postgres \
    DB_PASSWORD=postgres \
    DB_NAME=freelance_monitor \
    DB_SSLMODE=disable \
    JWT_SECRET=change-me
CMD ["air", "-c", "/app/.air.toml"]
