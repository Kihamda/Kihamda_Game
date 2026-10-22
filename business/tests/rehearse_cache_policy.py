"""Run proposed cache configuration against an isolated Apache, not production.

Pass an unpacked Apache runtime prefix. No service installation is performed.
All configuration, logs and fixture content live in a temporary directory.
"""
import argparse
import hashlib
import json
import os
import socket
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from uuid import uuid4
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ops"))
import cache_audit
import cache_config_preflight


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runtime")
    parser.add_argument("output")
    parser.add_argument("--browser-fixture", action="store_true")
    parser.add_argument("--legacy-browser-cache", action="store_true")
    parser.add_argument("--port", type=int, default=0)
    args = parser.parse_args()
    runtime = Path(args.runtime).resolve()
    repository = Path(__file__).resolve().parents[2]
    block = repository / "business/config/cache-revalidation.htaccess"
    modules = runtime / "usr/lib/apache2/modules"
    env = dict(os.environ, LD_LIBRARY_PATH=str(runtime / "usr/lib/x86_64-linux-gnu"))
    port = args.port
    if not port:
        with socket.socket() as reservation:
            reservation.bind(("127.0.0.1", 0))
            port = reservation.getsockname()[1]
    identity = uuid4().hex
    with tempfile.TemporaryDirectory(prefix="kihamda-apache-cache-") as temporary:
        root = Path(temporary)
        site = root / "site"
        site.mkdir()
        selected = cache_audit.PATHS
        excluded = ("games/iceslide/index.html", "games/ntiktaktoe/index.html",
                    "games/gravityball/index.html", "assets/old.js", "assets/new.css",
                    "games/minerush/assets/current.js", "sw.js", "brand/icon.svg",
                    "unrelated/index.html", "works/minerush-extra/index.html",
                    "games/minerush/build-version.json.extra")
        for path in (*selected, *excluded):
            target = site / (path + "index.html" if not path or path.endswith("/") else path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(("fixture:" + target.relative_to(site).as_posix()).encode())
        # Existing response headers emulate a default origin freshness policy.
        inherited = ('Header set Cache-Control "max-age=604800"\n'
                     'Header set Expires "Wed, 30 Oct 2030 00:00:00 GMT"\n'
                     'Header set X-Kihamda-Preserved "yes"\n'
                     'RewriteEngine On\nRewriteRule ^legacy-example$ /about/ [R=302,L]\n').encode()
        assembled = cache_config_preflight.candidate(inherited, hashlib.sha256(inherited).hexdigest())
        (site / ".htaccess").write_bytes(assembled)
        configuration = root / "httpd.conf"
        configuration.write_text(f'''ServerRoot "{root}"
Listen 127.0.0.1:{port}
ServerName localhost
PidFile "{root}/httpd.pid"
ErrorLog "{root}/error.log"
LoadModule mpm_event_module "{modules}/mod_mpm_event.so"
LoadModule authz_core_module "{modules}/mod_authz_core.so"
LoadModule dir_module "{modules}/mod_dir.so"
LoadModule headers_module "{modules}/mod_headers.so"
LoadModule expires_module "{modules}/mod_expires.so"
LoadModule rewrite_module "{modules}/mod_rewrite.so"
Header always set X-Kihamda-Fixture "{identity}"
DocumentRoot "{site}"
DirectoryIndex index.html
<Directory "{site}">
    Require all granted
    AllowOverride FileInfo Indexes
    ExpiresActive On
    ExpiresDefault "access plus 7 days"
</Directory>
''', encoding="utf-8")
        command = [str(runtime / "usr/sbin/apache2"), "-f", str(configuration)]
        syntax = subprocess.run([*command, "-t"], env=env, capture_output=True, text=True)
        if syntax.returncode:
            raise RuntimeError(syntax.stderr)
        process = subprocess.Popen([*command, "-X"], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            for attempt in range(50):
                if process.poll() is not None:
                    raise RuntimeError(process.communicate()[1].decode() + (root / "error.log").read_text())
                try:
                    with urlopen(f"http://127.0.0.1:{port}/", timeout=1) as response:
                        if response.headers.get("X-Kihamda-Fixture") != identity:
                            raise RuntimeError("Port belongs to a different server")
                        break
                except URLError:
                    time.sleep(0.05)  # bounded server-readiness retry, not work-session padding
            else:
                raise RuntimeError("Apache did not start")

            results = []
            for path in (*selected, *excluded):
                url = f"http://127.0.0.1:{port}/" + path
                with urlopen(url, timeout=5) as response:
                    body = response.read()
                    headers = dict(response.headers)
                    if headers.get("X-Kihamda-Fixture") != identity:
                        raise RuntimeError("Fixture server identity changed")
                    controls = response.headers.get_all("Cache-Control")
                    validator = response.headers.get("ETag")
                source = site / (path + "index.html" if not path or path.endswith("/") else path)
                if body != source.read_bytes() or headers.get("X-Kihamda-Preserved") != "yes":
                    raise RuntimeError("Existing bytes or unrelated headers changed")
                expected = "no-cache" if path in selected else "max-age=604800"
                if controls != [expected]:
                    raise RuntimeError(f"Unexpected policy at {path}: {controls}")
                if path in selected and headers.get("Expires") is not None:
                    raise RuntimeError("Selected path retained inherited Expires")
                conditional = None
                if validator:
                    try:
                        response = urlopen(Request(url, headers={"If-None-Match": validator}), timeout=5)
                    except HTTPError as error:
                        if error.code != 304:
                            raise
                        response = error
                    with response:
                        conditional = response.code
                        if conditional != 304 or response.headers.get_all("Cache-Control") != [expected]:
                            raise RuntimeError("Conditional policy differs")
                results.append({"path": path, "policy": controls, "conditionalStatus": conditional,
                                "sha256": hashlib.sha256(body).hexdigest()})
            # Query strings must not prevent a selected HTML response revalidation.
            with urlopen(f"http://127.0.0.1:{port}/games/minerush/?from=portal", timeout=5) as response:
                if response.headers.get_all("Cache-Control") != ["no-cache"]:
                    raise RuntimeError("Query string bypassed policy")
            with urlopen(f"http://127.0.0.1:{port}/legacy-example", timeout=5) as response:
                if response.url != f"http://127.0.0.1:{port}/about/":
                    raise RuntimeError("Existing rewrite behavior changed")
            result = {"schema": 1, "status": "isolated-apache-passed", "productionWrites": False,
                      "configurationSha256": hashlib.sha256(block.read_bytes()).hexdigest(),
                      "assembledRootSha256": hashlib.sha256(assembled).hexdigest(),
                      "apacheVersion": subprocess.check_output([*command, "-v"], env=env, text=True).strip(),
                      "syntax": syntax.stderr.strip(), "selected": len(selected), "excluded": len(excluded),
                      "queryPassed": True, "serverIdentityChecked": True,
                      "inheritedExpiresModule": True, "paths": results,
                      "existingRewritePreserved": True, "allFixtureBytesMatch": True,
                      "unverified": ["production mod_headers and AllowOverride", "production existing config integration", "browser revisit after production update"]}
            with Path(args.output).open("x", encoding="utf-8") as stream:
                json.dump(result, stream, indent=2)
                stream.write("\n")
            print(json.dumps({key: result[key] for key in ("status", "selected", "excluded", "productionWrites")}))
            if args.browser_fixture:
                modified = time.time() - 86400
                def write_version(version):
                    for path in ("games/minerush/index.html", "unrelated/index.html"):
                        target = site / path
                        target.write_text(f'<!doctype html><html><meta charset="utf-8"><title>Cache fixture</title><h1>Version {version}</h1><a href="/about/">Fixture links</a></html>', encoding="utf-8")
                        os.utime(target, (modified, modified))
                (site / "about/index.html").write_text('<!doctype html><html><meta charset="utf-8"><title>Fixture links</title><a href="/games/minerush/">Revalidated game</a><a href="/unrelated/">Unchanged policy control</a></html>', encoding="utf-8")
                write_version("A")
                if args.legacy_browser_cache:
                    (site / ".htaccess").write_bytes(inherited)
                print(f"Browser fixture ready on http://127.0.0.1:{port}/about/; legacy policy={args.legacy_browser_cache}; enter b to replace A and enable candidate, c for a later version, q to stop.", flush=True)
                for line in sys.stdin:
                    if line.strip() == "b":
                        write_version("B updated")
                        (site / ".htaccess").write_bytes(assembled)
                        print("Server documents now B updated; original Last-Modified retained, size/ETag changed.", flush=True)
                    elif line.strip() == "c":
                        write_version("C further updated")
                        print("Server documents now C further updated.", flush=True)
                    elif line.strip() == "q":
                        break
        finally:
            process.terminate()
            process.communicate(timeout=10)


if __name__ == "__main__":
    main()
