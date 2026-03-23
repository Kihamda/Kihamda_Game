import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ComboCounter } from "@shared/components/ComboCounter";
import { ScorePopup } from "@shared/components/ScorePopup";
import type { PopupVariant } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import { useHighScore } from "@shared/hooks/useHighScore";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import "./App.css";

// 定数
const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;
const LANE_COUNT = 4;
const LANE_WIDTH = GAME_WIDTH / LANE_COUNT;
const TILE_HEIGHT = 140;
const INITIAL_SPEED = 3;
const SPEED_INCREMENT = 0.2;
const MAX_MISSES = 3;
const PERFECT_ZONE_TOP = GAME_HEIGHT * 0.6;  // 下から40%〜70%がパーフェクトゾーン
const PERFECT_ZONE_BOTTOM = GAME_HEIGHT * 0.85;

// 型定義
interface Tile {
  id: number;
  lane: number;
  y: number;
  tapped: boolean;
  missed: boolean;
}

type Phase = "ready" | "playing" | "ended";

// 虹色パーティクル用の色配列
const RAINBOW_COLORS = [
  "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3"
];

// コンボマイルストーン
const COMBO_MILESTONES = [10, 25, 50, 100];

// スピードマイルストーン
const SPEED_MILESTONES = [6, 9, 12];

