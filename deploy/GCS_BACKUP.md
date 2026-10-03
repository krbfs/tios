# Pre-deploy GCS backup (tc_26)

Before each `gcp:deploy`, a **gzip tar** of the deploy tree (`tc_26/`, same as Docker build context) is uploaded to GCS. Git remains the primary source of truth; this is an off-site **“as shipped”** snapshot.

| Parameter | Value |
|-----------|--------|
| Bucket | `tios-test-backups` |
| GCP project | `tc-26-504910` |
| Prefix | `site/` |

Object layout:

```text
gs://tios-test-backups/site/<YYYY-MM-DDTHHMMSSZ>-<git-short>/
  tc_26.tar.gz
  manifest.json
```

**Excluded from tar:** `.git`, `node_modules`, `.next`, `secrets/`, `.env`, `.env.local`, `.runtime-env.yaml`, `*.pem`, and other paths in `scripts/backup_site_to_gcs.py`.

## Commands

```bash
# With deploy (default)
npm run gcp:deploy

# Skip backup
python3 scripts/deploy.py --deploy --skip-backup

# Manual backup only
python3 scripts/backup_site_to_gcs.py --source .
```

## Restore

```bash
gcloud storage cp -r \
  "gs://tios-test-backups/site/2026-10-03T135107Z-abc1234/" \
  ./restore/ \
  --project=tc-26-504910

cd restore && tar -xzf tc_26.tar.gz
# commit: see manifest.json
```

Console: [tios-test-backups](https://console.cloud.google.com/storage/browser/tios-test-backups?project=tc-26-504910).
