#!/usr/bin/env bash
set -euo pipefail

# Simple dev runner: starts backend (Go/Gin) and frontend (Next.js) together.
#
# Configurable via environment variables:
#   BACKEND_PORT   (default: 8000)
#   FRONTEND_PORT  (default: 4000)
#   BACKEND_DB     (default: sqlite)
#   DEV_UNAUTH     (default: true)  # allow unauthenticated writes during local dev
#   BACKEND_MODE   (local|docker)   # run Go locally or via Docker Compose (default: local)
#   RUN_SEED       (true|false)     # when using docker, run the seed job once

BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-4001}"
BACKEND_DB="${BACKEND_DB:-sqlite}"
DEV_UNAUTH="${DEV_UNAUTH:-true}"
BACKEND_MODE="${BACKEND_MODE:-local}"
RUN_SEED="${RUN_SEED:-false}"
WATCH_BACKEND_SET="${WATCH_BACKEND+set}"
WATCH_BACKEND="${WATCH_BACKEND:-false}"
REBUILD="${REBUILD:-false}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo "\nShutting down dev processes..."
  [[ -n "${BACKEND_PID:-}" ]] && kill ${BACKEND_PID} 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill ${FRONTEND_PID} 2>/dev/null || true
  [[ -n "${BACKEND_WATCH_PID:-}" ]] && kill ${BACKEND_WATCH_PID} 2>/dev/null || true
  if [[ "${BACKEND_MODE}" == "docker" ]] && [[ -n "${COMPOSE_CMD:-}" ]] && [[ "${COMPOSE_UP:-}" == "1" ]]; then
    (
      cd "${ROOT_DIR}"
      echo "Stopping Docker Compose services..."
      ${COMPOSE_CMD} -f docker-compose.yml down
    ) || true
  fi
}
trap cleanup EXIT INT TERM

is_port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -n -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
  else
    nc -z localhost "${port}" >/dev/null 2>&1
  fi
}

choose_free_port() {
  local port="$1"
  local max_tries=20
  local tries=0
  while is_port_in_use "${port}"; do
    port=$((port+1))
    tries=$((tries+1))
    if [[ ${tries} -ge ${max_tries} ]]; then
      echo "No free port found near ${1}" >&2
      exit 1
    fi
  done
  echo "${port}"
}

# Default: enable backend watch in local mode unless user overrides
if [[ "${BACKEND_MODE}" == "local" ]] && [[ -z "${WATCH_BACKEND_SET}" ]]; then
  WATCH_BACKEND="true"
fi

if [[ "${BACKEND_MODE}" == "docker" ]]; then
  # Determine compose command
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    echo "Docker Compose not found. Install Docker Desktop or docker-compose."
    exit 1
  fi

  # Verify Docker daemon is running before attempting compose
  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1; then
      echo "Docker daemon is not running."
      echo "- Start Docker Desktop (macOS) or the Docker service"
      echo "- Then re-run: BACKEND_MODE=docker bash scripts/dev.sh"
      echo "Tip: Use local mode without Docker: bash scripts/dev.sh"
      exit 1
    fi
  fi

  # Ensure host port is free or choose a new one
  if is_port_in_use "${BACKEND_PORT}"; then
    NEW_BACKEND_PORT=$(choose_free_port "${BACKEND_PORT}")
    echo "Port ${BACKEND_PORT} in use; switching backend to :${NEW_BACKEND_PORT}"
    BACKEND_PORT="${NEW_BACKEND_PORT}"
  fi

  echo "Starting backend via Docker Compose on :${BACKEND_PORT} (Postgres + API)"
  (
    cd "${ROOT_DIR}"
    BUILD_FLAG=""
    if [[ "${REBUILD}" == "true" ]]; then
      echo "Rebuild requested (REBUILD=true); rebuilding images..."
      BUILD_FLAG="--build"
    fi
    HOST_PORT="${BACKEND_PORT}" ${COMPOSE_CMD} -f docker-compose.yml up -d ${BUILD_FLAG} db api
  )
  COMPOSE_UP=1

  # Wait for API health
  ATTEMPTS=60
  until curl -fsS "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS-1))
    if [[ ${ATTEMPTS} -le 0 ]]; then
      echo "Backend (Docker) health did not respond in time; check '${COMPOSE_CMD} logs api'."
      break
    fi
    sleep 1
  done

  # Optionally run seed once
  if [[ "${RUN_SEED}" == "true" ]]; then
    (
      cd "${ROOT_DIR}"
      PORT="${BACKEND_PORT}" ${COMPOSE_CMD} -f docker-compose.yml run --rm seed
    ) || true
  fi
