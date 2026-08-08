#!/usr/bin/env bash
set -euo pipefail

# Build image in Cloud Build and deploy to Cloud Run.
#
# Usage:
#   export PROJECT_ID=my-gcp-project
#   ./scripts/deploy.sh
#
# Optional:
#   REGION=europe-west1 SERVICE=tc26 REPO=tc26 IMAGE=tc26 ./scripts/deploy.sh
#   LOCAL=1 ./scripts/deploy.sh   # local docker build + gcloud run deploy

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-tc26}"
REPO="${REPO:-tc26}"
IMAGE_NAME="${IMAGE:-tc26}"
LOCAL="${LOCAL:-0}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}"

gcloud config set project "${PROJECT_ID}" >/dev/null

if [[ "${LOCAL}" == "1" ]]; then
  TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)"
  FULL_IMAGE="${IMAGE_URI}:${TAG}"

  echo "==> Local docker build: ${FULL_IMAGE}"
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  docker build -t "${FULL_IMAGE}" -t "${IMAGE_URI}:latest" .
  docker push "${FULL_IMAGE}"
  docker push "${IMAGE_URI}:latest"

  echo "==> Deploying to Cloud Run"
  gcloud run deploy "${SERVICE}" \
    --image="${FULL_IMAGE}" \
    --region="${REGION}" \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --cpu=1 \
    --memory=512Mi \
    --min-instances=0 \
    --max-instances=10 \
    --concurrency=80 \
    --timeout=300 \
    --set-env-vars=NODE_ENV=production
else
  echo "==> Cloud Build + deploy"
  gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions="_REGION=${REGION},_SERVICE=${SERVICE},_REPO=${REPO},_IMAGE=${IMAGE_NAME}"
fi

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')"
echo "==> Live: ${URL}"
