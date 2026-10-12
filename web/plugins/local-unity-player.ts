import type { Plugin, Connect } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const prefix = "/__local-unity/ice-courier/";
const sha = (body: Buffer) => createHash("sha256").update(body).digest("hex");

// Never writes artifacts into dist. Enable only for a loopback inspection server.
export default function localUnityPlayer(): Plugin {
  function middleware(): Connect.NextHandleFunction {
    const root = resolve(import.meta.dirname, "../..");
    const run = process.env.KIHAMDA_LOCAL_PLAYER_RUN ?? "37945379221";
    if (!/^\d+$/.test(run)) throw new Error("Invalid verified Unity run ID");
    const directory = resolve(root, `artifacts/github/${run}/WebGL`);
    const evidence = JSON.parse(readFileSync(resolve(root, `business/unity/evidence/run-${run}-final.json`), "utf8"));
    const version = JSON.parse(readFileSync(resolve(directory, "build-version.json"), "utf8"));
    if (version.commit !== evidence.sourceCommit || version.target !== "WebGL" || version.project !== "ice-courier") throw new Error("Unity artifact version mismatch");
    const files = new Map<string, Buffer>();
    const checksums = readFileSync(resolve(directory, "SHA256SUMS"));
    for (const line of checksums.toString("utf8").trim().split(/\r?\n/)) {
      const match = line.match(/^([a-f0-9]{64}) {2}(.+)$/);
      if (!match || match[2].includes("..") || match[2].includes("\\") || match[2].startsWith("/")) throw new Error("Invalid artifact path");
      const [, digest, path] = match;
      const body = readFileSync(resolve(directory, path));
      if (sha(body) !== digest) throw new Error(`Unity checksum mismatch: ${path}`);
      files.set(path, body);
    }
    for (const path of ["index.html", "build-version.json", "Build/WebGL.loader.js", "Build/WebGL.framework.js", "Build/WebGL.data", "Build/WebGL.wasm"]) {
      if (!files.has(path)) throw new Error(`Missing verified Unity file: ${path}`);
    }
    if (version.uiLayout !== undefined && version.uiLayout !== "responsive-v1") throw new Error("Unknown Unity UI layout");
    const responsive = version.uiLayout === "responsive-v1";
    const manifest = JSON.stringify({ project: version.project, sourceCommit: version.commit, checksumsSha256: sha(checksums), verifiedFiles: files.size, uiLayout: responsive ? "responsive-v1" : "fixed-v0", playerUrl: `${prefix}runner.html` });
    const runner = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ice Courier</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#142828}canvas{display:block;${responsive ? "width:100%;height:100%;touch-action:none" : "width:960px;height:600px;position:absolute;left:50%;top:50%;transform-origin:center"}}</style><canvas id="unity-canvas" width="960" height="600" tabindex="0" aria-label="Ice Courierゲーム画面"></canvas><script>
const canvas=document.getElementById('unity-canvas');
${responsive ? "" : "function fit(){canvas.style.transform='translate(-50%,-50%) scale('+Math.min(innerWidth/960,innerHeight/600)+')'}fit();addEventListener('resize',fit);"}
function report(state){parent.postMessage({type:'kihamda-unity',state},location.origin)}
canvas.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();canvas.blur();report('page-focus')}});
addEventListener('error',()=>report('error'));addEventListener('unhandledrejection',()=>report('error'));
const loader=document.createElement('script');loader.src='Build/WebGL.loader.js';loader.onerror=()=>report('error');
loader.onload=()=>createUnityInstance(canvas,{dataUrl:'Build/WebGL.data',frameworkUrl:'Build/WebGL.framework.js',codeUrl:'Build/WebGL.wasm',streamingAssetsUrl:'StreamingAssets',companyName:'Kihamda.NET',productName:'Ice Courier',productVersion:'0.1.0',matchWebGLToCanvasSize:${responsive},${responsive ? "devicePixelRatio:1," : ""}showBanner:(_,type)=>{if(type==='error')report('error')}}).then(()=>{report('ready');canvas.focus()}).catch(()=>report('error'));
document.body.appendChild(loader);</script></html>`;
    const types: Record<string, string> = { js: "application/javascript", wasm: "application/wasm", data: "application/octet-stream", json: "application/json", html: "text/html; charset=utf-8", css: "text/css", png: "image/png", ico: "image/x-icon" };
    return (req, res, next) => {
      if (!req.url?.startsWith(prefix)) return next();
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) { res.statusCode = 403; res.end(); return; }
      const path = req.url.slice(prefix.length).split("?")[0];
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", types[path.split(".").pop() ?? ""] ?? "application/octet-stream");
      if (path === "manifest.json") { res.end(manifest); return; }
      if (path === "runner.html") { res.end(runner); return; }
      if (!files.has(path)) { res.statusCode = 404; res.end(); return; }
      res.end(files.get(path));
    };
  }
  return { name: "local-verified-unity-player", configureServer(server) { if (process.env.KIHAMDA_LOCAL_PLAYER === "1") server.middlewares.use(middleware()); }, configurePreviewServer(server) { if (process.env.KIHAMDA_LOCAL_PLAYER === "1") server.middlewares.use(middleware()); } };
}
