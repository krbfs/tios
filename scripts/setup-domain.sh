#!/usr/bin/env bash
# Map tios-test.com (+ www) to Cloud Run service tc26.
# See deploy/DOMAIN.md for Namecheap DNS steps after running this script.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  source <(grep -E '^(PROJECT_ID|REGION|SERVICE)=' .env | sed 's/^/export /')
  set +a
fi

PROJECT_ID="${PROJECT_ID:-tc-26-504910}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-tc26}"
DOMAINS=(tios-test.com www.tios-test.com)

echo "Project: $PROJECT_ID  Region: $REGION  Service: $SERVICE"

gcloud config set project "$PROJECT_ID" --quiet

for domain in "${DOMAINS[@]}"; do
  echo "==> domain mapping: $domain"
  if gcloud beta run domain-mappings describe \
    --domain="$domain" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    >/dev/null 2>&1; then
    echo "    already exists, skipping create"
  else
    gcloud beta run domain-mappings create \
      --service="$SERVICE" \
      --domain="$domain" \
      --region="$REGION" \
      --project="$PROJECT_ID"
  fi

  echo "==> DNS records for $domain:"
  gcloud beta run domain-mappings describe \
    --domain="$domain" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='yaml(status.resourceRecords)'
  echo
done

echo "Add the resourceRecords above in Namecheap → Advanced DNS."
echo "Then redeploy: python3 scripts/deploy.py --deploy"
