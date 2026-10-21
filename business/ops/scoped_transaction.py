"""Bind a retained transaction to its candidate and recovery bytes before use.

No network or production writes. The caller selects acceptance or recovery only
once these independent retained artifacts agree.
"""
import json
from pathlib import Path
import re

from scoped_delivery import (SCOPE, MAX_RECOVERY_FILES, MAX_RECOVERY_BYTES,
                             asset_references, checked_package, sha)


def checked_preflight(package, backup):
    """Validate a complete retained baseline before upload, recovery or HTTP use."""
    package, backup = Path(package), Path(backup)
    manifest = checked_package(package)
    report = json.loads((backup / "preflight.json").read_text(encoding="utf-8"))
    if (report.get("schema") != 1 or report.get("scope") != SCOPE or
            report.get("status") != "read-only-preflight" or
            report.get("commit") != manifest["commit"] or
            report.get("packageManifestSha256") != sha((package / "manifest.json").read_bytes())):
        raise ValueError("Preflight does not bind this package")
    entries = report.get("baseline")
    if not isinstance(entries, list) or not 2 <= len(entries) <= MAX_RECOVERY_FILES:
        raise ValueError("Invalid recovery inventory")
    baseline = {}
    total_bytes = 0
    for entry in entries:
        path = entry["path"]
        if (path in baseline or (path not in ("index.html", SCOPE + "index.html") and
                not re.fullmatch(r"(?:assets/|" + re.escape(SCOPE) + r"assets/)(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+", path)) or
                any(part in (".", "..") for part in path.split("/"))):
            raise ValueError("Unsafe or duplicate recovery path")
        retained = backup / "before" / path
        if any(parent.is_symlink() for parent in (retained, *retained.parents)):
            raise ValueError("Recovery symlink refused")
        if total_bytes + retained.stat().st_size > MAX_RECOVERY_BYTES:
            raise ValueError("Recovery byte limit exceeded")
        body = retained.read_bytes()
        total_bytes += len(body)
        if sha(body) != entry["sha256"]:
            raise ValueError("Recovery checksum mismatch")
        baseline[path] = body
    if not {"index.html", SCOPE + "index.html"} <= baseline.keys():
        raise ValueError("Missing production baseline")
    pending = {SCOPE + "index.html"}
    visited = set()
    while pending:
        path = pending.pop()
        if path in visited:
            continue
        if path not in baseline:
            raise ValueError("Recovery static dependency missing: " + path)
        visited.add(path)
        pending.update(asset_references(baseline[path], path) - visited)
    return baseline


def checked_transaction(package, backup, journal):
    package, backup = Path(package), Path(backup)
    manifest = checked_package(package)
    state = json.loads(Path(journal).read_text(encoding="utf-8"))
    if (state.get("schema") != 1 or state.get("scope") != SCOPE or
            not re.fullmatch(r"[0-9a-f]{32}", state.get("transaction", "")) or
            state.get("commit") != manifest["commit"]):
        raise ValueError("Journal, recovery and candidate are not bound")
    for key, path in (("newHtmlSha256", SCOPE + "index.html"),
                      ("newVersionSha256", SCOPE + "build-version.json")):
        if state.get(key) != sha((package / "site" / path).read_bytes()):
            raise ValueError("Journal candidate checksum mismatch")
    baseline = checked_preflight(package, backup)
    if bytes.fromhex(state["oldHtmlHex"]) != baseline[SCOPE + "index.html"]:
        raise ValueError("Old entry does not match recovery")
    old_version = state.get("oldVersionHex")
    if old_version is not None:
        if not isinstance(old_version, str) or len(old_version) > MAX_RECOVERY_BYTES * 2:
            raise ValueError("Invalid retained old version")
        bytes.fromhex(old_version)
    receipt = backup / ("transaction-" + state["transaction"] + ".json")
    if receipt.is_symlink():
        raise ValueError("Recovery symlink refused")
    if receipt.exists():
        version = json.loads(receipt.read_text(encoding="utf-8"))
        if version != {"schema": 1, "transaction": state["transaction"],
                       "commit": state["commit"], "oldVersionHex": state["oldVersionHex"]}:
            raise ValueError("Old version does not match retained transaction")
    elif old_version is not None:
        raise ValueError("Retained old version receipt required")
    return state, baseline
