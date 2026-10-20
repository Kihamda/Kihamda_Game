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


def baseline_check(ftp, baseline):
    for path, body in baseline.items():
        if ftp_read(ftp, path) != body:
            raise ValueError("Production baseline changed: " + path)


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


def deliver(package, backup, ftp, journal):
    """Write immutable assets first, version second, entry HTML last.

    No automatic retry after a failed/unknown write. Use recover with a fresh
    connection, then inspect the live site before deciding on another delivery.
    """
    manifest = checked_package(package)
    package, backup, journal = Path(package), Path(backup), Path(journal)
    if journal.exists() or journal.with_suffix(".tmp").exists():
        raise ValueError("Use a fresh transaction journal")
    report = json.loads((backup / "preflight.json").read_text(encoding="utf-8"))
    if (report.get("status") != "read-only-preflight" or report.get("scope") != SCOPE or
            report.get("packageManifestSha256") != sha((package / "manifest.json").read_bytes())):
        raise ValueError("Preflight does not bind this package")
    baseline = {}
    for entry in report["baseline"]:
        path = entry["path"]
        if path not in ("index.html", SCOPE + "index.html") and not path.startswith("assets/"):
            raise ValueError("Unsafe baseline path")
        if ".." in path.split("/") or "\\" in path or path.startswith("/"):
            raise ValueError("Unsafe baseline path")
        body = (backup / "before" / path).read_bytes()
        if sha(body) != entry["sha256"]:
            raise ValueError("Recovery checksum mismatch")
        baseline[path] = body
    if not {"index.html", SCOPE + "index.html"} <= baseline.keys():
        raise ValueError("Missing production baseline")
    baseline_check(ftp, baseline)
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
    save(journal, state)
    try:
        if assets and "assets" not in entries:
            state["status"] = "creating-assets-directory"
            save(journal, state)
            ftp.mkd(SCOPE + "assets")
        for entry in assets:
            name = entry["path"].removeprefix(SCOPE + "assets/")
            if name not in asset_entries:
                replace(ftp, entry["path"], (package / "site" / entry["path"]).read_bytes(), state, journal)
        # Do not switch the entry if any protected baseline moved during upload.
        baseline_check(ftp, baseline)
        current_entries = listing(ftp, SCOPE.rstrip("/"))
        current_version = ftp_read(ftp, version) if "build-version.json" in current_entries else None
        if current_version != old_version:
            raise ValueError("Version changed during upload")
        replace(ftp, version, (package / "site" / version).read_bytes(), state, journal)
        baseline_check(ftp, baseline)
        replace(ftp, SCOPE + "index.html", (package / "site" / SCOPE / "index.html").read_bytes(), state, journal)
        baseline_check(ftp, {p: b for p, b in baseline.items() if p != SCOPE + "index.html"})
        state["status"] = "uploaded-awaiting-http-and-browser-acceptance"
        save(journal, state)
    except Exception:
        state["status"] = "uncertain-reconcile-before-retry"
        save(journal, state)
        raise
    return state


def recover(ftp, journal):
    """Restore HTML only when its bytes are old or belong to this transaction.

    Assets and an initially absent version marker remain as harmless files;
    recovery does not delete files or overwrite a third party's later changes.
    """
    journal = Path(journal)
    state = json.loads(journal.read_text(encoding="utf-8"))
    if (state.get("schema") != 1 or state.get("scope") != SCOPE or
            not re.fullmatch(r"[0-9a-f]{32}", state.get("transaction", ""))):
        raise ValueError("Unrecognized recovery journal")
    old_html = bytes.fromhex(state["oldHtmlHex"])
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
    if args.action == "upload" and not (args.package and args.backup):
        parser.error("upload requires --package and --backup")
    with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"], 21)
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ.get("FTP_SERVER_DIR") or ".")
        state = (deliver(args.package, args.backup, ftp, args.journal)
                 if args.action == "upload" else recover(ftp, args.journal))
    print(json.dumps({"status": state["status"], "deployed": False, "scope": SCOPE}))


if __name__ == "__main__":
    main()
