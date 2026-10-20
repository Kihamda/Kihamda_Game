"""Check exact production bytes; browser acceptance remains a separate gate."""
import argparse
import json
from pathlib import Path

from scoped_delivery import SCOPE, checked_package, https_read, sha


PROTECTED_URLS = ("", "privacy-policy/", "contact/", "about/", "sw.js")


def snapshot(http_read=https_read):
    return {path: sha(http_read(path)) for path in PROTECTED_URLS}


def verify(package, before, http_read=https_read):
    manifest = checked_package(package)
    if set(before) != set(PROTECTED_URLS):
        raise ValueError("Protected URL snapshot is incomplete")
    after = snapshot(http_read)
    if after != before:
        raise ValueError("Unrelated production URL changed")
    checked = []
    for entry in manifest["files"]:
        paths = [entry["path"]]
        if entry["path"] == SCOPE + "index.html":
            paths.append(SCOPE)
        for path in paths:
            if sha(http_read(path)) != entry["sha256"]:
                raise ValueError("Production checksum mismatch: " + path)
            checked.append(path)
    return {"status": "http-bytes-verified-browser-acceptance-pending", "deployed": False,
            "commit": manifest["commit"], "files": checked, "protectedUrls": after}


def verify_recovery(journal, before, http_read=https_read):
    state = json.loads(Path(journal).read_text(encoding="utf-8"))
    if (state.get("schema") != 1 or state.get("scope") != SCOPE or
            state.get("status") != "entry-restored-awaiting-http-and-browser-acceptance"):
        raise ValueError("Journal has not completed conditional recovery")
    if set(before) != set(PROTECTED_URLS) or snapshot(http_read) != before:
        raise ValueError("Unrelated production URL changed or snapshot incomplete")
    old_html = bytes.fromhex(state["oldHtmlHex"])
    for path in (SCOPE, SCOPE + "index.html"):
        if http_read(path) != old_html:
            raise ValueError("Recovered entry checksum mismatch")
    if state["oldVersionHex"] is not None:
        if http_read(SCOPE + "build-version.json") != bytes.fromhex(state["oldVersionHex"]):
            raise ValueError("Recovered version checksum mismatch")
    return {"status": "recovered-http-bytes-verified-browser-acceptance-pending",
            "deployed": False, "oldHtmlSha256": sha(old_html),
            "retainedVersionMarker": state.get("retainedVersionMarker", False)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("snapshot", "verify", "recovered"))
    parser.add_argument("snapshot_file")
    parser.add_argument("--package")
    parser.add_argument("--journal")
    args = parser.parse_args()
    if args.action == "snapshot":
        with Path(args.snapshot_file).open("x", encoding="utf-8") as stream:
            json.dump(snapshot(), stream, indent=2)
            stream.write("\n")
    else:
        before = json.loads(Path(args.snapshot_file).read_text(encoding="utf-8"))
        if args.action == "verify":
            if not args.package:
                parser.error("verify requires --package")
            result = verify(args.package, before)
        else:
            if not args.journal:
                parser.error("recovered requires --journal")
            result = verify_recovery(args.journal, before)
        print(json.dumps(result))


if __name__ == "__main__":
    main()
