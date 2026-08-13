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

    def test_load_env(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
            f.write("PROJECT_ID=tc-test\nREGION=europe-west1\n")
            path = Path(f.name)
        try:
            cfg = self.d.load_env(path)
            self.assertEqual(cfg["PROJECT_ID"], "tc-test")
        finally:
            path.unlink(missing_ok=True)

    def test_escape_yaml(self):
        self.assertEqual(self.d.escape_yaml('a"b'), 'a\\"b')

    def test_validate_runtime_env(self):
        with self.assertRaises(SystemExit):
            self.d.validate_runtime_env({"JWT_SECRET": "change-me-in-production"})


if __name__ == "__main__":
    unittest.main()
