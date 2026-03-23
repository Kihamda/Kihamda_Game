import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import { useAudio, useParticles, ParticleLayer, ScorePopup } from "@shared";
import type { PopupVariant, ScreenShakeHandle } from "@shared";
import "./App.css";

type Phase = "menu" | "playing" | "win" | "lose";
type Direction = "up" | "down" | "left" | "right";

interface Position { x: number; y: number; }
interface Mirror { x: number; y: number; angle: "/" | "\\"; }
interface LaserSegment { start: Position; end: Position; direction: Direction; }

interface Level {
  gridSize: number;
  source: Position;
  sourceDirection: Direction;
  target: Position;
  maxMirrors: number;
  obstacles: Position[];
  timeLimit: number;
  bonusTime: number;
}

interface PopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  y: string;
}

const LEVELS: Level[] = [
  { gridSize: 5, source: { x: 0, y: 2 }, sourceDirection: "right", target: { x: 4, y: 0 }, maxMirrors: 1, obstacles: [], timeLimit: 60, bonusTime: 30 },
  { gridSize: 5, source: { x: 0, y: 0 }, sourceDirection: "down", target: { x: 4, y: 4 }, maxMirrors: 2, obstacles: [], timeLimit: 60, bonusTime: 25 },
  { gridSize: 6, source: { x: 0, y: 2 }, sourceDirection: "right", target: { x: 5, y: 5 }, maxMirrors: 3, obstacles: [{ x: 3, y: 2 }, { x: 3, y: 3 }], timeLimit: 90, bonusTime: 40 },
  { gridSize: 6, source: { x: 0, y: 0 }, sourceDirection: "right", target: { x: 0, y: 5 }, maxMirrors: 4, obstacles: [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 4 }], timeLimit: 120, bonusTime: 50 },
  { gridSize: 7, source: { x: 0, y: 3 }, sourceDirection: "right", target: { x: 6, y: 3 }, maxMirrors: 5, obstacles: [{ x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 5 }, { x: 3, y: 6 }], timeLimit: 150, bonusTime: 60 },
];

function reflectDirection(incoming: Direction, mirrorAngle: "/" | "\\"): Direction {
  if (mirrorAngle === "/") {
    switch (incoming) { case "right": return "up"; case "up": return "right"; case "left": return "down"; case "down": return "left"; }
  } else {
    switch (incoming) { case "right": return "down"; case "down": return "right"; case "left": return "up"; case "up": return "left"; }
  }
}

function getDelta(dir: Direction): { dx: number; dy: number } {
  switch (dir) { case "up": return { dx: 0, dy: -1 }; case "down": return { dx: 0, dy: 1 }; case "left": return { dx: -1, dy: 0 }; case "right": return { dx: 1, dy: 0 }; }
}

