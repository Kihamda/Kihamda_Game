"""Additive portal publication: retain old bytes, preserve games, switch home last."""
import argparse
from ftplib import FTP_TLS
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
from uuid import uuid4

from scoped_delivery import ftp_read, https_read, sha
from scoped_upload import listing, save

PROTECTED = [f"games/{game}/index.html" for game in
             ("minerush", "iceslide", "ntiktaktoe", "gravityball")]
PROTECTED.append("games/minerush/build-version.json")


def allowed(path):
    return bool(re.fullmatch(
        r"(?:index\.html|build-version\.json|robots\.txt|sitemap\.xml|manifest\.webmanifest|"
        r"(?:about|contact|privacy-policy)/index\.html|works/(?:minerush|iceslide|ntiktaktoe|gravityball)/index\.html|"
        r"games/ice-courier/index\.html|assets/[A-Za-z0-9_-]+\.(?:js|css)|"
        r"media/inspection/[a-z0-9-]+\.jpg|(?:icons|thumbnails)/[a-z0-9-]+\.svg)", path))


def candidate(package):
    package = Path(package)
    manifest = json.loads((package / "manifest.json").read_text("utf-8"))
    if manifest.get("schema") != 1 or not re.fullmatch(r"[a-f0-9]{40}", manifest.get("sourceCommit", "")):
        raise ValueError("Invalid checked Web package")
    files = {}
    seen = set()
    for item in manifest["files"]:
        path = item["path"]
        if (path in seen or PurePosixPath(path).is_absolute() or "\\" in path
                or any(part in (".", "..") for part in path.split("/"))):
            raise ValueError("Unsafe package inventory")
        seen.add(path)
        file = package / "site" / path
        if any(p.is_symlink() for p in (file, *file.parents)) or sha(file.read_bytes()) != item["sha256"]:
            raise ValueError("Package bytes differ")
        if allowed(path):
            files[path] = file.read_bytes()
    if not {"index.html", "build-version.json"} <= files.keys():
        raise ValueError("Missing home/version")
    if json.loads(files["build-version.json"])["commit"] != manifest["sourceCommit"]:
        raise ValueError("Version differs from package")
    return manifest, files


def existing(ftp, path):
    parts = path.split("/")
    directory = ""
    for index, part in enumerate(parts):
        entries = listing(ftp, directory or ".")
        if part not in entries:
            return None
        if index == len(parts) - 1:
            if entries[part] != "file":
                raise ValueError("Target is not a regular file")
            return ftp_read(ftp, path)
        if entries[part] != "dir":
            raise ValueError("Parent is not a directory")
        directory = "/".join(parts[:index + 1])


def ensure_parent(ftp, path, journal, state):
    directory = ""
    for part in path.split("/")[:-1]:
        entries = listing(ftp, directory or ".")
        next_directory = f"{directory}/{part}".lstrip("/")
        if part not in entries:
            state["pending"] = {"mkdir": next_directory}
            save(journal, state)
            ftp.mkd(next_directory)
            state["pending"] = None
            save(journal, state)
        elif entries[part] != "dir":
            raise ValueError("Parent changed to non-directory")
        directory = next_directory


