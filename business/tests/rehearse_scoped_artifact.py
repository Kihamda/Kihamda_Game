"""Rehearse retained delivery evidence with an in-memory FTP, never production.

Run this test utility before integrating operational changes. All simulated
writes use a private temporary copy; the retained source evidence is read-only.
"""
import argparse
import copy
import json
from pathlib import Path, PurePosixPath
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
from scoped_delivery import SCOPE, inspect, sha
from scoped_transaction import checked_preflight, checked_transaction
from scoped_upload import deliver, recover
from test_scoped_upload import WritableFTP


def rehearse(package, backup, journal):
    package, backup, journal = Path(package), Path(backup), Path(journal)
    original_journal = journal.read_bytes()
    state, baseline = checked_transaction(package, backup, journal)
    # Test helpers implement only dictionary operations, with no socket or TLS.
    ftp = WritableFTP(copy.deepcopy(baseline))
    old_version = bytes.fromhex(state["oldVersionHex"]) if state["oldVersionHex"] is not None else None
    if old_version is not None:
        ftp.files[SCOPE + "build-version.json"] = old_version
    ftp.directories.update(parent.as_posix() for path in baseline
                           for parent in PurePosixPath(path).parents)
    with tempfile.TemporaryDirectory(prefix="kihamda-scoped-rehearsal-") as directory:
        temporary = Path(directory)
        restored_backup = temporary / "backup"
        for path, body in baseline.items():
            retained = restored_backup / "before" / path
            retained.parent.mkdir(parents=True, exist_ok=True)
            retained.write_bytes(body)
        (restored_backup / "preflight.json").write_bytes((backup / "preflight.json").read_bytes())
        simulated_journal = temporary / "transaction.json"
        manifest = json.loads((package / "manifest.json").read_text(encoding="utf-8"))
        deliver(package, restored_backup, ftp, simulated_journal)
        for entry in manifest["files"]:
            if sha(ftp.files[entry["path"]]) != entry["sha256"]:
                raise ValueError("Simulated candidate checksum mismatch")
        for path, body in baseline.items():
            if path != SCOPE + "index.html" and ftp.files[path] != body:
                raise ValueError("Simulated delivery changed retained baseline")
        current = copy.deepcopy(ftp.files)
        next_ftp = WritableFTP(copy.deepcopy(current))
        next_ftp.directories.update(ftp.directories)

        def http(path):
            return current["index.html" if path == "" else
                           SCOPE + "index.html" if path == SCOPE else path]

        next_backup = temporary / "next-backup"
        next_report = inspect(package, next_backup, next_ftp, http)
        checked_preflight(package, next_backup)
        recovered = recover(ftp, simulated_journal, package, restored_backup)
        for path, body in baseline.items():
            if ftp.files[path] != body:
                raise ValueError("Simulated recovery changed retained bytes")
        if old_version is not None and ftp.files[SCOPE + "build-version.json"] != old_version:
            raise ValueError("Simulated recovery changed retained version")
        if any(not path.startswith(SCOPE) for _, path in ftp.mutations):
            raise ValueError("Simulated write escaped game scope")
        if journal.read_bytes() != original_journal:
            raise ValueError("Source journal changed during rehearsal")
        return {"schema": 1, "status": "offline-artifact-rehearsal-passed",
                "deployed": False, "fakeFtp": True, "productionWrites": False,
                "commit": state["commit"], "sourceTransaction": state["transaction"],
                "sourceJournalSha256": sha(original_journal),
                "restoredFiles": len(baseline),
                "nextBaselinePaths": [entry["path"] for entry in next_report["baseline"]],
                "recoveryStatus": recovered["status"],
                "retainedVersionMarker": recovered["retainedVersionMarker"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path, help="Retained scoped-delivery artifact directory")
    args = parser.parse_args()
    result = rehearse(args.artifact / "scoped-minerush", args.artifact / "scoped-recovery",
                      args.artifact / "transaction.json")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
