#!/usr/bin/env bash
set -euo pipefail

# Production deployment script (no registry required)
# - Builds backend runtime image locally
# - Replaces running container with zero manual steps
# - Persists PDFs/uploads via a named Docker volume
#
# Config via env vars (override as needed):
#   IMAGE_NAME_API       Image tag to build/run (default: freelance-monitor-api:latest)
#   CONTAINER_NAME_API   Container name (default: freelance-monitor-api)
#   PORT_HOST            Host port to expose (default: 8080)
#   PORT_CONTAINER       Container port (default: 8080)
#   STATIC_VOLUME_NAME   Named volume for /srv/static (default: fms_static)
#   ENV_FILE             Optional path to .env file passed with --env-file (default: deploy/.env.production if exists)
#   HEALTH_PATH          Health endpoint path (default: /api/health)
#   HEALTH_TIMEOUT       Health wait timeout in seconds (default: 60)
#   BUILD_TARGET         Dockerfile target stage (default: runtime)
#
# Examples:
#   bash deploy/prod-deploy.sh
#   IMAGE_NAME_API=fms-api:latest CONTAINER_NAME_API=fms-api bash deploy/prod-deploy.sh
#   ENV_FILE=deploy/.env.production bash deploy/prod-deploy.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

IMAGE_NAME_API="${IMAGE_NAME_API:-freelance-monitor-api:latest}"
CONTAINER_NAME_API="${CONTAINER_NAME_API:-freelance-monitor-api}"
PORT_HOST="${PORT_HOST:-8080}"
PORT_CONTAINER="${PORT_CONTAINER:-8080}"
STATIC_VOLUME_NAME="${STATIC_VOLUME_NAME:-fms_static}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"
BUILD_TARGET="${BUILD_TARGET:-runtime}"

# ENV_FILE default resolution: prefer deploy/.env, then deploy/.env.production
ENV_FILE="${ENV_FILE:-}"
if [[ -z "${ENV_FILE}" ]]; then
  if [[ -f "deploy/.env" ]]; then
    ENV_FILE="deploy/.env"
  elif [[ -f "deploy/.env.production" ]]; then
    ENV_FILE="deploy/.env.production"
  fi
fi

need_cleanup_env=false
TMP_ENV_FILE=""
TMP_DIR="${TMPDIR:-${ROOT_DIR}/deploy/.tmp}"

cleanup() {
  if [[ "${need_cleanup_env}" == "true" && -n "${TMP_ENV_FILE}" && -f "${TMP_ENV_FILE}" ]]; then
    rm -f "${TMP_ENV_FILE}" || true
  fi
}
trap cleanup EXIT INT TERM

echo "[1/6] Checking Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in PATH" >&2
  exit 1
fi
docker version >/dev/null 2>&1 || { echo "Docker daemon not running" >&2; exit 1; }

echo "[2/6] Building backend image: ${IMAGE_NAME_API} (target: ${BUILD_TARGET})"
docker build -f backend/Dockerfile --target "${BUILD_TARGET}" -t "${IMAGE_NAME_API}" backend

echo "[3/6] Ensuring static volume exists: ${STATIC_VOLUME_NAME}"
if ! docker volume inspect "${STATIC_VOLUME_NAME}" >/dev/null 2>&1; then
  docker volume create "${STATIC_VOLUME_NAME}" >/dev/null
fi

echo "[4/6] Stopping previous container (if any): ${CONTAINER_NAME_API}"
docker rm -f "${CONTAINER_NAME_API}" >/dev/null 2>&1 || true

echo "[5/6] Starting container from ${IMAGE_NAME_API}..."
env_arg=()
if [[ -n "${ENV_FILE}" ]]; then
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "ENV_FILE not found: ${ENV_FILE}" >&2
    exit 1
  fi
  echo "Using --env-file ${ENV_FILE}"
  env_arg=(--env-file "${ENV_FILE}")