function simulateLaser(level: Level, mirrors: Mirror[]): { segments: LaserSegment[]; hitTarget: boolean } {
  const segments: LaserSegment[] = [];
  let pos = { ...level.source };
  let dir = level.sourceDirection;
  const visited = new Set<string>();
  const maxSteps = level.gridSize * level.gridSize * 4;

  for (let step = 0; step < maxSteps; step++) {
    const delta = getDelta(dir);
    const startPos = { ...pos };
    const nextX = pos.x + delta.dx;
    const nextY = pos.y + delta.dy;

    if (nextX < 0 || nextX >= level.gridSize || nextY < 0 || nextY >= level.gridSize) {
      segments.push({ start: startPos, end: { x: nextX, y: nextY }, direction: dir });
      return { segments, hitTarget: false };
    }

    pos = { x: nextX, y: nextY };

    if (pos.x === level.target.x && pos.y === level.target.y) {
      segments.push({ start: startPos, end: pos, direction: dir });
      return { segments, hitTarget: true };
    }

    const hitObstacle = level.obstacles.some(o => o.x === pos.x && o.y === pos.y);
    if (hitObstacle) {
      segments.push({ start: startPos, end: pos, direction: dir });
      return { segments, hitTarget: false };
    }

    const mirror = mirrors.find(m => m.x === pos.x && m.y === pos.y);
    if (mirror) {
      const posKey = String(pos.x) + "," + String(pos.y) + "," + dir;
      if (visited.has(posKey)) {
        segments.push({ start: startPos, end: pos, direction: dir });
        return { segments, hitTarget: false };
      }
      visited.add(posKey);
      segments.push({ start: startPos, end: pos, direction: dir });
      dir = reflectDirection(dir, mirror.angle);
    } else {
      if (segments.length > 0 && segments[segments.length - 1].direction === dir) {
        segments[segments.length - 1].end = pos;
      } else {
        segments.push({ start: startPos, end: pos, direction: dir });
      }
    }
  }
  return { segments, hitTarget: false };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [levelIndex, setLevelIndex] = useState(0);
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [levelStartTime, setLevelStartTime] = useState(0);

  const shakeRef = useRef<ScreenShakeHandle>(null);
  const timerRef = useRef<number | null>(null);
  const winHandledRef = useRef(false);

  const [popup, setPopup] = useState<PopupState>({ text: null, key: 0, variant: "default", size: "md", y: "40%" });

  const { particles, burst, sparkle, confetti, explosion } = useParticles();
  const { playClick, playSuccess, playLevelUp, playGameOver, playCombo, playPerfect, playMiss } = useAudio();

  const level = LEVELS[levelIndex];

  const showPopup = useCallback((text: string, variant: PopupVariant = "default", size: "sm" | "md" | "lg" | "xl" = "md", y = "40%") => {
    setPopup(prev => ({ text, key: prev.key + 1, variant, size, y }));
  }, []);

  const laserResult = useMemo(() => {
    if (!level) return { segments: [], hitTarget: false };
    return simulateLaser(level, mirrors);
  }, [level, mirrors]);

  // Timer effect
  useEffect(() => {
    if (phase !== "playing" || level.timeLimit === 0) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setPhase("lose");
          playGameOver();
          shakeRef.current?.shake("heavy", 500);
          showPopup("⏰ 時間切れ！", "critical", "xl", "35%");
          setCombo(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, level.timeLimit, playGameOver, showPopup]);

  // Check win condition - use ref to prevent double execution
  const checkWin = useCallback((newMirrors: Mirror[], currentTimeLeft: number) => {
    if (winHandledRef.current) return;
    
    const result = simulateLaser(level, newMirrors);
    if (!result.hitTarget) return;
    
    winHandledRef.current = true;
    
    const timeTaken = Date.now() - levelStartTime;
    const quickSolve = timeTaken < level.bonusTime * 1000;
    let levelScore = 100 * (levelIndex + 1);
    let bonusText = "";

    if (level.timeLimit > 0 && currentTimeLeft > 0) {
      const timeBonus = Math.floor(currentTimeLeft * 5);
      levelScore += timeBonus;
      bonusText += "時間ボーナス +" + timeBonus + " ";
    }

    if (quickSolve) {
      const quickBonus = 50 * (levelIndex + 1);
      levelScore += quickBonus;
      bonusText += "⚡速攻 +" + quickBonus + " ";
      playCombo(combo + 1);
    }

    const mirrorsSaved = level.maxMirrors - newMirrors.length;
    if (mirrorsSaved > 0) {
      const efficiencyBonus = mirrorsSaved * 25;
      levelScore += efficiencyBonus;
      bonusText += "🎯効率 +" + efficiencyBonus;
    }

    const newCombo = combo + 1;
    if (newCombo > 1) { levelScore = Math.floor(levelScore * (1 + newCombo * 0.1)); }
    
    setScore(prev => prev + levelScore);
    setCombo(newCombo);
    if (timerRef.current) clearInterval(timerRef.current);

    const cellSize = 50;
    const targetX = level.target.x * cellSize + cellSize / 2 + 100;
    const targetY = level.target.y * cellSize + cellSize / 2 + 100;
    const perfectMirrors = newMirrors.length === level.maxMirrors;

    if (perfectMirrors && quickSolve) {
      playPerfect(); explosion(targetX, targetY, 30); confetti(60);
      shakeRef.current?.shake("extreme", 400);
      showPopup("👑 PERFECT!", "critical", "xl", "30%");
    } else if (quickSolve || mirrorsSaved > 0) {
      playLevelUp(); burst(targetX, targetY, 20); confetti(40);
      shakeRef.current?.shake("heavy", 300);
      showPopup("🌟 EXCELLENT! +" + levelScore, "bonus", "lg", "30%");
    } else {
      playSuccess(); sparkle(targetX, targetY, 15);
      shakeRef.current?.shake("medium", 200);
      showPopup("✨ クリア! +" + levelScore, "combo", "lg", "30%");
    }
    
    if (bonusText) { setTimeout(() => showPopup(bonusText.trim(), "bonus", "md", "45%"), 600); }
    setPhase("win");
  }, [level, levelIndex, levelStartTime, combo, playCombo, playPerfect, playLevelUp, playSuccess, explosion, confetti, burst, sparkle, showPopup]);

  const startGame = useCallback(() => {
    winHandledRef.current = false;
    setLevelIndex(0); setMirrors([]); setScore(0); setCombo(0);
    setTimeLeft(LEVELS[0].timeLimit); setLevelStartTime(Date.now());
    setPhase("playing"); playClick();
    showPopup("レベル 1 開始!", "level", "lg", "35%");
  }, [playClick, showPopup]);

  const nextLevel = useCallback(() => {
    if (levelIndex >= LEVELS.length - 1) {
      playPerfect(); confetti(100); shakeRef.current?.shake("extreme", 500);
      showPopup("🎊 全クリア！", "critical", "xl", "30%");
      setPhase("menu"); return;
    }
    winHandledRef.current = false;
    const nextIdx = levelIndex + 1;
    setLevelIndex(nextIdx); setMirrors([]);
    setTimeLeft(LEVELS[nextIdx].timeLimit); setLevelStartTime(Date.now());
    setPhase("playing"); playLevelUp();
    showPopup("レベル " + (nextIdx + 1) + " 開始!", "level", "lg", "35%");
  }, [levelIndex, playLevelUp, playPerfect, confetti, showPopup]);

  const retryLevel = useCallback(() => {
    winHandledRef.current = false;
    setMirrors([]); setTimeLeft(level.timeLimit); setLevelStartTime(Date.now());
    setCombo(0); setPhase("playing"); playClick();
    showPopup("リトライ!", "default", "md", "35%");
  }, [level.timeLimit, playClick, showPopup]);

  const backToMenu = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("menu"); setMirrors([]); setScore(0); setCombo(0);
  }, []);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (phase !== "playing") return;
    if ((x === level.source.x && y === level.source.y) ||
        (x === level.target.x && y === level.target.y) ||
        level.obstacles.some(o => o.x === x && o.y === y)) {
      playMiss(); shakeRef.current?.shake("light", 100); return;
    }

    const existingIndex = mirrors.findIndex(m => m.x === x && m.y === y);
    let newMirrors: Mirror[];
    
    if (existingIndex >= 0) {
      const existing = mirrors[existingIndex];
      if (existing.angle === "/") {
        newMirrors = [...mirrors];
        newMirrors[existingIndex] = { ...existing, angle: "\\" };
      } else {
        newMirrors = mirrors.filter((_, i) => i !== existingIndex);
      }
      playClick();
    } else {
      if (mirrors.length < level.maxMirrors) {
        newMirrors = [...mirrors, { x, y, angle: "/" }];
        playClick();
        const cellSize = 50;
        sparkle(x * cellSize + cellSize / 2 + 100, y * cellSize + cellSize / 2 + 100, 6);
      } else {
        playMiss(); shakeRef.current?.shake("light", 150);
        showPopup("ミラー上限!", "default", "sm", "50%");
        return;
      }
    }
    
    setMirrors(newMirrors);
    checkWin(newMirrors, timeLeft);
  }, [phase, level, mirrors, timeLeft, playClick, playMiss, sparkle, showPopup, checkWin]);

  const clearAllMirrors = useCallback(() => { setMirrors([]); playClick(); }, [playClick]);

  const renderCell = (x: number, y: number) => {
    const isSource = x === level.source.x && y === level.source.y;
    const isTarget = x === level.target.x && y === level.target.y;
    const isObstacle = level.obstacles.some(o => o.x === x && o.y === y);
    const mirror = mirrors.find(m => m.x === x && m.y === y);

    let cellClass = "laserdefense-cell";
    if (isSource) cellClass += " laserdefense-cell--source";
    if (isTarget) cellClass += " laserdefense-cell--target";
    if (isObstacle) cellClass += " laserdefense-cell--obstacle";
    if (mirror) cellClass += " laserdefense-cell--mirror";
    if (isTarget && laserResult.hitTarget) cellClass += " laserdefense-cell--hit";

    return (
      <button
        key={x + "-" + y}
        className={cellClass}
        onClick={() => handleCellClick(x, y)}
        disabled={phase !== "playing"}
        aria-label={"Cell " + x + "," + y}
      >
        {isSource && <div className={"laserdefense-source laserdefense-source--" + level.sourceDirection}>▶</div>}
        {isTarget && <div className="laserdefense-target">◎</div>}
        {isObstacle && <div className="laserdefense-obstacle">█</div>}
        {mirror && <div className={"laserdefense-mirror laserdefense-mirror--" + (mirror.angle === "/" ? "slash" : "backslash")}>{mirror.angle === "/" ? "╱" : "╲"}</div>}
      </button>
    );
  };

  const renderLaser = () => {
    if (laserResult.segments.length === 0) return null;
    const cellSize = 50;
    const offset = cellSize / 2;
    return (
      <svg className="laserdefense-laser-svg">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {laserResult.segments.map((seg, i) => (
          <line
            key={i}
            className={"laserdefense-laser-beam" + (laserResult.hitTarget ? " laserdefense-laser-beam--hit" : "")}
            x1={seg.start.x * cellSize + offset}
            y1={seg.start.y * cellSize + offset}
            x2={seg.end.x * cellSize + offset}
            y2={seg.end.y * cellSize + offset}
            filter="url(#glow)"
          />
        ))}
      </svg>
    );
  };

  return (
    <GameShell gameId="laserdefense" layout="default">
      <ScreenShake ref={shakeRef}>
        <div className="laserdefense-container">
          <header className="laserdefense-header">
            <h1 className="laserdefense-title">🔦 Laser Defense</h1>
          </header>

          {phase === "menu" && (
            <div className="laserdefense-menu">
              <p className="laserdefense-description">
                ミラーを配置してレーザーをターゲットに導け！<br />
                クリックでミラー設置、再クリックで角度変更・削除
              </p>
              {score > 0 && <div className="laserdefense-final-score">前回スコア: <span>{score.toLocaleString()}</span></div>}
              <button className="laserdefense-btn laserdefense-btn--primary" onClick={startGame}>🎮 ゲーム開始</button>
              <div className="laserdefense-rules">
                <h3>🎯 ルール</h3>
                <ul>
                  <li>╱ ╲ でレーザーを反射</li>
                  <li>制限時間内にターゲットに到達</li>
                  <li>素早くクリアでボーナス獲得</li>
                  <li>連続クリアでコンボ倍率UP</li>
                </ul>
              </div>
            </div>
          )}

          {(phase === "playing" || phase === "win" || phase === "lose") && level && (
            <>
              <div className="laserdefense-stats">
                <div className="laserdefense-stat">
                  <span className="laserdefense-stat-label">レベル</span>
                  <span className="laserdefense-stat-value">{levelIndex + 1}/{LEVELS.length}</span>
                </div>
                <div className="laserdefense-stat">
                  <span className="laserdefense-stat-label">ミラー</span>
                  <span className="laserdefense-stat-value">{mirrors.length}/{level.maxMirrors}</span>
                </div>
                <div className="laserdefense-stat">
                  <span className="laserdefense-stat-label">スコア</span>
                  <span className="laserdefense-stat-value">{score.toLocaleString()}</span>
                </div>
                {level.timeLimit > 0 && (
                  <div className={"laserdefense-stat" + (timeLeft <= 10 ? " laserdefense-stat--danger" : "")}>
                    <span className="laserdefense-stat-label">時間</span>
                    <span className="laserdefense-stat-value">{timeLeft}s</span>
                  </div>
                )}
                {combo > 1 && (
                  <div className="laserdefense-stat laserdefense-stat--combo">
                    <span className="laserdefense-stat-label">コンボ</span>
                    <span className="laserdefense-stat-value">x{combo}</span>
                  </div>
                )}
              </div>

              <div className="laserdefense-grid" style={{ gridTemplateColumns: "repeat(" + level.gridSize + ", 50px)", gridTemplateRows: "repeat(" + level.gridSize + ", 50px)" }}>
                {Array.from({ length: level.gridSize }, (_, y) =>
                  Array.from({ length: level.gridSize }, (_, x) => renderCell(x, y))
                )}
                {renderLaser()}
              </div>

              {phase === "playing" && (
                <div className="laserdefense-controls">
                  <button className="laserdefense-btn laserdefense-btn--secondary" onClick={clearAllMirrors}>🗑️ クリア</button>
                  <button className="laserdefense-btn laserdefense-btn--ghost" onClick={backToMenu}>← メニュー</button>
                </div>
              )}

              {phase === "win" && (
                <div className="laserdefense-overlay">
                  <div className="laserdefense-result">
                    <h2 className="laserdefense-result-title">🎉 レベルクリア！</h2>
                    <p className="laserdefense-result-score">スコア: {score.toLocaleString()}</p>
                    <div className="laserdefense-result-buttons">
                      {levelIndex < LEVELS.length - 1 ? (
                        <button className="laserdefense-btn laserdefense-btn--primary" onClick={nextLevel}>次のレベル →</button>
                      ) : (
                        <button className="laserdefense-btn laserdefense-btn--primary" onClick={backToMenu}>🎊 ゲーム完了!</button>
                      )}
                      <button className="laserdefense-btn laserdefense-btn--secondary" onClick={retryLevel}>もう一度</button>
                    </div>
                  </div>
                </div>
              )}

              {phase === "lose" && (
                <div className="laserdefense-overlay">
                  <div className="laserdefense-result laserdefense-result--lose">
                    <h2 className="laserdefense-result-title">⏰ 時間切れ</h2>
                    <p className="laserdefense-result-score">スコア: {score.toLocaleString()}</p>
                    <div className="laserdefense-result-buttons">
                      <button className="laserdefense-btn laserdefense-btn--primary" onClick={retryLevel}>🔄 リトライ</button>
                      <button className="laserdefense-btn laserdefense-btn--secondary" onClick={backToMenu}>メニューへ</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <ParticleLayer particles={particles} />
          <ScorePopup text={popup.text} popupKey={popup.key} variant={popup.variant} size={popup.size} y={popup.y} />
        </div>
      </ScreenShake>
    </GameShell>
  );
}
