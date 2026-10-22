"""Read-only production cache-policy audit; never claims browser acceptance."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from scoped_delivery import ORIGIN


PATHS = ("", "index.html", "about/", "about/index.html", "contact/",
         "contact/index.html", "privacy-policy/", "privacy-policy/index.html",
         "works/minerush/", "works/minerush/index.html", "build-version.json",
         "works/iceslide/", "works/iceslide/index.html", "works/ntiktaktoe/",
         "works/ntiktaktoe/index.html", "works/gravityball/", "works/gravityball/index.html",
         "games/ice-courier/", "games/ice-courier/index.html",
         "games/minerush/", "games/minerush/index.html", "games/minerush/build-version.json")
HEADERS = ("Cache-Control", "Expires", "ETag", "Last-Modified", "Age", "Date", "Vary")
MAX_BYTES = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read(path, conditional=None):
    if path not in PATHS:
        raise ValueError("Unrecognized cache-audit path")
    headers = {"Cache-Control": "no-cache", **(conditional or {})}
    request = Request(ORIGIN + "/" + path, headers=headers)
    try:
        response = build_opener(NoRedirect()).open(request, timeout=30)
    except HTTPError as error:
        if error.code != 304:
            error.close()
            raise
        response = error
    with response:
        if response.url != request.full_url or response.code not in (200, 304):
            raise ValueError("Unexpected production response")
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError("Cache-audit response exceeds byte limit")
        observed = {name: response.headers.get(name) for name in HEADERS}
        # Multiple field lines form one directive list; reading only the first
        # could hide a conflicting positive freshness value.
        controls = response.headers.get_all("Cache-Control")
        observed["Cache-Control"] = ", ".join(controls) if controls else None
        return response.code, observed, body


def policy(value):
    """Conservative audit, not a general HTTP Cache-Control parser.

    Only explicit no-cache/no-store or zero freshness plus must-revalidate
    passes. Unknown, malformed or conflicting freshness fails closed.
    """
    directives = {}
    for part in (value or "").split(","):
        name, separator, argument = part.strip().partition("=")
        name = name.lower()
        if not name:
            continue
        if name in directives:
            return False
        directives[name] = argument.strip().strip('"') if separator else None
    for name in ("max-age", "s-maxage"):
        if name in directives and (directives[name] is None or
                                   not directives[name].isdigit() or int(directives[name]) != 0):
            return False
    if "immutable" in directives:
        return False
    return (("no-cache" in directives and directives["no-cache"] is None) or
            ("no-store" in directives and directives["no-store"] is None) or
            (directives.get("max-age") == "0" and "must-revalidate" in directives and
             directives["must-revalidate"] is None))


def audit(fetch=read):
    results = {}
    for path in PATHS:
        status, headers, body = fetch(path)
        if status != 200:
            raise ValueError("Initial cache audit requires full 200 response")
        digest = hashlib.sha256(body).hexdigest()
        validator = ({"If-None-Match": headers["ETag"]} if headers.get("ETag") else
                     {"If-Modified-Since": headers["Last-Modified"]}
                     if headers.get("Last-Modified") else None)
        conditional = None
        if validator:
            follow_status, follow_headers, follow_body = fetch(path, validator)
            if follow_status not in (200, 304) or (follow_status == 304 and follow_body):
                raise ValueError("Invalid conditional response")
            if (follow_status == 304 and headers.get("ETag") and follow_headers.get("ETag")
                    and headers["ETag"] != follow_headers["ETag"]):
                raise ValueError("Conditional response changed entity tag")
            same = follow_status == 304 or hashlib.sha256(follow_body).hexdigest() == digest
            conditional = {"request": validator, "status": follow_status,
                           "sameRepresentation": same, "headers": follow_headers,
                           "explicitRevalidation": policy(follow_headers.get("Cache-Control")
                                                           if follow_headers.get("Cache-Control") is not None
                                                           else headers.get("Cache-Control"))}
        results[path] = {"status": status, "headers": headers, "sha256": digest,
                         "explicitRevalidation": policy(headers.get("Cache-Control")),
                         "conditional": conditional}
    aliases = (("", "index.html"), ("about/", "about/index.html"),
               ("contact/", "contact/index.html"), ("privacy-policy/", "privacy-policy/index.html"),
               ("works/minerush/", "works/minerush/index.html"),
               ("works/iceslide/", "works/iceslide/index.html"),
               ("works/ntiktaktoe/", "works/ntiktaktoe/index.html"),
               ("works/gravityball/", "works/gravityball/index.html"),
               ("games/ice-courier/", "games/ice-courier/index.html"),
               ("games/minerush/", "games/minerush/index.html"))
    alias_matches = all(results[a]["sha256"] == results[b]["sha256"] for a, b in aliases)
    passed = alias_matches and all(item["explicitRevalidation"] and
                                  (item["conditional"] is None or
                                   (item["conditional"]["sameRepresentation"] and
                                    item["conditional"]["explicitRevalidation"]))
                                  for item in results.values())
    return {"schema": 1, "recordedAt": datetime.now(timezone.utc).isoformat(),
            "auditorSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "origin": ORIGIN, "productionWrites": False, "browserAcceptance": False,
            "requestCacheControl": "no-cache", "policyPassed": passed,
            "aliasBytesMatch": alias_matches, "paths": results,
            "interpretation": "Origin policy and conditional GET evidence only; does not reproduce a browser cache or establish the historical stale-page cause."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output")
    parser.add_argument("--require-revalidation", action="store_true")
    args = parser.parse_args()
    # Refuse overwrite before network work; one receipt per observation.
    output = Path(args.output)
    if output.exists():
        raise FileExistsError(output)
    result = audit()
    with output.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({"policyPassed": result["policyPassed"], "paths": len(result["paths"]),
                      "productionWrites": False}))
    if args.require_revalidation and not result["policyPassed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
