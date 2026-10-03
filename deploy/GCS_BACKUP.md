# Pre-deploy GCS backup (tc_26)

Before each `npm run gcp:deploy` / `deploy.py --deploy`, a **gzip tar** of **almost the entire `tc_26/` directory on disk** is uploaded to the **private** bucket: `.env`, `secrets/`, `.git`, `.next`, methodology, uncommitted files — **everything except `node_modules/`** (restore with `npm ci`).

**GitHub** (`krbfs/tios`): tracked files per `.gitignore` (no secrets in git — `.env` / `secrets/` stay ignored). **GCS**: full mirror including secrets — bucket must stay private.

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

**Excluded from tar:** only `node_modules/` (see `scripts/backup_site_to_gcs.py`).

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
