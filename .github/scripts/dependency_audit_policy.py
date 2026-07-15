#!/usr/bin/env python3
"""Evaluate normalized dependency findings against explicit scoped exceptions."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from dependency_audit_sources import (
    AuditPolicyError,
    Finding,
    _load_osv_details,
    _osv_findings,
    _parse_maven_inventory,
    _parse_npm_findings,
    _parse_python_inventory,
    _query_osv,
)

CHROMA_MANIFEST_PATHS = frozenset(
    {
        "ai-service/pyproject.toml",
        "ai-service/requirements.txt",
        "ai-service/requirements-dev.txt",
        "ai-service/requirements.lock.txt",
        "infra/compose.yaml",
    }
)


@dataclass(frozen=True)
class AuditException:
    """Describe one repository-approved, exact scoped exception."""

    identifier: str
    status: str
    ecosystem: str
    package: str
    version: str
    advisory_ids: frozenset[str]


def _load_exceptions(path: Path) -> list[AuditException]:
    document = json.loads(path.read_text(encoding="utf-8"))
    exceptions = document.get("exceptions")
    if document.get("schemaVersion") != 1 or not isinstance(exceptions, list):
        raise AuditPolicyError("Dependency exception record has an unsupported schema")
    return [
        AuditException(
            identifier=item["id"],
            status=item["status"],
            ecosystem=item["ecosystem"],
            package=item["package"],
            version=item["version"],
            advisory_ids=frozenset(item["advisoryIds"]),
        )
        for item in exceptions
    ]


def _matches_exception(finding: Finding, exception: AuditException) -> bool:
    return (
        exception.status == "open"
        and finding.ecosystem == exception.ecosystem
        and finding.package == exception.package
        and finding.version == exception.version
        and bool(set(finding.advisory_ids) & exception.advisory_ids)
    )


def _touches_chroma_scope(changed_files: list[str]) -> bool:
    for raw_path in changed_files:
        path = raw_path.strip().replace("\\", "/").lower()
        if path in CHROMA_MANIFEST_PATHS:
            return True
        if path.startswith("ai-service/app/") and any(
            marker in path for marker in ("chroma", "retrieval", "vector")
        ):
            return True
        if path.startswith(("deploy/", "deployment/", "infra/helm/", "infra/kubernetes/")):
            return True
    return False


def _select_status(
    unexcepted: list[Finding],
    missing: list[str],
    applied: set[str],
    chroma_scope: bool,
    execution_scope: str,
) -> tuple[str, str]:
    if unexcepted:
        return "FAIL", "UNEXCEPTED_BLOCKING_FINDING"
    if missing:
        return "FAIL", "OPEN_EXCEPTION_NOT_OBSERVED"
    if applied and (chroma_scope or execution_scope == "release"):
        return "FAIL", "SCOPED_EXCEPTION_NOT_APPLICABLE"
    if applied:
        return "PASS_WITH_SCOPED_EXCEPTION", "SCOPED_EXCEPTION_APPLIED"
    return "PASS", "NO_BLOCKING_FINDINGS"


def _evaluate_policy(
    findings: list[Finding],
    exceptions: list[AuditException],
    changed_files: list[str],
    execution_scope: str,
) -> dict[str, Any]:
    applied: set[str] = set()
    unexcepted: list[Finding] = []
    for finding in findings:
        matched = next((item for item in exceptions if _matches_exception(finding, item)), None)
        if matched is None:
            unexcepted.append(finding)
        else:
            applied.add(matched.identifier)
    expected = {item.identifier for item in exceptions if item.status == "open"}
    missing = sorted(expected - applied)
    chroma_scope = _touches_chroma_scope(changed_files)
    status, reason = _select_status(
        unexcepted, missing, applied, chroma_scope, execution_scope
    )
    return {
        "status": status,
        "reason": reason,
        "executionScope": execution_scope,
        "chromaScopeTouched": chroma_scope,
        "exceptionsApplied": sorted(applied),
        "missingOpenExceptions": missing,
        "findings": [asdict(finding) for finding in findings],
        "unexceptedFindings": [asdict(finding) for finding in unexcepted],
    }


def _parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--npm-audit", type=Path, required=True)
    parser.add_argument("--package-lock", type=Path, required=True)
    parser.add_argument("--python-lock", type=Path, required=True)
    parser.add_argument("--maven-tree", type=Path, required=True)
    parser.add_argument("--exceptions", type=Path, required=True)
    parser.add_argument("--changed-files", type=Path, required=True)
    parser.add_argument("--execution-scope", choices=("change", "release"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def _write_result(path: Path, result: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    path.write_text(content, encoding="utf-8")


def _run_policy(arguments: argparse.Namespace) -> dict[str, Any]:
    dependencies = _parse_python_inventory(arguments.python_lock)
    dependencies.extend(_parse_maven_inventory(arguments.maven_tree))
    osv_results = _query_osv(dependencies)
    details = _load_osv_details(osv_results)
    findings = _osv_findings(dependencies, osv_results, details)
    findings.extend(_parse_npm_findings(arguments.npm_audit, arguments.package_lock))
    exceptions = _load_exceptions(arguments.exceptions)
    changed_files = arguments.changed_files.read_text(encoding="utf-8").splitlines()
    return _evaluate_policy(findings, exceptions, changed_files, arguments.execution_scope)


def main() -> int:
    """Run the dependency audit policy command."""
    arguments = _parse_arguments()
    try:
        result = _run_policy(arguments)
    except (AuditPolicyError, OSError, KeyError, TypeError, ValueError) as error:
        result = {
            "status": "FAIL",
            "reason": "AUDIT_UNAVAILABLE_OR_INVALID",
            "detail": str(error),
        }
    _write_result(arguments.output, result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] in {"PASS", "PASS_WITH_SCOPED_EXCEPTION"} else 1


if __name__ == "__main__":
    sys.exit(main())
