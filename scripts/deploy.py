#!/usr/bin/env python3
"""Deploy tc_26 to Google Cloud Run via Cloud Build.

--deploy ALWAYS runs tests first (no skip). Deploy aborts if tests fail.
Mobile layout tests hit the live Cloud Run URL (no local `next build`).

Usage:
  python3 scripts/deploy.py --deploy   # unit tests → Cloud Build → mobile on prod
  python3 scripts/deploy.py --test     # unit + mobile tests (against prod URL)
  python3 scripts/deploy.py --setup
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"

DEFAULTS = {
    "PROJECT_ID": "",
    "REGION": "europe-west1",
    "SERVICE": "tc26",
    "REPO": "tc26",
    "IMAGE": "tc26",
    "NEXT_PUBLIC_SITE_URL": "https://tc26-wppkmlz42a-ew.a.run.app",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID": "G-TYYGE7DS6E",
    "NEXT_PUBLIC_GA_ENABLED": "true",
}

RUNTIME_ENV_KEYS = (
    "DATABASE_URL",
    "DIRECT_URL",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    "NEXT_PUBLIC_GA_ENABLED",
    "GA4_PROPERTY_ID",
    "GA4_SERVICE_ACCOUNT_JSON",
)


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
        if os.environ.get(key):
            data[key] = os.environ[key]
    if not data.get("PROJECT_ID"):
        raise SystemExit("PROJECT_ID is empty in .env")
    return data


def run(cmd: list[str], *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    print("==>", " ".join(cmd), flush=True)
    return subprocess.run(
        cmd,
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=capture,
    )


def run_out(cmd: list[str]) -> str:
    return (run(cmd, capture=True).stdout or "").strip()


def validate_runtime_env(cfg: dict[str, str]) -> None:
    if not cfg.get("JWT_SECRET") or cfg.get("JWT_SECRET") == "change-me-in-production":
        raise SystemExit("JWT_SECRET missing in .env (openssl rand -base64 48)")
    if not cfg.get("DATABASE_URL"):
        raise SystemExit("DATABASE_URL missing in .env")
    if not cfg.get("DIRECT_URL"):
        raise SystemExit("DIRECT_URL missing in .env")


def escape_yaml(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def resolve_ga_service_account_json(cfg: dict[str, str]) -> None:
    """Cloud Run gets minified JSON in GA4_SERVICE_ACCOUNT_JSON."""
    if cfg.get("GA4_SERVICE_ACCOUNT_JSON"):
        try:
            cfg["GA4_SERVICE_ACCOUNT_JSON"] = json.dumps(
                json.loads(cfg["GA4_SERVICE_ACCOUNT_JSON"]),
                separators=(",", ":"),
            )
        except json.JSONDecodeError as exc:
            raise SystemExit(f"GA4_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}") from exc
        return

    json_file = cfg.get("GA4_SERVICE_ACCOUNT_JSON_FILE", "").strip()
    if not json_file:
        return

    path = Path(json_file)
    if not path.is_file():
        path = ROOT / json_file
    if not path.is_file():
        raise SystemExit(f"GA4_SERVICE_ACCOUNT_JSON_FILE not found: {json_file}")

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"GA4 service account file is not valid JSON: {exc}") from exc

    cfg["GA4_SERVICE_ACCOUNT_JSON"] = json.dumps(payload, separators=(",", ":"))


def image_tag() -> str:
    cp = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    tag = (cp.stdout or "").strip()
    return tag or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def ensure_gcloud_login() -> None:
    account = run_out(["gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"])
    if not account:
        run(["gcloud", "auth", "login"])


def setup(cfg: dict[str, str]) -> None:
    project, region, repo = cfg["PROJECT_ID"], cfg["REGION"], cfg["REPO"]
    ensure_gcloud_login()
    run(["gcloud", "config", "set", "project", project, "--quiet"])
    run(
        [
            "gcloud",
            "services",
            "enable",
            "run.googleapis.com",
            "cloudbuild.googleapis.com",
            "artifactregistry.googleapis.com",
        ]
    )
    if (
        subprocess.run(
            ["gcloud", "artifacts", "repositories", "describe", repo, f"--location={region}"],
            cwd=ROOT,
            capture_output=True,
        ).returncode
        != 0
    ):
        run(
            [
                "gcloud",
                "artifacts",
                "repositories",
                "create",
                repo,
                "--repository-format=docker",
                f"--location={region}",
            ]
        )
    print("Setup done", flush=True)


def sync_runtime_env(cfg: dict[str, str]) -> None:
    resolve_ga_service_account_json(cfg)
    lines = [
        f'{key}: "{escape_yaml(cfg[key])}"'
        for key in RUNTIME_ENV_KEYS
        if cfg.get(key)
    ]
    env_file = ROOT / ".runtime-env.yaml"
    env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    cmd = [
        "gcloud",
        "run",
        "services",
        "update",
        cfg["SERVICE"],
        f"--region={cfg['REGION']}",
        f"--project={cfg['PROJECT_ID']}",
        f"--env-vars-file={env_file}",
    ]
    try:
        last_err = ""
        for attempt in range(1, 6):
            print(f"==> sync env (attempt {attempt}/5)", flush=True)
            proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True)
            if proc.returncode == 0:
                if proc.stdout:
                    print(proc.stdout, flush=True)
                return
            last_err = (proc.stderr or proc.stdout or "").strip()
            if attempt < 5:
                time.sleep(5)
        print(last_err, file=sys.stderr, flush=True)
        raise SystemExit(f"sync_runtime_env failed: {last_err}")
    finally:
        env_file.unlink(missing_ok=True)


def service_url(cfg: dict[str, str]) -> str:
    return run_out(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            cfg["SERVICE"],
            f"--region={cfg['REGION']}",
            f"--project={cfg['PROJECT_ID']}",
            "--format=value(status.url)",
        ]
    )


def wait_for_live_url(url: str, *, attempts: int = 30, delay_sec: float = 2.0) -> None:
    """Wait until Cloud Run serves HTTP after a fresh deploy."""
    probe = url.rstrip("/") + "/"
    last_error = "unknown error"

    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(probe, timeout=8) as response:
                if 200 <= response.status < 500:
                    print(f"==> live URL ready: {probe}", flush=True)
                    return
                last_error = f"HTTP {response.status}"
        except urllib.error.HTTPError as exc:
            if 200 <= exc.code < 500:
                print(f"==> live URL ready: {probe}", flush=True)
                return
            last_error = f"HTTP {exc.code}"
        except OSError as exc:
            last_error = str(exc)

        if attempt < attempts:
            print(
                f"==> waiting for live URL ({attempt}/{attempts}): {last_error}",
                flush=True,
            )
            time.sleep(delay_sec)

    raise SystemExit(f"Live URL not reachable after deploy: {probe} ({last_error})")


def mobile_layout_base_url(cfg: dict[str, str]) -> str:
    """URL for Playwright mobile layout tests (live site, not local build)."""
    explicit = os.environ.get("BASE_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    site = cfg.get("NEXT_PUBLIC_SITE_URL", "").strip()
    if site:
        return site.rstrip("/")
    return service_url(cfg).rstrip("/")


def run_unit_tests() -> None:
    """Mandatory pre-deploy gate. Do not bypass."""
    print("==> vitest: calculations, encdata, API routes", flush=True)
    run(["npm", "test"])
    print("==> deploy.py unit tests", flush=True)
    run(
        [
            sys.executable,
            "-m",
            "unittest",
            "discover",
            "-s",
            "tests",
            "-p",
            "test_*.py",
            "-q",
        ]
    )


def run_mobile_layout_tests(cfg: dict[str, str], *, base_url: str | None = None) -> None:
    url = (base_url or mobile_layout_base_url(cfg)).rstrip("/")
    print(f"==> mobile layout tests (playwright, {url})", flush=True)
    env = os.environ.copy()
    env["BASE_URL"] = url
    # Compare only the commit being deployed vs its parent (main === HEAD on deploy).
    env.setdefault("MOBILE_TEST_BASE", "HEAD~1")
    subprocess.run(
        ["npm", "run", "test:mobile"],
        cwd=ROOT,
        check=True,
        env=env,
    )


def run_tests(cfg: dict[str, str]) -> None:
    """Unit tests + mobile layout smoke on live URL."""
    run_unit_tests()
    run_mobile_layout_tests(cfg)
    print("==> all tests passed", flush=True)


def deploy(cfg: dict[str, str]) -> None:
    run_unit_tests()

    validate_runtime_env(cfg)
    ensure_gcloud_login()
    run(["gcloud", "config", "set", "project", cfg["PROJECT_ID"], "--quiet"])

    tag = image_tag()
    site_url = cfg.get("NEXT_PUBLIC_SITE_URL") or DEFAULTS["NEXT_PUBLIC_SITE_URL"]
    ga_id = cfg.get("NEXT_PUBLIC_GA_MEASUREMENT_ID") or DEFAULTS["NEXT_PUBLIC_GA_MEASUREMENT_ID"]
    ga_enabled = cfg.get("NEXT_PUBLIC_GA_ENABLED") or DEFAULTS["NEXT_PUBLIC_GA_ENABLED"]
    subs = (
        f"_REGION={cfg['REGION']},"
        f"_SERVICE={cfg['SERVICE']},"
        f"_REPO={cfg['REPO']},"
        f"_IMAGE={cfg['IMAGE']},"
        f"_TAG={tag},"
        f"_SITE_URL={site_url},"
        f"_GA_MEASUREMENT_ID={ga_id},"
        f"_GA_ENABLED={ga_enabled}"
    )
    print(f"Deploy tag={tag} url={site_url}", flush=True)
    run(
        [
            "gcloud",
            "builds",
            "submit",
            "--config=cloudbuild.yaml",
            f"--substitutions={subs}",
        ]
    )
    sync_runtime_env(cfg)
    live_url = service_url(cfg)
    wait_for_live_url(live_url)
    run_mobile_layout_tests(cfg, base_url=live_url)
    print(f"Live: {live_url}", flush=True)


def sync_env_only(cfg: dict[str, str]) -> None:
    validate_runtime_env(cfg)
    ensure_gcloud_login()
    run(["gcloud", "config", "set", "project", cfg["PROJECT_ID"], "--quiet"])
    sync_runtime_env(cfg)
    print(f"Live: {service_url(cfg)}", flush=True)


def main() -> int:
    if not shutil.which("gcloud"):
        raise SystemExit("gcloud not found")

    parser = argparse.ArgumentParser(description="Deploy tc_26 to Cloud Run")
    parser.add_argument("--setup", action="store_true")
    parser.add_argument("--deploy", action="store_true")
    parser.add_argument("--test", action="store_true", help="npm test")
    parser.add_argument(
        "--sync-env",
        action="store_true",
        help="Push DATABASE_URL/JWT from .env to Cloud Run (no rebuild)",
    )
    args = parser.parse_args()
    if not args.setup and not args.deploy and not args.test and not args.sync_env:
        parser.error("укажи --setup, --deploy, --sync-env и/или --test")

    cfg = load_env(ENV_FILE)
    if args.setup:
        setup(cfg)
    if args.test:
        run_tests(cfg)
    if args.sync_env:
        sync_env_only(cfg)
    if args.deploy:
        deploy(cfg)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode)
