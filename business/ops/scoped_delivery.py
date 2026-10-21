"""Read-only FTPS/HTTPS preflight for a single, independently built game.

No upload, delete, rename, or remote directory creation is performed here.
Credentials are read only by main and never included in evidence.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
from ftplib import FTP_TLS, error_perm
from urllib.request import urlopen
from urllib.parse import urljoin, urlsplit


ORIGIN = "https://game.kihamda.net"
SCOPE = "games/minerush/"
MAX_RECOVERY_FILES = 256
MAX_RECOVERY_BYTES = 64 * 1024 * 1024


def asset_references(body, source):
    """Conservative static inventory, including Vite preload maps and CSS URLs.

    This is not a JavaScript interpreter: computed URLs remain unverified.
    Only shared /assets and this game's scoped assets are recovery dependencies.
    """
    if not source.endswith((".html", ".js", ".mjs", ".css")):
        return set()
    text = body.decode("utf-8", errors="strict")
    references = {match[1] for match in re.findall(r'''(["'])([^"'\s<>]+)\1''', text)}
    if source.endswith(".css"):
        references.update(re.findall(r"url\(\s*([^\s\"'()]+)\s*\)", text))
    result = set()
    for reference in references:
        if not re.search(r"\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf|wasm|mp3|ogg|wav|mp4|webm)(?:[?#].*)?$", reference, re.I):
            continue
        if urlsplit(reference).path.rsplit("/", 1)[-1].startswith("."):
            continue
        # Vite preload maps may use assets/foo.js relative to the site root.
        base = ORIGIN + "/" if reference.startswith("assets/") else ORIGIN + "/" + source
        url = urlsplit(urljoin(base, reference))
        if url.scheme != "https" or url.netloc != urlsplit(ORIGIN).netloc:
            continue
        path = url.path.lstrip("/")
        if not path.startswith(("assets/", SCOPE + "assets/")):
            continue
        if (not re.fullmatch(r"(?:assets/|" + re.escape(SCOPE) + r"assets/)(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+", path) or
                any(part in (".", "..") for part in path.split("/"))):
            raise ValueError("Unsafe recovery dependency")
        result.add(path)
    return result


def collect_recovery(baseline, ftp, http_read, progress=None):
    """Read the reachable static asset graph without modifying the server."""
    pending = asset_references(baseline[SCOPE + "index.html"], SCOPE + "index.html")
    edges = {}
    total = sum(len(body) for body in baseline.values())
    if total > MAX_RECOVERY_BYTES:
        raise ValueError("Recovery dependency byte limit exceeded")
    while pending:
        path = sorted(pending)[0]
        pending.remove(path)
        if path in baseline:
            continue
        if len(baseline) >= MAX_RECOVERY_FILES:
            raise ValueError("Recovery dependency file limit exceeded")
        public = http_read(path)
        total += len(public)
        if total > MAX_RECOVERY_BYTES:
            raise ValueError("Recovery dependency byte limit exceeded")
        remote = ftp_read(ftp, path)
        if public != remote:
            raise ValueError("Old bundle differs between FTPS and HTTPS")
        baseline[path] = remote
        dependencies = asset_references(remote, path)
        edges[path] = sorted(dependencies)
        pending.update(dependencies - baseline.keys())
        if progress and len(edges) % 16 == 0:
            progress({"phase": "recovery-inventory", "checkedFiles": len(baseline),
                      "checkedBytes": total, "pendingFiles": len(pending)})
    return edges


def sha(body):
    return hashlib.sha256(body).hexdigest()


def checked_package(package):
    package = Path(package).resolve()
    manifest = json.loads((package / "manifest.json").read_text(encoding="utf-8"))
    if (manifest.get("schema") != 1 or manifest.get("scope") != SCOPE or
            manifest.get("publication") != "prepared-not-deployed" or
            not re.fullmatch(r"[0-9a-f]{40}", manifest.get("commit", ""))):
        raise ValueError("Unrecognized scoped package")
    seen = set()
    for entry in manifest["files"]:
        name = entry["path"]
        path = PurePosixPath(name)
        if (not name.startswith(SCOPE) or "\\" in name or
                any(part in (".", "..") for part in name.split("/")) or
                path.is_absolute() or name in seen):
            raise ValueError("Unsafe or duplicate scoped path")
        relative = name[len(SCOPE):]
        if relative not in ("index.html", "build-version.json") and not re.fullmatch(
                r"assets/[A-Za-z0-9_-]+\.(js|css)", relative):
            raise ValueError("Unexpected scoped file")
        file = package / "site" / name
        if any(parent.is_symlink() for parent in [file, *file.parents]) or sha(file.read_bytes()) != entry["sha256"]:
            raise ValueError("Package symlink or checksum mismatch")
        seen.add(name)
    tree = list((package / "site").rglob("*"))
    if any(file.is_symlink() for file in tree):
        raise ValueError("Package symlink refused")
    actual = {file.relative_to(package / "site").as_posix()
              for file in tree if file.is_file()}
    if actual != seen or not {SCOPE + "index.html", SCOPE + "build-version.json"} <= seen:
        raise ValueError("Package inventory mismatch")
    version = json.loads((package / "site" / SCOPE / "build-version.json").read_text(encoding="utf-8"))
    if version != {"commit": manifest["commit"], "game": "minerush", "scope": "/" + SCOPE}:
        raise ValueError("Package version mismatch")
    html = (package / "site" / SCOPE / "index.html").read_text(encoding="utf-8")
    dependencies = re.findall(r'(?:src|href)="(/games/minerush/assets/[^"?#]+)"', html)
    if not dependencies or any(path[1:] not in seen for path in dependencies):
        raise ValueError("Entry dependencies missing")
    return manifest


def https_read(path):
    with urlopen(ORIGIN + "/" + path, timeout=30) as response:
        if response.url != ORIGIN + "/" + path:
            raise ValueError("Unexpected production redirect")
        body = response.read(MAX_RECOVERY_BYTES + 1)
        if len(body) > MAX_RECOVERY_BYTES:
            raise ValueError("HTTPS response byte limit exceeded")
        return body


def ftp_read(ftp, path):
    chunks = []
    total = 0
    def receive(chunk):
        nonlocal total
        total += len(chunk)
        if total > MAX_RECOVERY_BYTES:
            raise ValueError("FTPS response byte limit exceeded")
        chunks.append(chunk)
    ftp.retrbinary("RETR " + path, receive)
    return b"".join(chunks)


def inspect(package, backup, ftp, http_read=https_read, progress=None):
    manifest = checked_package(package)
    backup = Path(backup)
    if backup.exists():
        raise ValueError("Use a fresh recovery directory")
    # Match both root and selected game before interpreting the FTP login root.
    baseline = {}
    for path in ("index.html", SCOPE + "index.html"):
        http_path = "" if path == "index.html" else SCOPE
        public = http_read(http_path)
        remote = ftp_read(ftp, path)
        if public != remote:
            raise ValueError("FTPS root does not match HTTPS production: " + path)
        baseline[path] = remote
    if progress:
        progress({"phase": "production-root-matched"})
    dependencies = collect_recovery(baseline, ftp, http_read, progress)
    collisions = []
    for entry in manifest["files"]:
        if not entry["path"].startswith(SCOPE + "assets/"):
            continue
        try:
            remote = ftp_read(ftp, entry["path"])
        except error_perm as exc:
            # 550 is ambiguous (missing or inaccessible); never call it verified absent.
            if not str(exc).startswith("550"):
                raise
            collisions.append({"path": entry["path"], "state": "missing-or-inaccessible"})
            continue
        if sha(remote) != entry["sha256"]:
            raise ValueError("Scoped asset collision; refuse overwrite")
        collisions.append({"path": entry["path"], "state": "identical"})
    # A second read catches changes during inspection; publication must check again.
    for index, (path, body) in enumerate(baseline.items(), 1):
        if ftp_read(ftp, path) != body:
            raise ValueError("Production changed during preflight")
        if progress and index % 16 == 0:
            progress({"phase": "baseline-reread", "checkedFiles": index,
                      "totalFiles": len(baseline)})
    backup.mkdir(parents=True)
    for path, body in baseline.items():
        target = backup / "before" / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(body)
    report = {"schema": 1, "status": "read-only-preflight", "deployed": False,
              "commit": manifest["commit"], "scope": SCOPE,
              "packageManifestSha256": sha((Path(package) / "manifest.json").read_bytes()),
              "baseline": [{"path": path, "sha256": sha(body)} for path, body in baseline.items()],
              "assetChecks": collisions,
              "recoveryDependencies": dependencies,
              "recoveryCoverage": "reachable static shared and MineRush scoped assets; computed URLs and off-PC restore unverified",
              "nextGate": "Review backup, resolve 550 ambiguity, recheck baseline before scoped upload"}
    (backup / "preflight.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("package")
    parser.add_argument("backup", nargs="?")
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    checked_package(args.package)
    if args.verify_only:
        print("Scoped package verified. No network or deployment.")
        return
    if not args.backup:
        parser.error("backup directory required for FTPS preflight")
    with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"], 21)
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ.get("FTP_SERVER_DIR") or ".")
        result = inspect(args.package, args.backup, ftp,
                         progress=lambda event: print(json.dumps(event), flush=True))
    print(json.dumps({"status": result["status"], "deployed": False, "scope": SCOPE}))


if __name__ == "__main__":
    main()