else
  start_backend() {
    (
      cd "${ROOT_DIR}/backend"
      PORT="${BACKEND_PORT}" DB_DRIVER="${BACKEND_DB}" DEV_ALLOW_UNAUTH="${DEV_UNAUTH}" go run ./cmd/api
    )
  }
  if is_port_in_use "${BACKEND_PORT}"; then
    NEW_BACKEND_PORT=$(choose_free_port "${BACKEND_PORT}")
    echo "Port ${BACKEND_PORT} in use; switching backend to :${NEW_BACKEND_PORT}"
    BACKEND_PORT="${NEW_BACKEND_PORT}"
  fi

  echo "Starting backend on :${BACKEND_PORT} (DB=${BACKEND_DB}, DEV_ALLOW_UNAUTH=${DEV_UNAUTH})"
  start_backend &
  BACKEND_PID=$!

  # Wait for backend health endpoint to respond (best-effort)
  ATTEMPTS=30
  until curl -fsS "http://localhost:${BACKEND_PORT}/api/health" >/dev/null 2>&1; do
    ATTEMPTS=$((ATTEMPTS-1))
    if [[ ${ATTEMPTS} -le 0 ]]; then
      echo "Backend health check did not respond in time; continuing anyway..."
      break
    fi
    sleep 0.5
  done

  # Optional: watch .go files and auto-restart backend on changes
  if [[ "${WATCH_BACKEND}" == "true" ]]; then
    echo "Backend auto-restart enabled (WATCH_BACKEND=true)"
    compute_backend_hash() {
      local dir="${ROOT_DIR}/backend"
      if command -v md5 >/dev/null 2>&1; then
        (cd "${dir}" && find . -type f -name "*.go" -print0 | xargs -0 md5 | md5)
      else
        (cd "${dir}" && find . -type f -name "*.go" -exec shasum {} + | shasum)
      fi
    }
    (
      prev_hash="$(compute_backend_hash)"
      while true; do
        sleep 1
        cur_hash="$(compute_backend_hash)"
        if [[ "${cur_hash}" != "${prev_hash}" ]]; then
          echo "Detected backend changes; restarting..."
          [[ -n "${BACKEND_PID:-}" ]] && kill ${BACKEND_PID} 2>/dev/null || true
          start_backend &
          BACKEND_PID=$!
          prev_hash="${cur_hash}"
        fi
      done
    ) &
    BACKEND_WATCH_PID=$!
  fi
fi

if is_port_in_use "${FRONTEND_PORT}"; then
  NEW_FRONTEND_PORT=$(choose_free_port "${FRONTEND_PORT}")
  echo "Port ${FRONTEND_PORT} in use; switching frontend to :${NEW_FRONTEND_PORT}"
  FRONTEND_PORT="${NEW_FRONTEND_PORT}"
fi

# Clear stale Next.js dev lock if present and no dev server is listening
LOCK_PATH="${ROOT_DIR}/frontend/.next/dev/lock"
if [[ -f "${LOCK_PATH}" ]] && ! is_port_in_use "${FRONTEND_PORT}"; then
  echo "Removing stale Next.js dev lock at ${LOCK_PATH}"
  rm -f "${LOCK_PATH}"
fi

echo "Starting frontend dev server on :${FRONTEND_PORT} (proxy -> http://localhost:${BACKEND_PORT})"
(
  cd "${ROOT_DIR}/frontend"
  if command -v pnpm >/dev/null 2>&1; then
    PORT="${FRONTEND_PORT}" NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACKEND_PORT}" pnpm dev
  else
    PORT="${FRONTEND_PORT}" NEXT_PUBLIC_BACKEND_URL="http://localhost:${BACKEND_PORT}" npm run dev
  fi
) &
FRONTEND_PID=$!

echo "\nDev environment running:"
echo "- Backend:  http://localhost:${BACKEND_PORT}"
echo "- Frontend: http://localhost:${FRONTEND_PORT}"
echo "Press Ctrl+C to stop both."

# macOS/bash 3.x doesn't support 'wait -n'. Poll both PIDs and exit when either stops.
while true; do
  if [[ -n "${BACKEND_PID}" ]]; then
    if ! kill -0 ${BACKEND_PID} 2>/dev/null; then
      break
    fi
  fi
  if ! kill -0 ${FRONTEND_PID} 2>/dev/null; then
    break
  fi
  sleep 1
done
