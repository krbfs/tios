#!/usr/bin/env bash
set -euo pipefail

# Local container smoke-test (same image shape as Cloud Run).
#
# Usage:
#   ./scripts/docker-local.sh          # build + run on :8080
#   ./scripts/docker-local.sh build    # build only
#   ./scripts/docker-local.sh run      # run existing image

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

IMAGE="${IMAGE:-tc26:local}"
PORT="${PORT:-8080}"
ACTION="${1:-all}"

build() {
  echo "==> Building ${IMAGE}"
  docker build -t "${IMAGE}" .
}

run() {
  echo "==> Running on http://localhost:${PORT}"
  docker run --rm -p "${PORT}:8080" \
    -e NODE_ENV=production \
    -e PORT=8080 \
    --name tc26-local \
    "${IMAGE}"
}

case "${ACTION}" in
  build) build ;;
  run) run ;;
  all) build; run ;;
  *)
    echo "Usage: $0 [build|run|all]"
    exit 1
    ;;
esac
