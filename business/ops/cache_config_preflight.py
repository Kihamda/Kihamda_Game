"""Retain existing cache configuration through read-only FTPS, without publishing.

Raw configuration stays in ignored local artifacts, never in the public receipt.
The proposal must be reviewed with actual inherited configuration before upload.
"""
import argparse
from ftplib import FTP_TLS
import hashlib
import json
import os
from pathlib import Path
import ssl

from cache_audit import PATHS
from portal_publish import existing
from scoped_delivery import https_read


ROOT = Path(__file__).resolve().parents[2]
BLOCK = ROOT / "business/config/cache-revalidation.htaccess"
MARKER = b"# Kihamda managed cache revalidation v1"
CONFIG_PATHS = tuple(sorted({".htaccess", *(str(Path(path).parent / ".htaccess").replace("\\", "/")
                                         for path in PATHS if path.endswith("index.html")),
                            "works/.htaccess", "games/.htaccess"}))


def sha(body):
    return hashlib.sha256(body).hexdigest()


def candidate(before, expected, block=None):
    """Append exact reviewed bytes; do not parse or rewrite unrelated directives."""
    if before is not None and len(before) > 65536:
        raise ValueError("Existing configuration exceeds byte limit")
    original = before if before is not None else b""
    if expected != (sha(before) if before is not None else None):
        raise ValueError("Existing configuration checksum differs")
    if MARKER in original:
        raise ValueError("Managed configuration already exists; review instead of replay")
    block = BLOCK.read_bytes() if block is None else block
    separator = b"" if not original or original.endswith(b"\n") else b"\n"
    return original + separator + MARKER + b"\n" + block


def inspect(ftp, http_read=https_read):
    anchors = ("index.html", "games/minerush/index.html")
    before_anchors = {}
    for path in anchors:
        body = existing(ftp, path)
        if body is None or body != http_read(path):
            raise ValueError("FTPS root does not match public entry")
        before_anchors[path] = body
    configs = {path: existing(ftp, path) for path in CONFIG_PATHS}
    if any(body is not None and len(body) > 65536 for body in configs.values()):
        raise ValueError("Existing configuration exceeds byte limit")
    # Absence comes from a successful parent listing, never from ambiguous 550.
    for path, body in configs.items():
        if existing(ftp, path) != body:
            raise ValueError("Configuration changed during read-only preflight")
    for path, body in before_anchors.items():
        if existing(ftp, path) != body or http_read(path) != body:
            raise ValueError("Public entry changed during read-only preflight")
    block = BLOCK.read_bytes()
    proposed = candidate(configs[".htaccess"], sha(configs[".htaccess"]) if configs[".htaccess"] is not None else None, block)
    receipt = {"schema": 1, "status": "read-only-config-retained-not-approved-not-deployed",
               "productionWrites": False, "hostingHeaderSupportProven": False,
               "anchors": {path: sha(body) for path, body in before_anchors.items()},
               "configs": {path: {"present": body is not None,
                                   "sha256": sha(body) if body is not None else None}
                           for path, body in configs.items()},
               "proposedRootSha256": sha(proposed), "blockSha256": sha(block),
               "nextGate": "Review inherited configuration privately, validate assembled root in Apache, obtain root-config publication scope, retain exact recovery bytes, and recheck production immediately before approved write."}
    return receipt, configs, proposed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup")
    args = parser.parse_args()
    target = Path(args.backup).resolve()
    if not target.is_relative_to(ROOT / "artifacts") or target == ROOT / "artifacts" or target.exists():
        raise ValueError("Fresh ignored artifacts subdirectory required")
    with FTP_TLS(context=ssl.create_default_context(), timeout=30) as ftp:
        ftp.connect(os.environ["FTP_SERVER"], 21)
        ftp.login(os.environ["FTP_USERNAME"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(os.environ.get("FTP_SERVER_DIR") or ".")
        receipt, configs, proposed = inspect(ftp)
    target.mkdir(parents=True)
    for path, body in configs.items():
        if body is not None:
            destination = target / "before" / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(body)
    (target / "proposed-root.htaccess").write_bytes(proposed)
    (target / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": receipt["status"], "configs": len(configs), "productionWrites": False}))


if __name__ == "__main__":
    main()
