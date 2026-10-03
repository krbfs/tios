# -*- coding: utf-8 -*-
"""Unit tests for scripts/backup_site_to_gcs.py."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


def _load():
    root = Path(__file__).resolve().parents[2]
    path = root / "scripts" / "backup_site_to_gcs.py"
    spec = importlib.util.spec_from_file_location("backup_site_to_gcs", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class BackupGcsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = _load()

    def test_only_node_modules_excluded(self):
        self.assertTrue(self.b.should_exclude(Path("tc_26/node_modules/foo")))
        self.assertFalse(self.b.should_exclude(Path("tc_26/.env")))
        self.assertFalse(self.b.should_exclude(Path("tc_26/secrets/key.json")))
        self.assertFalse(self.b.should_exclude(Path("tc_26/.git/HEAD")))
        self.assertFalse(self.b.should_exclude(Path("tc_26/source_sep_16th/foo.docx")))
        self.assertFalse(self.b.should_exclude(Path("tc_26/.next/BUILD_ID")))


if __name__ == "__main__":
    unittest.main()
