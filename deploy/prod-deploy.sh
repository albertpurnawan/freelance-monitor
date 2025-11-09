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
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
BUILD_TARGET="${BUILD_TARGET:-runtime}"
DOCKER_NETWORK="${DOCKER_NETWORK:-}"
AUTO_START_DB="${AUTO_START_DB:-true}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0}"

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

echo "[2/8] Building backend image: ${IMAGE_NAME_API} (target: ${BUILD_TARGET})"
docker build -f backend/Dockerfile --target "${BUILD_TARGET}" -t "${IMAGE_NAME_API}" backend

echo "[3/8] Ensuring static volume exists: ${STATIC_VOLUME_NAME}"
if ! docker volume inspect "${STATIC_VOLUME_NAME}" >/dev/null 2>&1; then
  docker volume create "${STATIC_VOLUME_NAME}" >/dev/null
fi

IMAGE_NAME_WEB="${IMAGE_NAME_WEB:-freelance-monitor-web:latest}"
CONTAINER_NAME_WEB="${CONTAINER_NAME_WEB:-freelance-monitor-web}"
WEB_PORT_HOST="${WEB_PORT_HOST:-30002}"
WEB_PORT_CONTAINER="${WEB_PORT_CONTAINER:-4000}"
WEB_BIND_ADDRESS="${WEB_BIND_ADDRESS:-0.0.0.0}"
NEXT_PUBLIC_BACKEND_URL_BUILD="${NEXT_PUBLIC_BACKEND_URL_BUILD:-}"
NEXT_PUBLIC_DEV_ALLOW_UNAUTH_BUILD="${NEXT_PUBLIC_DEV_ALLOW_UNAUTH_BUILD:-false}"
echo "[4/8] Building frontend image: ${IMAGE_NAME_WEB}"

docker build \
  --build-arg NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL_BUILD:-${NEXT_PUBLIC_BACKEND_URL:-}}" \
  --build-arg NEXT_PUBLIC_DEV_ALLOW_UNAUTH="${NEXT_PUBLIC_DEV_ALLOW_UNAUTH_BUILD}" \
  -f frontend/Dockerfile -t "${IMAGE_NAME_WEB}" frontend

echo "[5/8] Stopping previous containers (if any)"
docker rm -f "${CONTAINER_NAME_API}" >/dev/null 2>&1 || true
docker rm -f "${CONTAINER_NAME_WEB}" >/dev/null 2>&1 || true

echo "[6/8] Starting API container from ${IMAGE_NAME_API}..."
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

# Force container to listen on 80 unless disabled
FORCE_CONTAINER_PORT_80="${FORCE_CONTAINER_PORT_80:-true}"
if [[ "${FORCE_CONTAINER_PORT_80}" == "true" ]]; then
  if [[ "${PORT_CONTAINER}" != "80" ]]; then
    echo "Forcing API container port to 80"
    PORT_CONTAINER="80"
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
  if ((${#missing[@]} > 0)); then
    echo "Missing required keys in ${ENV_SOURCE_FILE}: ${missing[*]}" >&2
    exit 1
  fi
fi

# Determine DB host from env file for network guidance
ENV_DB_HOST=""
if [[ -f "${ENV_SOURCE_FILE}" ]]; then
  ENV_DB_HOST="$(env_val "${ENV_SOURCE_FILE}" "DB_HOST")"
fi
ENV_DB_PORT=""
if [[ -f "${ENV_SOURCE_FILE}" ]]; then
  ENV_DB_PORT="$(env_val "${ENV_SOURCE_FILE}" "DB_PORT")"
fi

# Helper: choose docker compose command if available
compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
    return 0
  fi
  return 1
}

# Try to auto-detect compose network of the db service
detect_compose_network() {
  local cmd
  cmd=$(compose_cmd) || return 1
  [[ -f "${COMPOSE_FILE}" ]] || return 1
  # Get db container id
  local cid
  cid=$($cmd -f "${COMPOSE_FILE}" ps -q db 2>/dev/null | tail -n1 || true)
  if [[ -z "$cid" ]]; then
    if [[ "${AUTO_START_DB}" == "true" ]]; then
      echo "DB container not running; starting via compose..." >&2
      $cmd -f "${COMPOSE_FILE}" up -d db >/dev/null 2>&1 || return 1
      # Re-fetch id
      cid=$($cmd -f "${COMPOSE_FILE}" ps -q db 2>/dev/null | tail -n1 || true)
    fi
  fi
  [[ -n "$cid" ]] || return 1
  # Inspect network name(s)
  local net
  net=$(docker inspect -f '{{range $n, $_ := .NetworkSettings.Networks}}{{printf "%s " $n}}{{end}}' "$cid" 2>/dev/null | awk '{print $1}')
  [[ -n "$net" ]] || return 1
  echo "$net"
}

# Network args
net_args=()
if [[ -n "${DOCKER_NETWORK}" ]]; then
  net_args=(--network "${DOCKER_NETWORK}")
else
  # If DB_HOST points to a compose service (e.g., 'db'), require explicit network
  if [[ "${ENV_DB_HOST}" == "db" || "${ENV_DB_HOST}" == "freelance_monitor_db" ]]; then
    auto_net="$(detect_compose_network || true)"
    if [[ -n "$auto_net" ]]; then
      echo "Auto-detected compose network: $auto_net"
      net_args=(--network "$auto_net")
    else
      echo "DB_HOST='${ENV_DB_HOST}' requires the API container to join the same Docker network as the Postgres service." >&2
      echo "- Tried to auto-detect via compose file '${COMPOSE_FILE}', but failed." >&2
      echo "- Ensure docker compose is installed and the db service is up, or pass DOCKER_NETWORK explicitly." >&2
      exit 1
    fi
  fi
fi

docker run -d \
  -p "${BIND_ADDRESS}:${PORT_HOST}:${PORT_CONTAINER}" \
  --name "${CONTAINER_NAME_API}" \
  --restart unless-stopped \
  -v "${STATIC_VOLUME_NAME}:/srv/static" \
  --cap-add NET_BIND_SERVICE \
  --add-host=host.docker.internal:host-gateway \
  "${net_args[@]}" \
  "${env_arg[@]}" \
  $( if [[ "${ENV_DB_HOST}" == "db" || "${ENV_DB_HOST}" == "freelance_monitor_db" ]]; then \
       if [[ -n "${ENV_DB_PORT}" && "${ENV_DB_PORT}" != "5432" ]]; then \
         echo -n "-e DB_PORT=5432"; \
       fi; \
     fi ) \
  $( if [[ "${FORCE_CONTAINER_PORT_80}" == "true" ]]; then echo -n "-e PORT=80"; fi ) \
  "${IMAGE_NAME_API}"

echo "[7/8] Starting Web container from ${IMAGE_NAME_WEB}..."
docker run -d \
  -p "${WEB_BIND_ADDRESS}:${WEB_PORT_HOST}:${WEB_PORT_CONTAINER}" \
  --name "${CONTAINER_NAME_WEB}" \
  --restart unless-stopped \
  --cap-add NET_BIND_SERVICE \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e ALLOW_INIT_DB="${ALLOW_INIT_DB:-false}" \
  $( if [[ -n "${NEON_DATABASE_URL_WEB:-}" ]]; then echo -n "-e NEON_DATABASE_URL=${NEON_DATABASE_URL_WEB}"; fi ) \
  -e PORT=80 \
  "${IMAGE_NAME_WEB}"

echo "[8/8] Waiting for API health at http://127.0.0.1:${PORT_HOST}${HEALTH_PATH} (timeout: ${HEALTH_TIMEOUT}s)"
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
