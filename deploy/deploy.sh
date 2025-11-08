#!/usr/bin/env bash
set -euo pipefail

# Deploy script for production server
# - Builds images and starts services via Docker Compose
# - Optionally runs seed job once

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RUN_SEED="${RUN_SEED:-false}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy from .env.production.example and edit your secrets."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Install Docker first."
  exit 1
fi

# Prefer Docker Compose v2
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose not found."
  exit 1
fi

echo "Building and starting services..."
"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

if [[ "${RUN_SEED}" == "true" ]]; then
  echo "Running one-off seed job..."
  "${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" run --rm seed || true
fi

echo "Services are up. Check health: curl -fsS http://127.0.0.1:8080/api/health"

