"""Confined MineRush delivery and conditional recovery; never deletes remote files.

Call only with a verified CI package and a fresh, matched FTPS preflight.
The durable journal is retained before each mutation, including uncertain outcomes.
"""
import argparse
from ftplib import FTP_TLS
import io
import json
import os
from pathlib import Path
import re
import ssl
from uuid import uuid4

from scoped_delivery import SCOPE, checked_package, ftp_read, sha
from scoped_transaction import checked_preflight, checked_transaction


def listing(ftp, directory):
    """MLSD success distinguishes absence from a permission-denied RETR 550."""
    result = {}
    for name, facts in ftp.mlsd(directory):
        if name in (".", ".."):
            continue
        if "/" in name or "\\" in name or "\r" in name or "\n" in name:
            raise ValueError("Unsafe directory entry")
        if name in result:
            raise ValueError("Duplicate directory entry")
        result[name] = facts.get("type")
    return result


def save(journal, state):
    temporary = journal.with_suffix(".tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(state, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(journal)


def baseline_check(ftp, baseline, progress=None):
    for index, (path, body) in enumerate(baseline.items(), 1):
        if ftp_read(ftp, path) != body:
            raise ValueError("Production baseline changed: " + path)
        if progress and index % 16 == 0:
            progress({"phase": "baseline-check", "checkedFiles": index,
                      "totalFiles": len(baseline)})


def replace(ftp, path, body, state, journal):
    if not re.fullmatch(re.escape(SCOPE) + r"(?:index\.html|build-version\.json|assets/[A-Za-z0-9_-]+\.(?:js|css))", path):
        raise ValueError("Write outside MineRush scope")
    if not re.fullmatch(r"[0-9a-f]{32}", state["transaction"]):
        raise ValueError("Invalid transaction identifier")
    temporary = path + ".pending-" + state["transaction"]
    state["pending"] = {"path": path, "temporary": temporary, "sha256": sha(body)}
    save(journal, state)
    ftp.storbinary("STOR " + temporary, io.BytesIO(body))
    if ftp_read(ftp, temporary) != body:
        raise ValueError("Staged upload checksum mismatch")
    ftp.rename(temporary, path)
    if ftp_read(ftp, path) != body:
        raise ValueError("Published upload checksum mismatch")
    state["written"].append(path)
    state["pending"] = None
    save(journal, state)


def deliver(package, backup, ftp, journal, progress=None):
    """Write immutable assets first, version second, entry HTML last.

    No automatic retry after a failed/unknown write. Use recover with a fresh
    connection, then inspect the live site before deciding on another delivery.
    """
    manifest = checked_package(package)
    package, backup, journal = Path(package), Path(backup), Path(journal)
    if journal.exists() or journal.with_suffix(".tmp").exists():
        raise ValueError("Use a fresh transaction journal")
    baseline = checked_preflight(package, backup)
    baseline_check(ftp, baseline, progress)
    entries = listing(ftp, SCOPE.rstrip("/"))
    if entries.get("index.html") != "file":
        raise ValueError("Existing entry must be a regular file")
    version = SCOPE + "build-version.json"
    if "build-version.json" in entries and entries["build-version.json"] != "file":
        raise ValueError("Version path is not a regular file")
    old_version = ftp_read(ftp, version) if "build-version.json" in entries else None
    assets = [entry for entry in manifest["files"] if entry["path"].startswith(SCOPE + "assets/")]
    if "assets" in entries and entries["assets"] != "dir":
        raise ValueError("Asset path is not a directory")
    asset_entries = listing(ftp, SCOPE + "assets") if "assets" in entries else {}
    for entry in assets:
        name = entry["path"].removeprefix(SCOPE + "assets/")
        if name in asset_entries and (asset_entries[name] != "file" or
                sha(ftp_read(ftp, entry["path"])) != entry["sha256"]):
            raise ValueError("Scoped asset collision")
    state = {"schema": 1, "transaction": uuid4().hex, "scope": SCOPE,
             "commit": manifest["commit"], "status": "prepared", "pending": None,
             "written": [], "oldHtmlHex": baseline[SCOPE + "index.html"].hex(),
             "oldVersionHex": old_version.hex() if old_version is not None else None,
             "newHtmlSha256": sha((package / "site" / SCOPE / "index.html").read_bytes()),
             "newVersionSha256": sha((package / "site" / version).read_bytes()),
             "deployed": False}
    # Keep the old version separately from the mutable progress journal. Older
    # deliveries without a receipt may only recover an initially absent marker.
    version_receipt = {"schema": 1, "transaction": state["transaction"],
                       "commit": state["commit"], "oldVersionHex": state["oldVersionHex"]}
    with (backup / ("transaction-" + state["transaction"] + ".json")).open("x", encoding="utf-8") as stream:
        json.dump(version_receipt, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    save(journal, state)
    def phase(name):
        state["status"] = name
        save(journal, state)
        if progress:
            progress({"phase": name})
    try:
        if assets and "assets" not in entries:
            phase("creating-assets-directory")
            ftp.mkd(SCOPE + "assets")
        phase("uploading-assets")
        for entry in assets:
            name = entry["path"].removeprefix(SCOPE + "assets/")
            if name not in asset_entries:
                replace(ftp, entry["path"], (package / "site" / entry["path"]).read_bytes(), state, journal)
        # Do not switch the entry if any protected baseline moved during upload.
        phase("checking-before-cutover")
        baseline_check(ftp, baseline, progress)
        current_entries = listing(ftp, SCOPE.rstrip("/"))
        current_version = ftp_read(ftp, version) if "build-version.json" in current_entries else None
        if current_version != old_version:
            raise ValueError("Version changed during upload")
        phase("switching-version")
        replace(ftp, version, (package / "site" / version).read_bytes(), state, journal)
        baseline_check(ftp, baseline, progress)
        phase("switching-entry")
        replace(ftp, SCOPE + "index.html", (package / "site" / SCOPE / "index.html").read_bytes(), state, journal)
        phase("verifying-protected-baseline")
        baseline_check(ftp, {p: b for p, b in baseline.items() if p != SCOPE + "index.html"}, progress)
        state["status"] = "uploaded-awaiting-http-and-browser-acceptance"
        save(journal, state)
    except Exception:
        state["status"] = "uncertain-reconcile-before-retry"
        save(journal, state)
        raise
    return state


def recover(ftp, journal, package, backup):
    """Restore HTML only when its bytes are old or belong to this transaction.

    Assets and an initially absent version marker remain as harmless files;
    recovery does not delete files or overwrite a third party's later changes.
    """
    journal = Path(journal)
    state, baseline = checked_transaction(package, backup, journal)
    old_html = baseline[SCOPE + "index.html"]
    # Restoring HTML must not re-enable an old dependency that changed since
    # backup. Leave both current entry and version untouched on disagreement.
    baseline_check(ftp, {path: body for path, body in baseline.items()
                         if path != SCOPE + "index.html"})
    current = ftp_read(ftp, SCOPE + "index.html")
    if current != old_html and sha(current) != state["newHtmlSha256"]:
        raise ValueError("Entry changed externally; recovery refused")
    version = SCOPE + "build-version.json"
    entries = listing(ftp, SCOPE.rstrip("/"))
    current_version = ftp_read(ftp, version) if "build-version.json" in entries else None
    old_version = bytes.fromhex(state["oldVersionHex"]) if state["oldVersionHex"] is not None else None
    if current_version != old_version:
        if current_version is None or sha(current_version) != state["newVersionSha256"]:
            raise ValueError("Version changed externally; recovery refused")
    if current != old_html:
        replace(ftp, SCOPE + "index.html", old_html, state, journal)
    if current_version != old_version:
        if old_version is not None:
            replace(ftp, version, old_version, state, journal)
    state["status"] = "entry-restored-awaiting-http-and-browser-acceptance"
    state["retainedVersionMarker"] = old_version is None and current_version is not None
    save(journal, state)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("upload", "recover"))
    parser.add_argument("journal")
    parser.add_argument("--package")
    parser.add_argument("--backup")
    args = parser.parse_args()
    if not (args.package and args.backup):
        parser.error("upload and recover require --package and --backup")
    if args.action == "recover":
        # Refuse invalid local evidence before even opening an authenticated
        # production connection. recover checks again at its operation boundary.
        checked_transaction(args.package, args.backup, args.journal)
    else:
        checked_preflight(args.package, args.backup)
    with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"], 21)
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ.get("FTP_SERVER_DIR") or ".")
        state = (deliver(args.package, args.backup, ftp, args.journal,
                         progress=lambda event: print(json.dumps(event), flush=True))
                 if args.action == "upload" else recover(ftp, args.journal, args.package, args.backup))
    print(json.dumps({"status": state["status"], "deployed": False, "scope": SCOPE}))


if __name__ == "__main__":
    main()
