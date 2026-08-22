# -*- coding: utf-8 -*-
"""Unit tests for scripts/deploy.py helpers."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


def _load():
    root = Path(__file__).resolve().parents[1]
    path = root / "scripts" / "deploy.py"
    spec = importlib.util.spec_from_file_location("deploy", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class DeployHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.d = _load()

    def test_load_env_prefers_file_over_shell(self):
        import os

        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write(
                "PROJECT_ID=tc-test\n"
                "REGION=europe-west1\n"
                "NEXT_PUBLIC_SITE_URL=https://tios-test.com\n"
            )
            path = Path(f.name)
        prev = os.environ.get("NEXT_PUBLIC_SITE_URL")
        os.environ["NEXT_PUBLIC_SITE_URL"] = "https://stale.run.app"
        try:
            cfg = self.d.load_env(path)
            self.assertEqual(cfg["NEXT_PUBLIC_SITE_URL"], "https://tios-test.com")
        finally:
            if prev is None:
                os.environ.pop("NEXT_PUBLIC_SITE_URL", None)
            else:
                os.environ["NEXT_PUBLIC_SITE_URL"] = prev
            path.unlink(missing_ok=True)

    def test_warn_if_run_app_url(self):
        with self.assertRaises(SystemExit):
            self.d.warn_if_run_app_url("https://tc26-wppkmlz42a-ew.a.run.app")

    def test_escape_yaml(self):
        self.assertEqual(self.d.escape_yaml('a"b'), 'a\\"b')

    def test_validate_runtime_env(self):
        with self.assertRaises(SystemExit):
            self.d.validate_runtime_env({"JWT_SECRET": "change-me-in-production"})

    def test_validate_ai_agent_files_ok(self):
        self.d.validate_ai_agent_files(self.d.ROOT)

    def test_validate_ai_agent_files_missing_marker(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            public = root / "public"
            public.mkdir()
            (public / "llms.txt").write_text("# TIOS\n", encoding="utf-8")
            (public / "llms-full.txt").write_text("x", encoding="utf-8")
            (public / "ai.txt").write_text("agent-card.json", encoding="utf-8")
            with self.assertRaises(SystemExit):
                self.d.validate_ai_agent_files(root)


if __name__ == "__main__":
    unittest.main()
