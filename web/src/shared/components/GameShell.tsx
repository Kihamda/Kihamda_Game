import "../theme.css";
import "./GameShell.css";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getGameById } from "../../games/metadata";

interface Props {
  children: ReactNode;
  /** ゲーム名 (ポータルリンクに使用) */
  title?: string;
  /** ゲーム説明 */
  description?: string;
  /** ポータルへの戻り先URL */
  portalUrl?: string;
  /** ゲームID (おすすめゲーム表示用) */
  gameId?: string;
  /** スケールの下限値 */
  minScale?: number;
  /** 枠内レイアウトモード */
  layout?: "default" | "immersive";
}

function buildControlHints(tags: string[] | undefined): string[] {
  if (!tags?.length) {
    return ["画面内のボタンで操作", "タップまたはクリックでプレイ"];
  }

  const hints = new Set<string>();
  if (tags.includes("typing")) hints.add("キーボード入力で操作");
  if (tags.includes("reflex") || tags.includes("arcade")) {
    hints.add("タップやクリックの反応速度が重要");
  }
  if (
    tags.includes("puzzle") ||
    tags.includes("strategy") ||
    tags.includes("board")
  ) {
    hints.add("手順を考えて進めると有利");
  }
  if (tags.includes("multiplayer")) hints.add("ローカルで交代プレイ");
  if (tags.includes("singleplayer")) hints.add("1人プレイ向け");

  return [...hints].slice(0, 3);
}

export function GameShell({
  children,
  title,
  description,
  portalUrl = "/",
  gameId,
  minScale = 0.3,
  layout = "default",
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scaledContentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const metadata = gameId ? getGameById(gameId) : undefined;
  const resolvedTitle = title ?? metadata?.title ?? "Game";
  const resolvedDescription =
    description ?? metadata?.description ?? "ゲームを楽しんでいってね";
  const controlHints = buildControlHints(metadata?.tags);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign(portalUrl);
  };

  useLayoutEffect(() => {
    const frameElement = frameRef.current;
    const scaledContentElement = scaledContentRef.current;

    if (!frameElement || !scaledContentElement) {
      return;
    }

    let rafId = 0;

    const updateScale = () => {
      const frameWidth = frameElement.clientWidth;
      const frameHeight = frameElement.clientHeight;
      const contentWidth = scaledContentElement.scrollWidth;
      const contentHeight = scaledContentElement.scrollHeight;

      if (
        frameWidth <= 0 ||
        frameHeight <= 0 ||
        contentWidth <= 0 ||
        contentHeight <= 0
      ) {
        setScale(1);
        return;
      }

      const nextScale = Math.min(
        1,
        frameWidth / contentWidth,
        frameHeight / contentHeight,
      );
      const clampedScale = Math.max(minScale, Number(nextScale.toFixed(3)));
      setScale((previousScale) =>
        Math.abs(previousScale - clampedScale) > 0.001
          ? clampedScale
          : previousScale,
      );
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateScale);
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(frameElement);
    resizeObserver.observe(scaledContentElement);

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(scaledContentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    scheduleUpdate();

    return () => {
      cancelAnimationFrame(rafId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [children, minScale]);

  return (
    <div className={`game-shell-root game-shell-root--${layout}`}>
      <div className={`game-shell-main game-shell-main--${layout}`}>
        <aside className="game-shell-panel" aria-label="ゲーム操作パネル">
          <div className="game-shell-panel-inner">
            <button
              type="button"
              className="game-shell-back-button"
              onClick={handleBack}
            >
              ← 戻る
            </button>

            <h1 className="game-shell-title">{resolvedTitle}</h1>
            <p className="game-shell-description">{resolvedDescription}</p>

            <section className="game-shell-section">
              <h2>主要操作</h2>
              <ul>
                {controlHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </section>

            <div className="game-shell-actions">
              <a href={portalUrl} className="game-shell-link-button">
                ゲーム一覧へ
              </a>
              <button
                type="button"
                className="game-shell-link-button game-shell-link-button--ghost"
                onClick={() => window.location.reload()}
              >
                リロード
              </button>
            </div>

            <section
              className="game-shell-section game-shell-meta"
              aria-label="フッター情報"
            >
              <h2>案内</h2>
              <div className="game-shell-meta-links">
                <a href="/privacy-policy/">プライバシーポリシー</a>
                <a href="/contact/">お問い合わせ</a>
                <a href="/about/">運営者情報</a>
              </div>
              <p className="game-shell-meta-copy">© 2024-2026 Kihamda.NET</p>
            </section>
          </div>
        </aside>

        <section
          className={`game-shell-stage game-shell-stage--${layout}`}
          aria-label={`${resolvedTitle} のゲーム画面`}
        >
          <div
            className={`game-shell-frame game-shell-frame--${layout}`}
            ref={frameRef}
          >
            <div className="game-shell-scale-viewport">
              <div
                className={`game-shell-scale-content game-shell-scale-content--${layout}`}
                ref={scaledContentRef}
                style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
              >
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
