#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

if lsof -ti :"$PORT" >/dev/null 2>&1; then
  echo "Порт ${PORT} уже занят — dev-open ждёт именно его, а Next уйдёт на другой порт и зависнет."
  echo "Освободите порт: lsof -ti :${PORT} | xargs kill"
  exit 1
fi

PORT="$PORT" npm run dev &
DEV_PID=$!

cleanup() {
  kill "$DEV_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for ${URL} ..."
TRIES=0
MAX_TRIES=240
while ! curl -s -o /dev/null --connect-timeout 1 "http://127.0.0.1:${PORT}/"; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "Сервер не ответил за ~2 минуты. Смотрите лог Next выше."
    exit 1
  fi
  sleep 0.5
done

open "$URL"
wait "$DEV_PID"