// ポップアップ状態の型
interface PopupState {
  text: string | null;
  key: number;
  x: string;
  y: string;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showMissFlash, setShowMissFlash] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [popup, setPopup] = useState<PopupState>({
    text: null,
    key: 0,
    x: "50%",
    y: "40%",
    variant: "default",
    size: "md",
  });

  const nextIdRef = useRef(1);
  const animationFrameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const spawnAccumulatorRef = useRef(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  const lastSpeedMilestoneRef = useRef(INITIAL_SPEED);

  // 共通フック
  const { particles, sparkle, burst, confetti } = useParticles();
  const { playClick, playPerfect, playMiss, playCombo, playCelebrate } = useAudio();
  const { best, update: updateHighScore } = useHighScore("pianotiles");

  // ポップアップ表示ヘルパー
  const showPopup = useCallback(
    (
      text: string,
      options?: {
        x?: string;
        y?: string;
        variant?: PopupVariant;
        size?: "sm" | "md" | "lg" | "xl";
      }
    ) => {
      setPopup((prev) => ({
        text,
        key: prev.key + 1,
        x: options?.x ?? "50%",
        y: options?.y ?? "40%",
        variant: options?.variant ?? "default",
        size: options?.size ?? "md",
      }));
    },
    []
  );

  // タイルを生成
  const spawnTile = useCallback(() => {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const newTile: Tile = {
      id: nextIdRef.current++,
      lane,
      y: -TILE_HEIGHT,
      tapped: false,
      missed: false,
    };
    setTiles((prev) => [...prev, newTile]);
  }, []);

  // ゲーム開始
  const startGame = useCallback(() => {
    setPhase("playing");
    setScore(0);
    setMisses(0);
    setTiles([]);
    setSpeed(INITIAL_SPEED);
    setCombo(0);
    setMaxCombo(0);
    setIsNewHighScore(false);
    setPopup({ text: null, key: 0, x: "50%", y: "40%", variant: "default", size: "md" });
    nextIdRef.current = 1;
    lastTimeRef.current = 0;
    spawnAccumulatorRef.current = 0;
    lastSpeedMilestoneRef.current = INITIAL_SPEED;
  }, []);
  
  // ミスのフラッシュ表示
  const triggerMissFlash = useCallback(() => {
    setShowMissFlash(true);
    setTimeout(() => setShowMissFlash(false), 200);
  }, []);

  // 虹色バーストエフェクト（Perfect用）
  const rainbowBurst = useCallback((x: number, y: number) => {
    RAINBOW_COLORS.forEach((_, i) => {
      const angle = (i / RAINBOW_COLORS.length) * Math.PI * 2;
      setTimeout(() => {
        sparkle(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 4);
      }, i * 20);
    });
    burst(x, y, 16);
  }, [sparkle, burst]);

  // 黒タイルをタップ
  const handleTileTap = useCallback((tileId: number, tileY: number, tileLane: number) => {
    const tileCenterY = tileY + TILE_HEIGHT / 2;
    const tileCenterX = tileLane * LANE_WIDTH + LANE_WIDTH / 2;
    const isPerfect = tileCenterY >= PERFECT_ZONE_TOP && tileCenterY <= PERFECT_ZONE_BOTTOM;
    
    // X座標をパーセンテージに変換
    const popupXPercent = `${(tileCenterX / GAME_WIDTH) * 100}%`;
    const popupYPercent = `${(tileCenterY / GAME_HEIGHT) * 100}%`;
    
    setTiles((prev) =>
      prev.map((t) =>
        t.id === tileId && !t.tapped && !t.missed
          ? { ...t, tapped: true }
          : t
      )
    );

    // スコアとコンボ更新
    const scoreAdd = isPerfect ? 20 : 10;
    setScore((prev) => prev + scoreAdd);
    setCombo((prev) => {
      const newCombo = prev + 1;
      setMaxCombo((max) => Math.max(max, newCombo));
      
      // コンボ音（5コンボ以上）
      if (newCombo >= 5 && newCombo % 5 === 0) {
        playCombo(newCombo);
      }
      
      // コンボマイルストーン達成時のポップアップ
      if (COMBO_MILESTONES.includes(newCombo)) {
        const size = newCombo >= 100 ? "xl" : newCombo >= 50 ? "lg" : "md";
        showPopup(`🔥 ${newCombo} COMBO!`, {
          variant: "combo",
          size,
          y: "30%",
        });
      }
      
      return newCombo;
    });
    
    // スピード更新とマイルストーンチェック
    setSpeed((prev) => {
      const newSpeed = Math.min(prev + SPEED_INCREMENT, 15);
      
      // スピードマイルストーン達成チェック
      for (const milestone of SPEED_MILESTONES) {
        if (prev < milestone && newSpeed >= milestone && lastSpeedMilestoneRef.current < milestone) {
          lastSpeedMilestoneRef.current = milestone;
          const speedLevel = SPEED_MILESTONES.indexOf(milestone) + 1;
          const labels = ["⚡ FAST!", "⚡⚡ FASTER!", "⚡⚡⚡ MAX SPEED!"];
          showPopup(labels[speedLevel - 1], {
            variant: "bonus",
            size: speedLevel === 3 ? "lg" : "md",
            y: "25%",
          });
          break;
        }
      }
      
      return newSpeed;
    });
    
    // エフェクト
    if (isPerfect) {
      // Perfect: 虹色バースト + 専用SE + ポップアップ
      rainbowBurst(tileCenterX, tileCenterY);
      playPerfect();
      showPopup("✨ PERFECT!", {
        x: popupXPercent,
        y: popupYPercent,
        variant: "critical",
        size: "lg",
      });
    } else {
      // 通常: スパークル + タップ音
      sparkle(tileCenterX, tileCenterY, 8);
      playClick();
    }
  }, [sparkle, rainbowBurst, playClick, playPerfect, playCombo, showPopup]);

  // 白タイル(空レーン)をタップでミス
  const handleLaneTap = useCallback(
    (lane: number, clientY: number, containerRect: DOMRect) => {
      if (phase !== "playing") return;

      const relativeY = clientY - containerRect.top;

      // タップ位置にある黒タイルを探す
      setTiles((prev) => {
        const tappedTile = prev.find((t) => {
          if (t.lane !== lane || t.tapped || t.missed) return false;
          const tileTop = t.y;
          const tileBottom = t.y + TILE_HEIGHT;
          return relativeY >= tileTop && relativeY <= tileBottom;
        });

        if (tappedTile) {
          // 黒タイルをタップした
          handleTileTap(tappedTile.id, tappedTile.y, tappedTile.lane);
          return prev;
        } else {
          // 白タイルをタップした (ミス)
          setMisses((m) => m + 1);
          setCombo(0);
          // ミス演出
          triggerMissFlash();
          playMiss();
          shakeRef.current?.shake("medium", 200);
          return prev;
        }
      });
    },
    [phase, handleTileTap, triggerMissFlash, playMiss]
  );

  // ゲームループ
  useEffect(() => {
    if (phase !== "playing") return;

    // 初回スポーン
    spawnTile();

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // タイル移動
      setTiles((prev) => {
        const updated = prev.map((t) => ({
          ...t,
          y: t.y + speed * (delta / 16),
        }));

        // 画面下に到達したタイルをチェック
        const newMisses: number[] = [];
        updated.forEach((t) => {
          if (!t.tapped && !t.missed && t.y > GAME_HEIGHT) {
            newMisses.push(t.id);
          }
        });

        if (newMisses.length > 0) {
          setMisses((m) => m + newMisses.length);
          setCombo(0);
          // ミス演出（タイル通過ミス）
          triggerMissFlash();
          playMiss();
          shakeRef.current?.shake("medium", 200);
          return updated.map((t) =>
            newMisses.includes(t.id) ? { ...t, missed: true } : t
          );
        }

        // 画面外に出たタイルを削除
        return updated.filter((t) => t.y < GAME_HEIGHT + TILE_HEIGHT);
      });

      // タイルスポーン (速度に応じた間隔で)
      const spawnInterval = Math.max(400, 800 - speed * 30);
      spawnAccumulatorRef.current += delta;
      if (spawnAccumulatorRef.current >= spawnInterval) {
        spawnTile();
        spawnAccumulatorRef.current = 0;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, speed, spawnTile, triggerMissFlash, playMiss]);

  // ミス数チェック
  useEffect(() => {
    if (misses >= MAX_MISSES && phase === "playing") {
      queueMicrotask(() => {
        // ハイスコア更新チェック
        const isNew = updateHighScore(score);
        if (isNew) {
          setIsNewHighScore(true);
          confetti(60);
          playCelebrate();
          showPopup("🏆 NEW HIGH SCORE!", {
            variant: "level",
            size: "xl",
            y: "35%",
          });
        }
        setPhase("ended");
      });
    }
  }, [misses, phase, score, updateHighScore, confetti, playCelebrate, showPopup]);

  // レーンクリックハンドラ
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (phase !== "playing") return;

      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();

      let clientX: number;
      let clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const relativeX = clientX - rect.left;
      const lane = Math.floor(relativeX / LANE_WIDTH);

      if (lane >= 0 && lane < LANE_COUNT) {
        handleLaneTap(lane, clientY, rect);
      }
    },
    [phase, handleLaneTap]
  );

  return (
    <GameShell gameId="pianotiles" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div
          className="pt-container"
          onClick={handleContainerClick}
          onTouchStart={handleContainerClick}
        >
          {/* ミスフラッシュ */}
          {showMissFlash && <div className="pt-miss-flash" />}
          
          {/* パーティクル */}
          <ParticleLayer particles={particles} />
          
          {/* コンボカウンター */}
          <ComboCounter combo={combo} position="center" threshold={3} />
          
          {/* スコアポップアップ */}
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            x={popup.x}
            y={popup.y}
            variant={popup.variant}
            size={popup.size}
          />

          {/* ヘッダー */}
          <div className="pt-header">
            <div className="pt-stat">
              <span className="pt-stat-label">SCORE</span>
              <span className="pt-stat-value">{score}</span>
            </div>
            <div className="pt-stat">
              <span className="pt-stat-label">BEST</span>
              <span className="pt-stat-value">{best}</span>
            </div>
            <div className="pt-stat pt-stat--miss">
              <span className="pt-stat-label">MISS</span>
              <span className="pt-stat-value">
                {Array.from({ length: MAX_MISSES }).map((_, i) => (
                  <span
                    key={i}
                    className={`pt-heart ${i < MAX_MISSES - misses ? "pt-heart--full" : "pt-heart--empty"}`}
                  >
                    ♥
                  </span>
                ))}
              </span>
            </div>
          </div>

          {/* パーフェクトゾーン表示 */}
          <div className="pt-perfect-zone" />

          {/* レーン */}
          <div className="pt-lanes">
            {Array.from({ length: LANE_COUNT }).map((_, i) => (
              <div key={i} className="pt-lane" />
            ))}
          </div>

          {/* タイル */}
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className={`pt-tile ${tile.tapped ? "pt-tile--tapped" : ""} ${tile.missed ? "pt-tile--missed" : ""}`}
              style={{
                left: tile.lane * LANE_WIDTH,
                top: tile.y,
                width: LANE_WIDTH,
                height: TILE_HEIGHT,
              }}
            />
          ))}

          {/* スタート画面 */}
          {phase === "ready" && (
            <div className="pt-overlay">
              <h1 className="pt-title">Piano Tiles</h1>
              <p className="pt-desc">
                黒いタイルをタップ！<br />
                下の光るゾーンでPerfect!<br />
                3ミスでゲームオーバー
              </p>
              <button className="pt-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {/* 結果画面 */}
          {phase === "ended" && (
            <div className="pt-overlay">
              {isNewHighScore && (
                <div className="pt-new-record">🎉 NEW RECORD! 🎉</div>
              )}
              <h2 className="pt-result-title">GAME OVER</h2>
              <div className="pt-result-score">{score}</div>
              <div className="pt-result-stats">
                <div>最大コンボ: {maxCombo}</div>
                <div>ハイスコア: {best}</div>
              </div>
              <button className="pt-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}