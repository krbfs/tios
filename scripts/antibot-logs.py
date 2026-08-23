#!/usr/bin/env python3
"""Fetch and summarize TIOS antibot structured logs from Cloud Logging.

Events are emitted as JSON with message=tios_antibot (see src/lib/antibot-log.ts).

Usage:
  python3 scripts/antibot-logs.py
  python3 scripts/antibot-logs.py --hours 48 --limit 200
  python3 scripts/antibot-logs.py --event rate_limit --ip 203.0.113.10
  python3 scripts/antibot-logs.py --json
  python3 scripts/antibot-logs.py --block-auto --hours 24
  python3 scripts/antibot-logs.py --block 203.0.113.10 --reason "manual"
  python3 scripts/antibot-logs.py --unblock 203.0.113.10
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
MARKER = "tios_antibot"

DEFAULTS = {
    "PROJECT_ID": "",
    "REGION": "europe-west1",
    "SERVICE": "tc26",
}

# Weighted score for auto-block heuristics (see METHODOLOGY_PROTECTION.md §10).
EVENT_WEIGHTS: dict[str, int] = {
    "honeypot": 100,
    "timing_suspicious": 20,
    "timing_too_fast": 20,
    "unsigned_encdata": 15,
    "invalid_origin": 15,
    "page_skip": 12,
    "challenge_reused": 8,
    "challenge_invalid": 6,
    "test_token_invalid": 5,
    "rate_limit": 4,
    "test_token_missing": 4,
    "challenge_dwell": 3,
    "challenge_missing": 3,
}

DEFAULT_BLOCK_THRESHOLD = 40
IGNORE_IPS = frozenset({"unknown", "127.0.0.1", "::1"})


def load_env(path: Path) -> dict[str, str]:
    data = dict(DEFAULTS)
    if not path.is_file():
        return data
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def gcloud_filter(project: str, service: str, hours: int, event: str | None) -> str:
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime(
        "%Y-%m-%dT%H:%M:%SZ",
    )
    parts = [
        'resource.type="cloud_run_revision"',
        f'resource.labels.service_name="{service}"',
        f'(jsonPayload.message="{MARKER}" OR textPayload=~"{MARKER}")',
        f'timestamp>="{since}"',
    ]
    if event:
        parts.append(
            f'(jsonPayload.event="{event}" OR textPayload=~\\"event\\":\\"{event}\\"")',
        )
    return " AND ".join(parts)


def run_gcloud_read(filter_expr: str, project: str, limit: int) -> list[dict]:
    cmd = [
        "gcloud",
        "logging",
        "read",
        filter_expr,
        f"--project={project}",
        f"--limit={limit}",
        "--format=json",
    ]
    try:
        proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as exc:
        sys.stderr.write(exc.stderr or exc.stdout or "gcloud logging read failed\n")
        raise SystemExit(exc.returncode) from exc

    if not proc.stdout.strip():
        return []
    return json.loads(proc.stdout)


def run_block_ip(ip: str, reason: str, score: int | None, source: str) -> None:
    cmd = [
        "npx",
        "tsx",
        str(ROOT / "scripts" / "block-ips.ts"),
        "add",
        "--ip",
        ip,
        "--reason",
        reason,
        "--source",
        source,
    ]
    if score is not None:
        cmd.extend(["--score", str(score)])
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or proc.stdout or f"block-ips failed for {ip}\n")
        raise SystemExit(proc.returncode)
    print(proc.stdout.strip())


def run_unblock_ip(ip: str) -> None:
    cmd = ["npx", "tsx", str(ROOT / "scripts" / "block-ips.ts"), "remove", "--ip", ip]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or proc.stdout or f"unblock failed for {ip}\n")
        raise SystemExit(proc.returncode)
    print(proc.stdout.strip())


def extract_payload(entry: dict) -> dict | None:
    jp = entry.get("jsonPayload")
    if isinstance(jp, dict) and jp.get("message") == MARKER:
        return jp

    text = entry.get("textPayload")
    if isinstance(text, str) and MARKER in text:
        try:
            parsed = json.loads(text)
            if parsed.get("message") == MARKER:
                return parsed
        except json.JSONDecodeError:
            pass
    return None


def score_ip(payloads: list[dict]) -> tuple[int, list[str]]:
    events = Counter(str(p.get("event", "unknown")) for p in payloads)
    score = 0
    reasons: list[str] = []

    for event, count in events.items():
        weight = EVENT_WEIGHTS.get(event, 2)
        score += weight * count

    if len(events) >= 4:
        score += 25
        reasons.append("multiple_attack_vectors")

    if events.get("honeypot", 0) >= 1:
        reasons.append("honeypot")

    if events.get("unsigned_encdata", 0) >= 5:
        reasons.append("unsigned_encdata_burst")

    if events.get("page_skip", 0) >= 3:
        reasons.append("page_skip_burst")

    if events.get("timing_suspicious", 0) + events.get("timing_too_fast", 0) >= 2:
        reasons.append("timing_abuse")

    if events.get("rate_limit", 0) >= 10:
        reasons.append("rate_limit_storm")

    return score, reasons


def should_auto_block(score: int, events: Counter[str], threshold: int) -> bool:
    if score >= threshold:
        return True
    if events.get("honeypot", 0) >= 1:
        return True
    if events.get("unsigned_encdata", 0) >= 8:
        return True
    if events.get("page_skip", 0) >= 5:
        return True
    return False


def collect_payloads(entries: list[dict]) -> list[dict]:
    payloads: list[dict] = []
    for entry in entries:
        payload = extract_payload(entry)
        if payload:
            payloads.append(payload)
    return payloads


def group_by_ip(payloads: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for payload in payloads:
        ip = str(payload.get("ip", "unknown"))
        grouped[ip].append(payload)
    return grouped


def print_summary(entries: list[dict]) -> None:
    payloads = collect_payloads(entries)
    events: Counter[str] = Counter()
    by_ip: Counter[str] = Counter()

    for payload in payloads:
        event = str(payload.get("event", "unknown"))
        ip = str(payload.get("ip", "unknown"))
        events[event] += 1
        by_ip[ip] += 1

    total = sum(events.values())
    print(f"Antibot events: {total}")
    if total == 0:
        return

    print("\nBy event:")
    for event, count in events.most_common():
        print(f"  {event:22} {count:5}")

    print("\nTop IPs (all events):")
    for ip, count in by_ip.most_common(15):
        print(f"  {ip:20} {count:5}")

    print("\nSuspicious IPs (score >= threshold):")
    threshold = DEFAULT_BLOCK_THRESHOLD
    grouped = group_by_ip(payloads)
    ranked: list[tuple[int, str, list[str], Counter[str]]] = []
    for ip, ip_payloads in grouped.items():
        if ip in IGNORE_IPS:
            continue
        score, reasons = score_ip(ip_payloads)
        ip_events = Counter(str(p.get("event", "unknown")) for p in ip_payloads)
        if should_auto_block(score, ip_events, threshold):
            ranked.append((score, ip, reasons, ip_events))

    ranked.sort(reverse=True)
    if not ranked:
        print("  (none)")
    for score, ip, reasons, ip_events in ranked[:15]:
        top = ", ".join(f"{e}={c}" for e, c in ip_events.most_common(3))
        reason_text = ", ".join(reasons) if reasons else "score"
        print(f"  {ip:20} score={score:3}  {reason_text}  ({top})")

    print("\nRecent lines:")
    for entry in entries[:20]:
        payload = extract_payload(entry)
        if not payload:
            continue
        ts = entry.get("timestamp", "")[:19]
        print(
            f"  {ts}  {payload.get('event','?'):18}  "
            f"{payload.get('status','?'):>3}  {payload.get('ip','?'):16}  "
            f"{payload.get('path','')}  {payload.get('reason','')}"
        )


def auto_block(entries: list[dict], threshold: int, dry_run: bool) -> int:
    payloads = collect_payloads(entries)
    grouped = group_by_ip(payloads)
    blocked = 0

    for ip, ip_payloads in grouped.items():
        if ip in IGNORE_IPS:
            continue
        score, reasons = score_ip(ip_payloads)
        ip_events = Counter(str(p.get("event", "unknown")) for p in ip_payloads)
        if not should_auto_block(score, ip_events, threshold):
            continue

        reason_bits = reasons or ["score"]
        reason = f"auto: score={score} " + ", ".join(reason_bits)
        if dry_run:
            print(f"[dry-run] would block {ip}  {reason}")
        else:
            run_block_ip(ip, reason, score, "antibot-logs")
        blocked += 1

    action = "Would block" if dry_run else "Blocked"
    print(f"\n{action} {blocked} IP(s).")
    return blocked


def main() -> int:
    parser = argparse.ArgumentParser(description="TIOS antibot log viewer")
    parser.add_argument("--hours", type=int, default=24, help="Look back N hours (default 24)")
    parser.add_argument("--limit", type=int, default=100, help="Max log entries (default 100)")
    parser.add_argument("--event", help="Filter by event type (e.g. rate_limit)")
    parser.add_argument("--ip", help="Filter client-side after fetch")
    parser.add_argument("--json", action="store_true", help="Print raw payloads as JSON lines")
    parser.add_argument(
        "--block-auto",
        action="store_true",
        help="Score suspicious IPs from logs and add them to blocked_ips",
    )
    parser.add_argument(
        "--block",
        metavar="IP",
        help="Block a single IP via scripts/block-ips.ts",
    )
    parser.add_argument(
        "--unblock",
        metavar="IP",
        help="Remove IP from blocked_ips",
    )
    parser.add_argument("--reason", default="manual block", help="Reason for --block")
    parser.add_argument(
        "--threshold",
        type=int,
        default=DEFAULT_BLOCK_THRESHOLD,
        help=f"Auto-block score threshold (default {DEFAULT_BLOCK_THRESHOLD})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="With --block-auto, only print IPs that would be blocked",
    )
    args = parser.parse_args()

    if args.block:
        run_block_ip(args.block, args.reason, None, "manual")
        return 0

    if args.unblock:
        run_unblock_ip(args.unblock)
        return 0

    cfg = load_env(ENV_FILE)
    project = cfg.get("PROJECT_ID") or ""
    service = cfg.get("SERVICE") or "tc26"
    if not project:
        raise SystemExit("PROJECT_ID missing in .env")

    filter_expr = gcloud_filter(project, service, args.hours, args.event)
    entries = run_gcloud_read(filter_expr, project, args.limit)

    if args.ip:
        filtered: list[dict] = []
        for entry in entries:
            payload = extract_payload(entry)
            if payload and str(payload.get("ip")) == args.ip:
                filtered.append(entry)
        entries = filtered

    if args.json:
        for entry in entries:
            payload = extract_payload(entry)
            if payload:
                print(json.dumps(payload, ensure_ascii=False))
        return 0

    print(f"Project: {project}  service: {service}  window: {args.hours}h  fetched: {len(entries)}")
    print_summary(entries)

    if args.block_auto:
        auto_block(entries, args.threshold, args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
