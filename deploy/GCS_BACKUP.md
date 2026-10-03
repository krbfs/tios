# Pre-deploy GCS backup (tc_26)

Before each `npm run gcp:deploy` / `deploy.py --deploy`, a **gzip tar** of the **full local `tc_26/` tree** is uploaded to GCS: tracked, untracked, and **gitignored** files (methodology folders, WIP) — everything on disk that matters for recovery, except secrets and heavy caches.

GitHub is only the public slice; this archive is the **off-site full worktree** before deploy.

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

**Included:** `source_sep_16th/`, `thrash/`, uncommitted edits, any local-only assets under `tc_26/`.

**Never included:** `.git`, `node_modules`, `.next`, `secrets/`, `.env` (except `.env.example`), service-account JSON, `*.pem`, `.runtime-env.yaml` — see `scripts/backup_site_to_gcs.py`.

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
