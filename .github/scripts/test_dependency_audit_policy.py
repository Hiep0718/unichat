"""Unit tests for the dependency audit policy evaluator."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("dependency_audit_policy.py")
MODULE_SPEC = importlib.util.spec_from_file_location("dependency_audit_policy", MODULE_PATH)
if MODULE_SPEC is None or MODULE_SPEC.loader is None:
    raise RuntimeError("Cannot load dependency audit policy module")
POLICY = importlib.util.module_from_spec(MODULE_SPEC)
sys.modules[MODULE_SPEC.name] = POLICY
MODULE_SPEC.loader.exec_module(POLICY)


class DependencyAuditPolicyTest(unittest.TestCase):
    """Verify inventory parsing and scoped-exception behavior."""

    def test_should_parse_exact_python_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "requirements.lock.txt"
            path.write_text("-r base.txt\nchromadb==1.5.9\nhttpx==0.28.1\n", encoding="utf-8")

            dependencies = POLICY._parse_python_inventory(path)

        self.assertEqual(2, len(dependencies))
        self.assertEqual("chromadb", dependencies[0].name)

    def test_should_parse_resolved_maven_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "maven.txt"
            path.write_text(
                "[INFO] +- org.example:library:jar:1.2.3:compile\n",
                encoding="utf-8",
            )

            dependencies = POLICY._parse_maven_inventory(path)

        self.assertEqual("org.example:library", dependencies[0].name)
        self.assertEqual("1.2.3", dependencies[0].version)

    def test_should_allow_exact_exception_for_non_chroma_change(self) -> None:
        result = POLICY._evaluate_policy(
            [self._chroma_finding()],
            [self._chroma_exception()],
            ["core-api/pom.xml"],
            "change",
        )

        self.assertEqual("PASS_WITH_SCOPED_EXCEPTION", result["status"])
        self.assertEqual(["SEC-DEBT-001"], result["exceptionsApplied"])

    def test_should_block_exception_when_chroma_manifest_changes(self) -> None:
        result = POLICY._evaluate_policy(
            [self._chroma_finding()],
            [self._chroma_exception()],
            ["ai-service/requirements.lock.txt"],
            "change",
        )

        self.assertEqual("FAIL", result["status"])
        self.assertEqual("SCOPED_EXCEPTION_NOT_APPLICABLE", result["reason"])

    def test_should_block_release_while_exception_is_open(self) -> None:
        result = POLICY._evaluate_policy(
            [self._chroma_finding()],
            [self._chroma_exception()],
            ["core-api/pom.xml"],
            "release",
        )

        self.assertEqual("FAIL", result["status"])

    def test_should_block_unexcepted_high_finding(self) -> None:
        finding = POLICY.Finding(
            "Maven", "org.example:library", "1.0.0", "HIGH", ("X",)
        )

        result = POLICY._evaluate_policy(
            [self._chroma_finding(), finding],
            [self._chroma_exception()],
            ["core-api/pom.xml"],
            "change",
        )

        self.assertEqual("FAIL", result["status"])
        self.assertEqual("UNEXCEPTED_BLOCKING_FINDING", result["reason"])

    def test_should_fail_when_open_exception_is_not_observed(self) -> None:
        result = POLICY._evaluate_policy(
            [],
            [self._chroma_exception()],
            ["core-api/pom.xml"],
            "change",
        )

        self.assertEqual("FAIL", result["status"])
        self.assertEqual("OPEN_EXCEPTION_NOT_OBSERVED", result["reason"])

    def test_should_parse_npm_high_finding_with_resolved_version(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "audit.json").write_text(
                json.dumps(
                    {
                        "vulnerabilities": {
                            "example": {
                                "severity": "high",
                                "via": [
                                    {
                                        "source": 123,
                                        "url": "https://github.com/advisories/GHSA-test",
                                    }
                                ],
                            }
                        }
                    }
                ),
                encoding="utf-8",
            )
            (root / "package-lock.json").write_text(
                json.dumps({"packages": {"node_modules/example": {"version": "1.2.3"}}}),
                encoding="utf-8",
            )

            findings = POLICY._parse_npm_findings(
                root / "audit.json", root / "package-lock.json"
            )

        self.assertEqual("1.2.3", findings[0].version)
        self.assertEqual(("GHSA-test",), findings[0].advisory_ids)

    def test_should_deduplicate_osv_aliases_at_highest_severity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "requirements.lock.txt"
            path.write_text("chromadb==1.5.9\n", encoding="utf-8")
            dependencies = POLICY._parse_python_inventory(path)
        advisory_ids = ["GHSA-f4j7-r4q5-qw2c", "PYSEC-2026-311"]
        results = [{"vulns": [{"id": item} for item in advisory_ids]}]
        aliases = {"aliases": advisory_ids}
        details = {
            advisory_ids[0]: {
                **aliases,
                "id": advisory_ids[0],
                "database_specific": {"severity": "CRITICAL"},
            },
            advisory_ids[1]: {**aliases, "id": advisory_ids[1]},
        }

        findings = POLICY._osv_findings(dependencies, results, details)

        self.assertEqual(1, len(findings))
        self.assertEqual("CRITICAL", findings[0].severity)

    @staticmethod
    def _chroma_finding():
        return POLICY.Finding(
            "PyPI",
            "chromadb",
            "1.5.9",
            "CRITICAL",
            ("CVE-2026-45829", "GHSA-f4j7-r4q5-qw2c", "PYSEC-2026-311"),
        )

    @staticmethod
    def _chroma_exception():
        return POLICY.AuditException(
            "SEC-DEBT-001",
            "open",
            "PyPI",
            "chromadb",
            "1.5.9",
            frozenset(
                {
                    "CVE-2026-45829",
                    "GHSA-f4j7-r4q5-qw2c",
                    "PYSEC-2026-311",
                }
            ),
        )


if __name__ == "__main__":
    unittest.main()
