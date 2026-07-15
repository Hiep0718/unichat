"""Load dependency inventories and normalize npm and OSV audit findings."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

OSV_QUERY_BATCH_URL = "https://api.osv.dev/v1/querybatch"
OSV_VULNERABILITY_URL = "https://api.osv.dev/v1/vulns"
BLOCKING_SEVERITIES = frozenset({"HIGH", "CRITICAL", "UNKNOWN"})
SEVERITY_PRIORITY = {"UNKNOWN": 1, "HIGH": 2, "CRITICAL": 3}


class AuditPolicyError(RuntimeError):
    """Indicate unavailable, malformed, or internally inconsistent audit data."""


@dataclass(frozen=True)
class Dependency:
    """Describe one exact dependency version submitted to OSV."""

    ecosystem: str
    name: str
    version: str


@dataclass(frozen=True)
class Finding:
    """Describe one normalized blocking dependency finding."""

    ecosystem: str
    package: str
    version: str
    severity: str
    advisory_ids: tuple[str, ...]


def _parse_python_inventory(path: Path) -> list[Dependency]:
    dependencies: list[Dependency] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith(("#", "-r ")) or "==" not in line:
            continue
        name, version = line.split("==", maxsplit=1)
        dependencies.append(Dependency("PyPI", name.strip(), version.strip()))
    if not dependencies:
        raise AuditPolicyError("Python resolved inventory is empty")
    return dependencies


def _parse_maven_inventory(path: Path) -> list[Dependency]:
    dependencies: set[Dependency] = set()
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = re.sub(r"^\[INFO\]\s*", "", raw_line.strip())
        coordinate = re.sub(r"^[|+\\\-\s]+", "", line).split(" ", maxsplit=1)[0]
        parts = coordinate.split(":")
        if len(parts) < 5:
            continue
        dependencies.add(Dependency("Maven", f"{parts[0]}:{parts[1]}", parts[-2]))
    if not dependencies:
        raise AuditPolicyError("Maven resolved inventory is empty")
    return sorted(dependencies, key=lambda item: (item.name, item.version))


def _request_json(url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    encoded = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(url, data=encoded, headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=30) as response:  # noqa: S310 - fixed HTTPS URLs only
            parsed = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        error_name = type(error).__name__
        raise AuditPolicyError(f"Dependency audit endpoint failed: {error_name}") from error
    if not isinstance(parsed, dict):
        raise AuditPolicyError("Dependency audit endpoint returned an invalid payload")
    return parsed


def _query_osv(dependencies: list[Dependency]) -> list[dict[str, Any]]:
    queries = [
        {
            "package": {"ecosystem": dependency.ecosystem, "name": dependency.name},
            "version": dependency.version,
        }
        for dependency in dependencies
    ]
    batch = _request_json(OSV_QUERY_BATCH_URL, {"queries": queries})
    results = batch.get("results")
    if not isinstance(results, list) or len(results) != len(dependencies):
        raise AuditPolicyError("OSV batch response does not match the submitted inventory")
    if any(result.get("next_page_token") for result in results):
        raise AuditPolicyError("OSV batch response requires unsupported pagination")
    return results


def _load_osv_details(results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    advisory_ids = {
        vulnerability["id"]
        for result in results
        for vulnerability in result.get("vulns", [])
        if isinstance(vulnerability, dict) and isinstance(vulnerability.get("id"), str)
    }
    return {
        advisory_id: _request_json(
            f"{OSV_VULNERABILITY_URL}/{quote(advisory_id, safe='')}"
        )
        for advisory_id in sorted(advisory_ids)
    }


def _normalize_severity(vulnerability: dict[str, Any]) -> str:
    for container_name in ("database_specific", "ecosystem_specific"):
        container = vulnerability.get(container_name, {})
        value = container.get("severity") if isinstance(container, dict) else None
        if isinstance(value, str):
            normalized = value.upper()
            return "MODERATE" if normalized == "MEDIUM" else normalized
    for severity in vulnerability.get("severity", []):
        score = severity.get("score") if isinstance(severity, dict) else None
        if isinstance(score, (int, float)) or (isinstance(score, str) and score.isdigit()):
            numeric_score = float(score)
            if numeric_score >= 9:
                return "CRITICAL"
            if numeric_score >= 7:
                return "HIGH"
            return "MODERATE"
    return "UNKNOWN"


def _osv_findings(
    dependencies: list[Dependency],
    results: list[dict[str, Any]],
    details: dict[str, dict[str, Any]],
) -> list[Finding]:
    findings: dict[tuple[str, str, str, tuple[str, ...]], Finding] = {}
    for dependency, result in zip(dependencies, results, strict=True):
        for summary in result.get("vulns", []):
            vulnerability = details.get(summary.get("id"), {})
            severity = _normalize_severity(vulnerability)
            if severity not in BLOCKING_SEVERITIES:
                continue
            identifiers = {vulnerability.get("id", "")}
            identifiers.update(vulnerability.get("aliases", []))
            advisory_ids = tuple(sorted(item for item in identifiers if item))
            key = (dependency.ecosystem, dependency.name, dependency.version, advisory_ids)
            finding = Finding(
                dependency.ecosystem,
                dependency.name,
                dependency.version,
                severity,
                advisory_ids,
            )
            current = findings.get(key)
            if current is None or SEVERITY_PRIORITY[severity] > SEVERITY_PRIORITY[current.severity]:
                findings[key] = finding
    return sorted(
        findings.values(), key=lambda item: (item.ecosystem, item.package, item.version)
    )


def _npm_versions(path: Path) -> dict[str, str]:
    lock = json.loads(path.read_text(encoding="utf-8"))
    versions: dict[str, set[str]] = {}
    for package_path, metadata in lock.get("packages", {}).items():
        if "node_modules/" not in package_path or not isinstance(metadata, dict):
            continue
        name = package_path.rsplit("node_modules/", maxsplit=1)[-1]
        version = metadata.get("version")
        if isinstance(version, str):
            versions.setdefault(name, set()).add(version)
    return {name: ",".join(sorted(values)) for name, values in versions.items()}


def _npm_advisory_ids(vulnerability: dict[str, Any], package: str) -> tuple[str, ...]:
    identifiers: set[str] = set()
    for advisory in vulnerability.get("via", []):
        if not isinstance(advisory, dict):
            continue
        candidate = advisory.get("url", "").rstrip("/").rsplit("/", maxsplit=1)[-1]
        if candidate.upper().startswith("GHSA-"):
            identifiers.add(candidate)
        elif advisory.get("source") is not None:
            identifiers.add(f"NPM-{advisory['source']}")
    return tuple(sorted(identifiers or {f"NPM-AUDIT:{package}"}))


def _parse_npm_findings(report_path: Path, lock_path: Path) -> list[Finding]:
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("error"):
        raise AuditPolicyError("npm audit returned an error payload")
    vulnerabilities = report.get("vulnerabilities")
    if not isinstance(vulnerabilities, dict):
        raise AuditPolicyError("npm audit report does not contain vulnerabilities data")
    versions = _npm_versions(lock_path)
    findings: list[Finding] = []
    for package, vulnerability in vulnerabilities.items():
        severity = str(vulnerability.get("severity", "UNKNOWN")).upper()
        if severity not in BLOCKING_SEVERITIES:
            continue
        findings.append(
            Finding(
                "npm",
                package,
                versions.get(package, "UNKNOWN"),
                severity,
                _npm_advisory_ids(vulnerability, package),
            )
        )
    return sorted(findings, key=lambda item: (item.package, item.version))
