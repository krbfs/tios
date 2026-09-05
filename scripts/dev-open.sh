#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

npm run dev &
DEV_PID=$!

cleanup() {
  kill "$DEV_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for ${URL} ..."
while ! nc -z 127.0.0.1 "$PORT" 2>/dev/null; do
  sleep 0.25
done

open "$URL"
wait "$DEV_PID"
