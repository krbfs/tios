#!/usr/bin/env python3
"""Deploy tc_26 to Google Cloud Run via Cloud Build only.

Reads .env from project root. No third-party deps.

Usage:
  python3 scripts/deploy.py --setup
  python3 scripts/deploy.py --deploy
  python3 scripts/deploy.py --setup --deploy
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"

DEFAULTS = {
    "PROJECT_ID": "",
    "REGION": "europe-west1",
    "SERVICE": "tc26",
    "REPO": "tc26",
    "IMAGE": "tc26",
    "PORT": "8080",
    "NEXT_PUBLIC_SITE_URL": "https://tc26-wppkmlz42a-ew.a.run.app",
}


def load_env(path: Path) -> dict[str, str]:
    data = dict(DEFAULTS)
    if not path.is_file():
        raise SystemExit(f"Missing {path}. Create it from .env.example")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    for key in list(data):
        if key in os.environ and os.environ[key] != "":
            data[key] = os.environ[key]
    if not data.get("PROJECT_ID"):
        raise SystemExit("PROJECT_ID is empty in .env")
    if not data.get("REGION"):
        raise SystemExit("REGION is empty in .env")
    return data


def run(
    cmd: list[str],
    *,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess[str]:
    print("==>", " ".join(cmd), flush=True)
    return subprocess.run(
        cmd,
        cwd=ROOT,
        check=check,
        text=True,
        capture_output=capture,
    )


def run_out(cmd: list[str]) -> str:
    result = run(cmd, capture=True)
    out = (result.stdout or "").strip()
    if out:
        print(out, flush=True)
    return out


def ensure_billing(project: str) -> None:
    result = subprocess.run(
        [
            "gcloud",
            "billing",
            "projects",
            "describe",
            project,
            "--format=value(billingAccountName,billingEnabled)",
        ],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    line = (result.stdout or "").strip()
    parts = line.split("\t") if line else []
    enabled = parts[-1].lower() == "true" if parts else False
    account = parts[0] if parts and parts[0] else ""

    if result.returncode != 0 or not enabled:
        print(
            "\nERROR: billing не включён на проекте.\n"
            f"  https://console.cloud.google.com/billing/linkedaccount?project={project}\n",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(2)

    print(f"==> Billing OK: {account}", flush=True)


def bind_role(project: str, member: str, role: str) -> None:
    run(
        [
            "gcloud",
            "projects",
            "add-iam-policy-binding",
            project,
            f"--member={member}",
            f"--role={role}",
            "--condition=None",
            "--quiet",
        ],
        check=False,
        capture=True,
    )


def setup(cfg: dict[str, str]) -> None:
    project = cfg["PROJECT_ID"]
    region = cfg["REGION"]
    repo = cfg["REPO"]

    run(["gcloud", "config", "set", "project", project, "--quiet"])
    ensure_billing(project)

    run(
        [
            "gcloud",
            "services",
            "enable",
            "run.googleapis.com",
            "cloudbuild.googleapis.com",
            "artifactregistry.googleapis.com",
            "containerregistry.googleapis.com",
            "storage.googleapis.com",
            "iam.googleapis.com",
            "serviceusage.googleapis.com",
            "cloudresourcemanager.googleapis.com",
        ]
    )

    describe = subprocess.run(
        [
            "gcloud",
            "artifacts",
            "repositories",
            "describe",
            repo,
            f"--location={region}",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if describe.returncode != 0:
        run(
            [
                "gcloud",
                "artifacts",
                "repositories",
                "create",
                repo,
                "--repository-format=docker",
                f"--location={region}",
                "--description=Teamconstructor tc26 images",
            ]
        )
    else:
        print(f"==> Repository {repo} already exists", flush=True)

    project_number = run_out(
        ["gcloud", "projects", "describe", project, "--format=value(projectNumber)"]
    )
    cb_sa = f"serviceAccount:{project_number}@cloudbuild.gserviceaccount.com"
    compute_sa = (
        f"serviceAccount:{project_number}-compute@developer.gserviceaccount.com"
    )

    for member, role in (
        (cb_sa, "roles/run.admin"),
        (cb_sa, "roles/iam.serviceAccountUser"),
        (cb_sa, "roles/artifactregistry.writer"),
        (cb_sa, "roles/storage.admin"),
        (compute_sa, "roles/run.admin"),
        (compute_sa, "roles/artifactregistry.writer"),
        (compute_sa, "roles/logging.logWriter"),
        (compute_sa, "roles/iam.serviceAccountUser"),
    ):
        bind_role(project, member, role)

    print("==> Setup done", flush=True)


def image_tag() -> str:
    """Tag for Artifact Registry. SHORT_SHA is empty on manual builds submit."""
    result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    tag = (result.stdout or "").strip()
    if tag:
        return tag
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


RUNTIME_ENV_KEYS = (
    "DATABASE_URL",
    "DIRECT_URL",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
)


def sync_runtime_env(cfg: dict[str, str]) -> None:
    """Push DB/JWT vars from local .env to Cloud Run (not baked into the image)."""
    lines: list[str] = []
    for key in RUNTIME_ENV_KEYS:
        value = cfg.get(key, "")
        if not value:
            continue
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'{key}: "{escaped}"')

    if not cfg.get("JWT_SECRET"):
        raise SystemExit(
            "JWT_SECRET is empty in .env. Generate one:\n"
            "  openssl rand -base64 48"
        )
    if not cfg.get("DATABASE_URL"):
        raise SystemExit(
            "DATABASE_URL is empty in .env. Copy from Neon console → Connect."
        )

    env_file = ROOT / ".runtime-env.yaml"
    env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        run(
            [
                "gcloud",
                "run",
                "services",
                "update",
                cfg["SERVICE"],
                f"--region={cfg['REGION']}",
                f"--env-vars-file={env_file}",
            ]
        )
    finally:
        env_file.unlink(missing_ok=True)


def deploy(cfg: dict[str, str]) -> None:
    run(["gcloud", "config", "set", "project", cfg["PROJECT_ID"], "--quiet"])
    ensure_billing(cfg["PROJECT_ID"])
    tag = image_tag()
    site_url = cfg.get("NEXT_PUBLIC_SITE_URL") or DEFAULTS["NEXT_PUBLIC_SITE_URL"]
    print(f"==> Image tag: {tag}", flush=True)
    print(f"==> Site URL:  {site_url}", flush=True)
    subs = (
        f"_REGION={cfg['REGION']},"
        f"_SERVICE={cfg['SERVICE']},"
        f"_REPO={cfg['REPO']},"
        f"_IMAGE={cfg['IMAGE']},"
        f"_TAG={tag},"
        f"_SITE_URL={site_url}"
    )
    result = subprocess.run(
        [
            "gcloud",
            "builds",
            "submit",
            "--config=cloudbuild.yaml",
            f"--substitutions={subs}",
        ],
        cwd=ROOT,
        text=True,
    )
    if result.returncode != 0:
        print(
            "\nERROR: gcloud builds submit failed.\n"
            "Проверь billing и права Cloud Build, затем:\n"
            "  python3 scripts/deploy.py --setup --deploy\n",
            file=sys.stderr,
            flush=True,
        )
        raise SystemExit(result.returncode)

    sync_runtime_env(cfg)


def print_url(cfg: dict[str, str]) -> None:
    url = run_out(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            cfg["SERVICE"],
            f"--region={cfg['REGION']}",
            "--format=value(status.url)",
        ]
    )
    print(f"==> Live: {url}", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy tc_26 to Cloud Run")
    parser.add_argument("--setup", action="store_true", help="Enable APIs and registry")
    parser.add_argument(
        "--deploy",
        action="store_true",
        help="Cloud Build + Cloud Run deploy",
    )
    args = parser.parse_args()

    if not args.setup and not args.deploy:
        parser.error("укажи --setup и/или --deploy")

    cfg = load_env(ENV_FILE)

    print(f"==> Project: {cfg['PROJECT_ID']}", flush=True)
    print(f"==> Region:  {cfg['REGION']}", flush=True)
    print(f"==> Service: {cfg['SERVICE']}", flush=True)

    if args.setup:
        setup(cfg)
    if args.deploy:
        deploy(cfg)
        print_url(cfg)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"ERROR: command failed with code {exc.returncode}", file=sys.stderr)
        raise SystemExit(exc.returncode)
