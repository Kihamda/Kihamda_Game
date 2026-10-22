import { useState } from "react";

/** Small, self-contained game illustrations; no external font or image request. */
export default function GameIllustration({ id, title }: { id: string; title: string }) {
  return <div className={`game-illustration illustration-${id}`} role="img" aria-label={`${title}のルールを表すイラスト`}>
    <span className="illustration-screw screw-a" /><span className="illustration-screw screw-b" />
    {id === "minerush" ? <div className="mini-console"><div className="console-top"><span>010</span><i>✦</i><span>001</span></div><div className="mini-mine-board">{Array.from({ length: 30 }, (_, i) => <span key={i} className={i > 11 && i < 28 && ![17, 23].includes(i) ? "revealed" : ""}>{i === 17 ? "⚑" : [12, 19, 26].includes(i) ? "1" : [13, 20, 27].includes(i) ? "2" : ""}</span>)}</div></div>
      : id === "iceslide" ? <div className="mini-ice-board">{Array.from({ length: 25 }, (_, i) => <span key={i} className={[0, 1, 5, 9, 15, 20, 23, 24].includes(i) ? "ice-wall" : ""}>{i === 12 ? <i className="ice-penguin">●</i> : i === 18 ? <i className="ice-goal">✦</i> : ""}</span>)}</div>
        : id === "ntiktaktoe" ? <div className="mini-tic-board">{["○", "×", "", "", "○", "×", "×", "", "○"].map((piece, i) => <span key={i} className={piece === "○" ? "tic-circle" : "tic-cross"}>{piece}</span>)}</div>
          : <div className="mini-gravity"><span className="gravity-ball" /><span className="gravity-track track-one" /><span className="gravity-track track-two" /><span className="gravity-star">✦</span><span className="gravity-arrow">↓</span></div>}
    <span className="illustration-sticker">{id === "minerush" ? "THINK & DISCOVER" : id === "iceslide" ? "SLIDE & SOLVE" : id === "ntiktaktoe" ? "YOUR TURN!" : "CHANGE DIRECTION"}</span>
  </div>;
}

/** Retain a useful illustration when an optional reference screenshot fails. */
export function ReferenceImage({ id, src, alt }: { id: string; src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="reference-image">{failed ? <><GameIllustration id={id} title={alt} /><p role="status">画像を表示できませんでした。遊び方は下の説明で確認できます。</p></>
    : <img src={src} alt={alt} width={932} height={704} loading="lazy" decoding="async" onError={() => setFailed(true)} />}</div>;
}
