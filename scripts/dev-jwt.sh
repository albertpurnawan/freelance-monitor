#!/usr/bin/env sh
set -e
secret=${JWT_SECRET:-change-me}
header='{"alg":"HS256","typ":"JWT"}'
now=$(date +%s)
exp=$((now + 86400))
payload=$(printf '{"sub":"dev","iat":%s,"exp":%s}' "$now" "$exp")
base64url() { printf '%s' "$1" | openssl base64 -A | tr '+/' '-_' | tr -d '='; }
h=$(base64url "$header")
p=$(base64url "$payload")
sig=$(printf '%s' "$h.$p" | openssl dgst -binary -sha256 -hmac "$secret" | openssl base64 -A | tr '+/' '-_' | tr -d '=')
echo "$h.$p.$sig"