def publish(package, backup, journal, ftp, http_read=https_read):
    manifest, files = candidate(package)
    backup, journal = Path(backup), Path(journal)
    if backup.exists() or journal.exists() or journal.with_suffix(".tmp").exists():
        raise ValueError("Fresh backup and journal required")
    old_home = ftp_read(ftp, "index.html")
    if old_home != http_read(""):
        raise ValueError("FTPS root does not match public home")
    protected = {path: ftp_read(ftp, path) for path in PROTECTED}
    for path, body in protected.items():
        if body != http_read(path):
            raise ValueError("Protected game mismatch")
    before = {}
    for path, body in files.items():
        previous = existing(ftp, path)
        if path.startswith("assets/") and previous is not None and previous != body:
            raise ValueError("Immutable asset collision")
        before[path] = previous
    backup.mkdir(parents=True)
    for path, body in before.items():
        if body is not None:
            target = backup / "before" / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
    for path, body in protected.items():
        target = backup / "protected" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
    state = {"schema": 1, "transaction": uuid4().hex, "commit": manifest["sourceCommit"],
             "packageManifestSha256": sha((Path(package) / "manifest.json").read_bytes()),
             "status": "prepared", "pending": None, "written": [],
             "before": {path: sha(body) if body is not None else None for path, body in before.items()},
             "protected": {path: sha(body) for path, body in protected.items()}, "deployed": False}
    (backup / "receipt.json").write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    save(journal, state)
    # Every dependency is already present before any new HTML becomes visible.
    order = sorted(files, key=lambda path: (path == "index.html", path.endswith(".html"), path))
    try:
        for index, path in enumerate(order, 1):
            body = files[path]
            if existing(ftp, path) != before[path]:
                raise ValueError("Target changed since preflight: " + path)
            if body == before[path]:
                continue
            if path == "index.html":
                for protected_path, protected_body in protected.items():
                    if ftp_read(ftp, protected_path) != protected_body:
                        raise ValueError("Protected game changed before home switch")
            ensure_parent(ftp, path, journal, state)
            temporary = path + ".pending-" + state["transaction"]
            state.update(status="switching-home" if path == "index.html" else "publishing-dependencies",
                         pending={"path": path, "temporary": temporary, "sha256": sha(body)})
            save(journal, state)
            ftp.storbinary("STOR " + temporary, io.BytesIO(body))
            if ftp_read(ftp, temporary) != body:
                raise ValueError("Staged bytes differ")
            if existing(ftp, path) != before[path]:
                raise ValueError("Target changed before rename: " + path)
            ftp.rename(temporary, path)
            if ftp_read(ftp, path) != body:
                raise ValueError("Published bytes differ")
            state["written"].append(path)
            state["pending"] = None
            save(journal, state)
            print(json.dumps({"phase": state["status"], "checked": index, "total": len(order)}), flush=True)
        state["status"] = "verifying-http"
        save(journal, state)
        for path, body in files.items():
            if http_read("" if path == "index.html" else path) != body:
                raise ValueError("Public bytes differ: " + path)
        for path, body in protected.items():
            if ftp_read(ftp, path) != body or http_read(path) != body:
                raise ValueError("Protected game changed after publication")
        state.update(status="http-verified-browser-acceptance-pending", publishedFiles=len(files))
        save(journal, state)
    except Exception:
        state["status"] = "uncertain-reconcile-before-retry"
        save(journal, state)
        raise
    return state


def recover(package, backup, journal, ftp):
    """Restore retained targets only if live bytes still belong to this publication."""
    manifest, files = candidate(package)
    backup, journal = Path(backup), Path(journal)
    state = json.loads(journal.read_text("utf-8"))
    receipt = json.loads((backup / "receipt.json").read_text("utf-8"))
    if (state.get("schema") != 1 or not re.fullmatch(r"[0-9a-f]{32}", state.get("transaction", ""))
            or state.get("commit") != manifest["sourceCommit"] or state.get("transaction") != receipt.get("transaction")
            or state.get("packageManifestSha256") != sha((Path(package) / "manifest.json").read_bytes())
            or state.get("before") != receipt.get("before") or state.get("protected") != receipt.get("protected")
            or set(state["before"]) != set(files) or set(state["protected"]) != set(PROTECTED)):
        raise ValueError("Recovery evidence differs")
    previous = {}
    for path, digest in state["before"].items():
        if digest is not None:
            file = backup / "before" / path
            if any(p.is_symlink() for p in (file, *file.parents)) or sha(file.read_bytes()) != digest:
                raise ValueError("Retained old bytes differ")
            previous[path] = file.read_bytes()
    for path, digest in state["protected"].items():
        if sha(ftp_read(ftp, path)) != digest:
            raise ValueError("Protected game changed; recovery refused")
    for path, body in files.items():
        current = existing(ftp, path)
        if current != body and current != previous.get(path):
            raise ValueError("Target changed externally; recovery refused")
    # Old hash-named assets were never replaced or deleted, so the old home can
    # be restored first. Newly added files remain; no remote delete is allowed.
    for path in sorted(previous, key=lambda name: (name != "index.html", name)):
        body = previous[path]
        if existing(ftp, path) == body:
            continue
        temporary = path + ".pending-recovery-" + state["transaction"]
        state.update(status="restoring-portal", pending={"path": path, "temporary": temporary})
        save(journal, state)
        ftp.storbinary("STOR " + temporary, io.BytesIO(body))
        if ftp_read(ftp, temporary) != body or existing(ftp, path) != files[path]:
            raise ValueError("Recovery target changed during staging")
        ftp.rename(temporary, path)
        if ftp_read(ftp, path) != body:
            raise ValueError("Restored bytes differ")
        state["pending"] = None
        save(journal, state)
    state["status"] = "portal-restored-awaiting-http-and-browser-acceptance"
    save(journal, state)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package")
    parser.add_argument("backup")
    parser.add_argument("journal")
    parser.add_argument("--recover", action="store_true")
    args = parser.parse_args()
    candidate(args.package)  # Reject invalid evidence before authentication.
    with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"], 21)
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ.get("FTP_SERVER_DIR") or ".")
        state = (recover(args.package, args.backup, args.journal, ftp) if args.recover else
                 publish(args.package, args.backup, args.journal, ftp))
    print(json.dumps({"status": state["status"], "commit": state["commit"],
                      "publishedFiles": state.get("publishedFiles", 0), "deployed": False}))


if __name__ == "__main__":
    main()
