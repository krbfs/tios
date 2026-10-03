#!/usr/bin/env python3
"""Archive deploy source tree to GCS before Cloud Run publish.

**Everything** under the source directory on disk: .env, secrets/, .git, gitignored
methodology, uncommitted work — only ``node_modules`` is skipped (restore via ``npm ci``).

GitHub uses .gitignore; this bucket is the full off-site mirror (private).
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
from typing import Any, Iterator

DEFAULT_BUCKET = "tios-test-backups"
DEFAULT_GCP_PROJECT = "tc-26-504910"
DEFAULT_PREFIX = "site"

# Sole exclusion: reproducible dependency tree (hundreds of MB).
TAR_EXCLUDE_DIR_NAMES = frozenset({"node_modules"})


def repo_root_from_source(source_dir: Path) -> Path:
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
    porcelain = run_git("status", "--porcelain")
    return {
        "commit": commit or None,
        "commit_short": short or None,
        "branch": branch or None,
        "describe": describe or None,
        "dirty": bool(porcelain),
        "status_porcelain_lines": len(porcelain.splitlines()) if porcelain else 0,
    }


def should_exclude(rel: Path) -> bool:
    """rel is path inside archive: tc_26/..."""
    for part in rel.parts:
        if part in TAR_EXCLUDE_DIR_NAMES:
            return True
    return False


def iter_backup_files(source_dir: Path, top: str) -> Iterator[tuple[Path, str]]:
    source_dir = source_dir.resolve()
    for dirpath, dirnames, filenames in os.walk(source_dir, topdown=True):
        dirnames[:] = sorted(d for d in dirnames if d not in TAR_EXCLUDE_DIR_NAMES)
        for filename in filenames:
            abs_path = Path(dirpath) / filename
            try:
                rel = abs_path.relative_to(source_dir)
            except ValueError:
                continue
            arcname = str(Path(top) / rel)
            if should_exclude(Path(arcname)):
                continue
            yield abs_path, arcname


def build_tar_archive(source_dir: Path, dest_tar: Path) -> tuple[str, int]:
    source_dir = source_dir.resolve()
    top = source_dir.name
    count = 0
    print(
        f"==> full disk snapshot → {dest_tar.name} (all except node_modules/)",
        flush=True,
    )
    with tarfile.open(dest_tar, "w:gz") as tar:
        for abs_path, arcname in iter_backup_files(source_dir, top):
            tar.add(abs_path, arcname=arcname)
            count += 1
            if count % 500 == 0:
                print(f"    … {count} files", flush=True)
    print(f"==> archived {count} files", flush=True)
    return top, count


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
        top, file_count = build_tar_archive(source_dir, tar_path)
        manifest = {
            "created_at_utc": stamp,
            "source_dir": str(source_dir),
            "archive_top_level": top,
            "tar_object": tar_name,
            "backup_mode": "full_disk",
            "file_count": file_count,
            "excludes": sorted(TAR_EXCLUDE_DIR_NAMES),
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
