#!/usr/bin/env python3
"""Archive deploy source tree to GCS before Cloud Run publish.

Off-site snapshot of the directory that goes into Docker build (tc_26 root),
not a substitute for git. Secrets and .env are excluded from the tar.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_BUCKET = "tios-test-backups"
DEFAULT_GCP_PROJECT = "tc-26-504910"
DEFAULT_PREFIX = "site"

TAR_EXCLUDE_DIR_NAMES = frozenset(
    {
        ".git",
        "node_modules",
        "__pycache__",
        ".DS_Store",
        ".next",
        "out",
        "coverage",
        ".backup-clean-static",
        "secrets",
        ".vercel",
    }
)

TAR_EXCLUDE_FILE_NAMES = frozenset(
    {
        ".env",
        ".env.local",
        ".runtime-env.yaml",
    }
)


def repo_root_from_source(source_dir: Path) -> Path:
    """Git root for manifest (tc_26 is the deploy repo)."""
    return source_dir.resolve()


def git_manifest(repo_root: Path) -> dict[str, Any]:
    def run_git(*args: str) -> str:
        try:
            cp = subprocess.run(
                ["git", *args],
                cwd=repo_root,
                text=True,
                capture_output=True,
                check=False,
            )
            return (cp.stdout or "").strip()
        except OSError:
            return ""

    commit = run_git("rev-parse", "HEAD")
    short = run_git("rev-parse", "--short", "HEAD")
    branch = run_git("rev-parse", "--abbrev-ref", "HEAD")
    describe = run_git("describe", "--tags", "--always", "--dirty")
    return {
        "commit": commit or None,
        "commit_short": short or None,
        "branch": branch or None,
        "describe": describe or None,
    }


def should_exclude(rel: Path) -> bool:
    name = rel.name
    if name in TAR_EXCLUDE_FILE_NAMES:
        return True
    if name.startswith(".env") and name != ".env.example":
        return True
    if rel.suffix == ".pem":
        return True
    for part in rel.parts:
        if part in TAR_EXCLUDE_DIR_NAMES:
            return True
    return False


def build_tar_archive(source_dir: Path, dest_tar: Path) -> str:
    """Return top-level folder name inside the archive."""
    source_dir = source_dir.resolve()
    top = source_dir.name
    try:
        print(f"==> git archive HEAD → {dest_tar.name}", flush=True)
        subprocess.run(
            [
                "git",
                "archive",
                "--format=tar.gz",
                f"--prefix={top}/",
                "-o",
                str(dest_tar),
                "HEAD",
            ],
            cwd=source_dir,
            check=True,
        )
        return top
    except (subprocess.CalledProcessError, OSError) as err:
        print(f"==> git archive failed ({err}); falling back to filtered walk", flush=True)
    with tarfile.open(dest_tar, "w:gz") as tar:
        for path in sorted(source_dir.rglob("*")):
            if not path.is_file():
                continue
            inner = Path(top) / path.relative_to(source_dir)
            if should_exclude(inner):
                continue
            tar.add(path, arcname=str(inner))
    return top


def upload_site_archive(
    source_dir: Path,
    *,
    bucket: str,
    gcp_project: str,
    prefix: str = DEFAULT_PREFIX,
) -> str:
    source_dir = source_dir.resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory not found: {source_dir}")

    git_info = git_manifest(repo_root_from_source(source_dir))
    short = git_info.get("commit_short") or "nogit"
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%SZ")
    object_prefix = f"{prefix.rstrip('/')}/{stamp}-{short}"
    folder_name = source_dir.name
    tar_name = f"{folder_name}.tar.gz"

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        tar_path = tmp_path / tar_name
        top = build_tar_archive(source_dir, tar_path)
        manifest = {
            "created_at_utc": stamp,
            "source_dir": str(source_dir),
            "archive_top_level": top,
            "tar_object": tar_name,
            "git": git_info,
        }
        manifest_path = tmp_path / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

        dest = f"gs://{bucket}/{object_prefix}/"
        print(f"==> GCS backup: {dest}", flush=True)
        run_gcloud(
            [
                "storage",
                "cp",
                str(tar_path),
                f"{dest}{tar_name}",
                f"--project={gcp_project}",
            ]
        )
        run_gcloud(
            [
                "storage",
                "cp",
                str(manifest_path),
                f"{dest}manifest.json",
                f"--project={gcp_project}",
            ]
        )

    print(f"==> backup OK: {dest}", flush=True)
    return object_prefix


def run_gcloud(args: list[str]) -> None:
    cmd = ["gcloud", *args]
    print("==>", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Upload deploy source tree to GCS")
    parser.add_argument(
        "--source",
        type=Path,
        default=root,
        help="Directory archived (default: tc_26 repo root)",
    )
    parser.add_argument("--bucket", default=os.environ.get("BACKUP_GCS_BUCKET", DEFAULT_BUCKET))
    parser.add_argument(
        "--project",
        default=os.environ.get("PROJECT_ID", DEFAULT_GCP_PROJECT),
    )
    parser.add_argument(
        "--prefix",
        default=os.environ.get("BACKUP_GCS_PREFIX", DEFAULT_PREFIX),
    )
    args = parser.parse_args()
    upload_site_archive(
        args.source,
        bucket=args.bucket,
        gcp_project=args.project,
        prefix=args.prefix,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode)
