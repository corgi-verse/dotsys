"""Adversarial portable-contract checks. Copyright 2026 Hayden Lindley. Apache-2.0."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("corgipanel_validator", ROOT / "validate.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PanelContractTests(unittest.TestCase):
    def setUp(self):
        self.panel = json.loads((ROOT / "example.corgipanel.json").read_text())

    def test_synthetic_reference(self):
        self.assertEqual([], MODULE.validate(self.panel))

    def test_extra_credentials_and_grants_rejected(self):
        for key in ["token", "grant", "privateKey"]:
            panel = copy.deepcopy(self.panel)
            panel["tiles"][0]["actions"][0][key] = "synthetic"
            self.assertTrue(MODULE.validate(panel))

    def test_duplicate_and_unknown_dependencies(self):
        self.panel["tiles"][1]["id"] = "review"
        self.assertTrue(MODULE.validate(self.panel))
        self.setUp()
        self.panel["tiles"][1]["dependsOn"] = ["missing"]
        self.assertTrue(MODULE.validate(self.panel))

    def test_dependency_cycle(self):
        self.panel["tiles"][0]["dependsOn"] = ["draft"]
        self.assertTrue(MODULE.validate(self.panel))

    def test_reference_only_cannot_carry_actions(self):
        self.panel["mode"] = "reference_only"
        self.assertTrue(MODULE.validate(self.panel))

    def test_traversal_assets_and_unbounded_sizes_rejected(self):
        for path, size in [("../secret.png", 1), ("/secret.png", 1), ("assets/ok.png", 10485761)]:
            self.panel["assets"] = [{"path": path, "size": size, "mediaType": "image/png", "sha256": "0" * 64}]
            self.assertTrue(MODULE.validate(self.panel))

    def test_review_tokens_and_userinfo_not_reference_urls(self):
        for uri in ["https://example.invalid/approve?t=synthetic", "https://synthetic@example.invalid/path", "https://example.invalid/path#synthetic", "https://[invalid/path"]:
            self.panel["tiles"][0]["references"] = [{"label": "Example", "uri": uri, "revision": "1"}]
            self.assertTrue(MODULE.validate(self.panel))

    def test_duplicate_json_keys_rejected(self):
        with self.assertRaises(ValueError):
            json.loads('{"id":1,"id":2}', object_pairs_hook=MODULE.strict_object)


if __name__ == "__main__":
    unittest.main()