else
  # Fallback: compose a minimal env file from current process environment
  echo "ENV_FILE not provided; composing temporary env file from current environment"
  mkdir -p "${TMP_DIR}" || true
  TMP_ENV_FILE="$(mktemp -p "${TMP_DIR}" -t fms-env-XXXXXX || true)"
  if [[ -z "${TMP_ENV_FILE}" ]]; then
    echo "Failed to create temporary env file (check disk space: ${TMP_DIR})" >&2
    exit 1
  fi
  need_cleanup_env=true
  {
    echo "PORT=${PORT:-8080}"
    echo "GIN_MODE=${GIN_MODE:-release}"
    echo "DB_HOST=${DB_HOST:-}"
    echo "DB_PORT=${DB_PORT:-5432}"
    echo "DB_USER=${DB_USER:-}"
    echo "DB_PASSWORD=${DB_PASSWORD:-}"
    echo "DB_NAME=${DB_NAME:-}"
    echo "DB_SSLMODE=${DB_SSLMODE:-disable}"
    echo "JWT_SECRET=${JWT_SECRET:-}"
    echo "JWT_TTL_SECONDS=${JWT_TTL_SECONDS:-3600}"
    echo "RESET_LINK_BASE=${RESET_LINK_BASE:-}"
    echo "SMTP_HOST=${SMTP_HOST:-}"
    echo "SMTP_PORT=${SMTP_PORT:-587}"
    echo "SMTP_USER=${SMTP_USER:-}"
    echo "SMTP_PASSWORD=${SMTP_PASSWORD:-}"
    echo "SMTP_FROM=${SMTP_FROM:-}"
    echo "NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-}"
    echo "NEXT_PUBLIC_DEV_ALLOW_UNAUTH=false"
  } > "${TMP_ENV_FILE}" || { echo "Failed to write ${TMP_ENV_FILE} (No space left?)" >&2; exit 1; }
  env_arg=(--env-file "${TMP_ENV_FILE}")
fi

# If PORT is defined in the env file, align container/host port mapping when defaults are still 8080
detect_port_from_env() {
  local file="$1"
  local p
  p=$(awk -F= '/^PORT=/{print $2}' "$file" | tail -n1 | tr -d '"' | tr -d "'" | tr -d '\r') || true
  echo "$p"
}

ENV_SOURCE_FILE="${ENV_FILE:-${TMP_ENV_FILE}}"
if [[ -f "${ENV_SOURCE_FILE}" ]]; then
  ENV_PORT="$(detect_port_from_env "${ENV_SOURCE_FILE}")"
  if [[ -n "${ENV_PORT}" ]] && [[ "${ENV_PORT}" =~ ^[0-9]+$ ]]; then
    if [[ "${PORT_CONTAINER}" == "8080" && "${ENV_PORT}" != "8080" ]]; then
      echo "Aligning PORT_CONTAINER to env PORT=${ENV_PORT}"
      PORT_CONTAINER="${ENV_PORT}"
    fi
    if [[ "${PORT_HOST}" == "8080" && "${ENV_PORT}" != "8080" ]]; then
      echo "Aligning PORT_HOST to env PORT=${ENV_PORT}"
      PORT_HOST="${ENV_PORT}"
    fi
  fi
fi

# Validate required env keys exist and non-empty in the env file used
env_val() {
  local file="$1" key="$2"; awk -F= -v k="$2" '$1==k{print substr($0,index($0,$2))}' "$file" | tail -n1 | tr -d '\r' | sed -e 's/^\s*//' -e 's/^"\(.*\)"$/\1/' -e "s/'\(.*\)'/\1/" || true
}

if [[ -f "${ENV_SOURCE_FILE}" ]]; then
  missing=()
  # Required runtime keys for successful start
  for k in PORT DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DB_SSLMODE JWT_SECRET RESET_LINK_BASE NEXT_PUBLIC_BACKEND_URL; do
    v="$(env_val "${ENV_SOURCE_FILE}" "$k")"
    if [[ -z "${v}" ]]; then
      missing+=("$k")
    fi
  done
  if [[ ${#missing[@]:-0} -gt 0 ]]; then
    echo "Missing required keys in ${ENV_SOURCE_FILE}: ${missing[*]}" >&2
    exit 1
  fi
fi

docker run -d \
  -p "${PORT_HOST}:${PORT_CONTAINER}" \
  --name "${CONTAINER_NAME_API}" \
  --restart unless-stopped \
  -v "${STATIC_VOLUME_NAME}:/srv/static" \
  "${env_arg[@]}" \
  "${IMAGE_NAME_API}"

echo "[6/6] Waiting for health at http://127.0.0.1:${PORT_HOST}${HEALTH_PATH} (timeout: ${HEALTH_TIMEOUT}s)"
attempts=${HEALTH_TIMEOUT}
until curl -fsS "http://127.0.0.1:${PORT_HOST}${HEALTH_PATH}" >/dev/null 2>&1; do
  attempts=$((attempts-1))
  if [[ ${attempts} -le 0 ]]; then
    echo "Health check failed; printing logs:" >&2
    docker logs "${CONTAINER_NAME_API}" || true
    exit 1
  fi
  sleep 1
done

echo "✅ Deployment successful: ${CONTAINER_NAME_API} listening on :${PORT_HOST}"
