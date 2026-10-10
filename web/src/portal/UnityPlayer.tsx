import { useEffect, useRef, useState } from "react";

type Preview = { playerUrl: string; sourceCommit: string; uiLayout?: string };
export default function UnityPlayer() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [attempt, setAttempt] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (state === "idle" && returnFocus.current) {
      start.current?.focus();
      returnFocus.current = false;
    }
  }, [state]);
  useEffect(() => {
    if (!["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)) return;
    const controller = new AbortController();
    fetch("/__local-unity/ice-courier/manifest.json", { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (data.project === "ice-courier" && Number.isInteger(data.verifiedFiles) && data.verifiedFiles > 0 && /^[a-f0-9]{64}$/.test(data.checksumsSha256) && /^[a-f0-9]{40}$/.test(data.sourceCommit) && data.playerUrl === "/__local-unity/ice-courier/runner.html") setPreview(data); })
      .catch(() => { /* A normal public preview has no local artifact route. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (state !== "loading" && state !== "ready") return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== "kihamda-unity") return;
      if (event.data.state === "ready") setState("ready");
      if (event.data.state === "error") setState("error");
      if (event.data.state === "page-focus") end.current?.focus();
    };
    window.addEventListener("message", onMessage);
    const timer = state === "loading" ? window.setTimeout(() => setState("error"), 120000) : undefined;
    return () => { window.removeEventListener("message", onMessage); window.clearTimeout(timer); };
  }, [state, attempt]);
  if (!preview) return null;
  const stop = () => { returnFocus.current = true; setState("idle"); };
  return <section className="player-section" aria-labelledby="player-title"><h2 id="player-title">Ice Courierを試す</h2><p className="player-note">ローカル検査用。ブラウザ版は公開準備中です。</p>
    <div className="player-actions"><button ref={start} type="button" className="button secondary" disabled={state === "loading" || state === "ready"} onClick={() => { setAttempt(value => value + 1); setState("loading"); }}>ゲームを開始</button>{state !== "idle" && <button ref={end} type="button" className="button secondary" onClick={stop}>ゲームを終了</button>}<a className="text-link" href="/#works">作品一覧へ戻る</a></div>
    <p role={state === "error" ? "alert" : "status"} aria-live="polite" className="player-status">{state === "loading" ? "ゲームを読み込んでいます。" : state === "ready" ? "ゲームを操作できます。方向キー・ZでUndo。ページの操作に戻るにはTabを押してください。" : state === "error" ? "ゲームを読み込めませんでした。もう一度試すか、作品一覧へ戻ってください。" : "開始するとゲームを読み込みます。"}</p>
    {state === "error" && <button className="button secondary" type="button" onClick={() => { setAttempt(value => value + 1); setState("loading"); }}>もう一度読み込む</button>}
    {(state === "loading" || state === "ready") && <iframe ref={frame} key={attempt} className={`unity-player${preview.uiLayout === "responsive-v1" ? " responsive" : ""}`} title="Ice Courierゲーム画面" src={preview.playerUrl} allow="fullscreen" onError={() => setState("error")} />}
    <p className="player-note">{preview.uiLayout === "responsive-v1" ? "縦画面では説明・盤面・操作を縦に表示します。実端末でのタッチ操作は検査中です。" : "この検証済み版はスマートフォン幅で縮小表示します。文字と操作の大きさは調整中です。"}</p>
  </section>;
}
