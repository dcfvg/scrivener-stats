#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
APP_ROOT="$SCRIPT_DIR/.."
. "$SCRIPT_DIR/../../focus-script/http-services.sh"

PORT="${SCRIVENER_STATS_PORT:-4678}"
URL="http://127.0.0.1:${PORT}/"
API_PORT="${SCRIVENER_API_PORT:-5770}"
API_HEALTH_URL="http://127.0.0.1:${API_PORT}/api/scrivener/config"
DATA_URL="${SCRIVENER_STATS_DATA_URL:-http://127.0.0.1:${API_PORT}/api/writing-history.csv}"
APP_URL="${SCRIVENER_STATS_APP_URL:-http://127.0.0.1:${PORT}/}"
CONFIG_PATH="$APP_ROOT/public/server-config.json"

ensure_service_listener_matches_health "$PORT" "scrivener-stats" "$URL"

cleanup() {
  rm -f "$CONFIG_PATH"
  if [[ -n "${PREVIEW_PID:-}" ]]; then
    kill "$PREVIEW_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup INT TERM EXIT

if ! require_http_health "scrivener-api" "$API_HEALTH_URL"; then
  echo "Start it first with focus-script or services.sh." >&2
  exit 1
fi

mkdir -p "$APP_ROOT/public"
node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], JSON.stringify({ autoLoadPath: process.argv[2], autoLoadLabel: 'writing-history.csv' }, null, 2) + '\n');" "$CONFIG_PATH" "$DATA_URL"

cd "$APP_ROOT"
npm run build
rm -f "$CONFIG_PATH"

vite preview --host 127.0.0.1 --port "$PORT" --strictPort &
PREVIEW_PID=$!

until wait_for_http_health "$URL" 1; do
  sleep 1
done

if [[ "${SCRIVENER_STATS_NO_OPEN:-0}" != "1" ]]; then
  open "$APP_URL" >/dev/null 2>&1 || true
fi

wait "$PREVIEW_PID"
