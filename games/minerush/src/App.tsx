import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./App.css";
import {
  useAudio,
  useHighScore,
  GameShell,
  useParticles,
  ParticleLayer,
  ScorePopup,
} from "../../../src/shared";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

type Phase = "settings" | "playing" | "stageClear" | "gameover";

interface GridConfig {
  rows: number;
  cols: number;
  mines: number;
}

interface Settings {
  startStage: 1 | 3 | 5;
  gridMode: "AUTO" | "CUSTOM";
  customRows: number;
  customCols: number;
  customMines: number;
  flagMode: "STANDARD" | "TAP_FLAG";
}

const DEFAULT_SETTINGS: Settings = {
  startStage: 1,
  gridMode: "AUTO",
  customRows: 8,
  customCols: 8,
  customMines: 10,
  flagMode: "STANDARD",
};

const SETTINGS_KEY = "minerush_settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        startStage: [1, 3, 5].includes(p.startStage)
          ? p.startStage
          : DEFAULT_SETTINGS.startStage,
        gridMode: ["AUTO", "CUSTOM"].includes(p.gridMode)
          ? p.gridMode
          : DEFAULT_SETTINGS.gridMode,
        customRows:
          typeof p.customRows === "number"
            ? Math.min(15, Math.max(5, p.customRows))
            : DEFAULT_SETTINGS.customRows,
        customCols:
          typeof p.customCols === "number"
            ? Math.min(15, Math.max(5, p.customCols))
            : DEFAULT_SETTINGS.customCols,
        customMines:
          typeof p.customMines === "number"
            ? Math.max(1, p.customMines)
            : DEFAULT_SETTINGS.customMines,
        flagMode: ["STANDARD", "TAP_FLAG"].includes(p.flagMode)
          ? p.flagMode
          : DEFAULT_SETTINGS.flagMode,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ─── Stage Config ───────────────────────────────────────────────────────── */

const STAGE_TABLE: [number, number][] = [
  [6, 5],
  [7, 8],
  [8, 12],
  [9, 16],
  [10, 20],
];

function stageConfig(stage: number): GridConfig {
  if (stage >= 1 && stage <= 5) {
    const [size, mines] = STAGE_TABLE[stage - 1];
    return { rows: size, cols: size, mines };
  }
  return { rows: 10, cols: 10, mines: Math.min(30, 20 + (stage - 5) * 2) };
}

function getGridConfig(stage: number, s: Settings): GridConfig {
  if (s.gridMode === "CUSTOM") {
    const maxMines = Math.floor((s.customRows * s.customCols) / 3);
    return {
      rows: s.customRows,
      cols: s.customCols,
      mines: Math.min(s.customMines, maxMines),
    };
  }
  return stageConfig(stage);
}

/* ─── Board Logic ────────────────────────────────────────────────────────── */

function neighbors(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols),
    c = i % cols,
    out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols)
        out.push(nr * cols + nc);
    }
  return out;
}

function makeBoard(
  rows: number,
  cols: number,
  mineCount: number,
  safe: number,
): Cell[] {
  const total = rows * cols;
  const safeSet = new Set([safe, ...neighbors(safe, rows, cols)]);
  const pool: number[] = [];
  for (let i = 0; i < total; i++) if (!safeSet.has(i)) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const mineSet = new Set(pool.slice(0, mineCount));
  return Array.from({ length: total }, (_, i) => ({
    mine: mineSet.has(i),
    revealed: false,
    flagged: false,
    adjacent: mineSet.has(i)
      ? 0
      : neighbors(i, rows, cols).filter((n) => mineSet.has(n)).length,
  }));
}

function floodOpen(
  cells: Cell[],
  i: number,
  rows: number,
  cols: number,
): number[] {
  const opened: number[] = [];
  const stack = [i];
  const seen = new Set<number>();
  while (stack.length) {
    const idx = stack.pop()!;
    if (seen.has(idx)) continue;
    seen.add(idx);
    const cell = cells[idx];
    if (cell.mine || cell.flagged || cell.revealed) continue;
    cell.revealed = true;
    opened.push(idx);
    if (cell.adjacent === 0)
      for (const n of neighbors(idx, rows, cols))
        if (!seen.has(n)) stack.push(n);
  }
  return opened;
}

function fmt(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

const NUM_COLORS: Record<number, string> = {
  1: "#3b82f6",
  2: "#22c55e",
  3: "#ef4444",
  4: "#a855f7",
  5: "#92400e",
  6: "#06b6d4",
  7: "#e2e8f0",
  8: "#6b7280",
};

/* ─── Cell Rendering ─────────────────────────────────────────────────────── */

function cellCls(c: Cell): string {
  if (c.flagged && !c.revealed) return "flagged";
  if (!c.revealed) return "unopened";
  if (c.mine) return "mine-boom";
  return "opened";
}

function cellText(c: Cell): string {
  if (c.flagged && !c.revealed) return "🚩";
  if (!c.revealed) return "";
  if (c.mine) return "💣";
  return c.adjacent > 0 ? String(c.adjacent) : "";
}

/* ─── Component ──────────────────────────────────────────────────────────── */

function emptyBoard(rows: number, cols: number): Cell[] {
  return Array.from({ length: rows * cols }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
  }));
}

const App = () => {
  const { playTone, playSweep, playArpeggio, playNoise } = useAudio();
  const { best, update: updateBest } = useHighScore("minerush");
  const { particles, burst, clear: clearParticles } = useParticles();

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stage, setStage] = useState(1);
  const [phase, setPhase] = useState<Phase>("settings");
  const [cells, setCells] = useState<Cell[]>(() => emptyBoard(6, 6));
  const [generated, setGenerated] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [popupKey, setPopupKey] = useState(0);
  const [flagModeActive, setFlagModeActive] = useState(false);

  const originRef = useRef(0);
  const rafRef = useRef(0);
  const timerOnRef = useRef(false);
  const lpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lpFiredRef = useRef(false);
  const activeCellRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const advTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rows, cols, mines } = useMemo(
    () => getGridConfig(stage, settings),
    [stage, settings],
  );
  const flagCount = useMemo(
    () => cells.filter((c) => c.flagged).length,
    [cells],
  );
  const openedCount = useMemo(
    () => cells.filter((c) => c.revealed && !c.mine).length,
    [cells],
  );
  const totalSafe = rows * cols - mines;

  /* ── Settings ── */

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      const maxM = Math.floor((next.customRows * next.customCols) / 3);
      if (next.customMines > maxM) next.customMines = Math.max(1, maxM);
      if (next.customMines < 1) next.customMines = 1;
      saveSettings(next);
      return next;
    });
  }, []);

  /* ── Timer helpers ── */

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    timerOnRef.current = false;
  }, []);

  const startTimer = useCallback(
    (from: number) => {
      stopTimer();
      originRef.current = performance.now() - from;
      timerOnRef.current = true;
      const tick = () => {
        if (!timerOnRef.current) return;
        setElapsed(performance.now() - originRef.current);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stopTimer],
  );

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (advTimerRef.current) clearTimeout(advTimerRef.current);
    },
    [],
  );

  /* ── UI helpers ── */

  const showPopup = useCallback((text: string) => {
    setPopup(text);
    setPopupKey((k) => k + 1);
  }, []);

  const initStage = useCallback(
    (s: number, st: Settings) => {
      const cfg = getGridConfig(s, st);
      setCells(emptyBoard(cfg.rows, cfg.cols));
      setGenerated(false);
      setFlash(false);
      setShake(false);
      clearParticles();
    },
    [clearParticles],
  );

  /* ── Start game ── */

  const startGame = useCallback(() => {
    if (advTimerRef.current) {
      clearTimeout(advTimerRef.current);
      advTimerRef.current = null;
    }
    stopTimer();
    const s = settings.startStage;
    setStage(s);
    setElapsed(0);
    setPopup(null);
    setPhase("playing");
    setFlagModeActive(false);
    initStage(s, settings);
  }, [settings, stopTimer, initStage]);

  /* ── Go to settings ── */

  const toSettings = useCallback(() => {
    if (advTimerRef.current) {
      clearTimeout(advTimerRef.current);
      advTimerRef.current = null;
    }
    stopTimer();
    setPhase("settings");
  }, [stopTimer]);

  /* ── Stage clear ── */

  const handleStageClear = useCallback(
    (frozenMs: number) => {
      stopTimer();
      setElapsed(frozenMs);
      setPhase("stageClear");
      setFlash(true);
      playSweep(400, 800, 0.3, "sine", 0.3);
      showPopup("STAGE CLEAR!");
      updateBest(stage);

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) burst(rect.width / 2, rect.height / 2, 24);

      advTimerRef.current = setTimeout(() => {
        const next = stage + 1;
        setStage(next);
        initStage(next, settings);
        setPhase("playing");
        startTimer(frozenMs);
      }, 1200);
    },
    [
      stopTimer,
      playSweep,
      showPopup,
      updateBest,
      stage,
      burst,
      initStage,
      startTimer,
      settings,
    ],
  );

  /* ── Game over ── */

  const handleGameOver = useCallback(() => {
    stopTimer();
    setPhase("gameover");
    playTone(150, 0.3, "sawtooth", 0.4);
    playNoise(0.3, 0.3, 400);
    setShake(true);
    setCells((prev) =>
      prev.map((c) => (c.mine ? { ...c, revealed: true } : c)),
    );
    updateBest(stage);
    setTimeout(() => setShake(false), 500);
  }, [stopTimer, playTone, playNoise, updateBest, stage]);

  /* ── Open cell ── */

  const openCell = useCallback(
    (idx: number, px: number, py: number) => {
      if (phase !== "playing") return;

      let work: Cell[];
      if (!generated) {
        work = makeBoard(rows, cols, mines, idx);
        setGenerated(true);
        if (!timerOnRef.current) startTimer(0);
      } else {
        work = cells.map((c) => ({ ...c }));
      }

      const cell = work[idx];
      if (cell.revealed || cell.flagged) return;
      if (cell.mine) {
        handleGameOver();
        return;
      }

      const opened = floodOpen(work, idx, rows, cols);
      setCells(work);

      if (opened.length >= 8) {
        playArpeggio([500, 600, 700, 800], 0.05, "sine", 0.2, 0.05);
        showPopup(`BIG OPEN +${opened.length}`);
        burst(px, py, 16);
      } else if (opened.length > 1) {
        playArpeggio([500, 600, 700], 0.04, "sine", 0.15, 0.04);
        showPopup(`+${opened.length}`);
        burst(px, py, 8);
      } else {
        playTone(400, 0.05, "sine", 0.2);
      }

      const totalOpened = work.filter((c) => c.revealed && !c.mine).length;
      const safe = rows * cols - mines;
      if (totalOpened >= safe) {
        const frozen = performance.now() - originRef.current;
        handleStageClear(frozen);
      }
    },
    [
      phase,
      generated,
      rows,
      cols,
      mines,
      cells,
      handleGameOver,
      handleStageClear,
      startTimer,
      playArpeggio,
      playTone,
      showPopup,
      burst,
    ],
  );

  /* ── Flag cell ── */

  const flagCell = useCallback(
    (idx: number) => {
      if (phase !== "playing") return;
      setCells((prev) => {
        if (prev[idx].revealed) return prev;
        return prev.map((c, i) =>
          i === idx ? { ...c, flagged: !c.flagged } : c,
        );
      });
      playTone(600, 0.03, "sine", 0.2);
    },
    [phase, playTone],
  );

  /* ── Pointer events ── */

  const onPtrDown = useCallback(
    (idx: number) => {
      if (settings.flagMode === "TAP_FLAG") return;
      activeCellRef.current = idx;
      lpFiredRef.current = false;
      lpTimerRef.current = setTimeout(() => {
        lpFiredRef.current = true;
        activeCellRef.current = null;
        flagCell(idx);
      }, 500);
    },
    [flagCell, settings.flagMode],
  );

  const onPtrUp = useCallback(
    (idx: number, e: React.PointerEvent) => {
      if (settings.flagMode === "TAP_FLAG") {
        const rect = containerRef.current?.getBoundingClientRect();
        const px = e.clientX - (rect?.left ?? 0);
        const py = e.clientY - (rect?.top ?? 0);
        if (flagModeActive) {
          flagCell(idx);
        } else {
          openCell(idx, px, py);
        }
        return;
      }
      if (lpTimerRef.current) {
        clearTimeout(lpTimerRef.current);
        lpTimerRef.current = null;
      }
      if (activeCellRef.current === idx && !lpFiredRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        const px = e.clientX - (rect?.left ?? 0);
        const py = e.clientY - (rect?.top ?? 0);
        openCell(idx, px, py);
      }
      activeCellRef.current = null;
    },
    [openCell, flagCell, settings.flagMode, flagModeActive],
  );

  const onPtrLeave = useCallback(() => {
    if (lpTimerRef.current) {
      clearTimeout(lpTimerRef.current);
      lpTimerRef.current = null;
    }
    activeCellRef.current = null;
  }, []);

  const onCtxMenu = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.preventDefault();
      flagCell(idx);
    },
    [flagCell],
  );

  /* ── Render ── */

  const maxMines = Math.floor(
    (settings.customRows * settings.customCols) / 3,
  );
  const displayMines = Math.min(settings.customMines, maxMines);

  return (
    <GameShell title="MineRush" gameId="minerush">
      <div className={`mine-app${shake ? " shake" : ""}`} ref={containerRef}>
        {flash && <div className="flash-overlay" />}
        <ParticleLayer particles={particles} />
        <ScorePopup text={popup} popupKey={popupKey} />

        {phase === "settings" ? (
          <div className="mine-settings">
            <h2 className="mine-settings-title">SETTINGS</h2>

            <div className="mine-setting-group">
              <span className="mine-setting-label">開始ステージ</span>
              <div className="mine-setting-options">
                {([1, 3, 5] as const).map((s) => (
                  <button
                    key={s}
                    className={`mine-opt-btn${settings.startStage === s ? " active" : ""}`}
                    onClick={() => updateSettings({ startStage: s })}
                  >
                    {s === 1
                      ? "Stage 1"
                      : s === 3
                        ? "Stage 3"
                        : "Stage 5"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mine-setting-group">
              <span className="mine-setting-label">グリッドモード</span>
              <div className="mine-setting-options">
                <button
                  className={`mine-opt-btn${settings.gridMode === "AUTO" ? " active" : ""}`}
                  onClick={() => updateSettings({ gridMode: "AUTO" })}
                >
                  AUTO
                </button>
                <button
                  className={`mine-opt-btn${settings.gridMode === "CUSTOM" ? " active" : ""}`}
                  onClick={() => updateSettings({ gridMode: "CUSTOM" })}
                >
                  CUSTOM
                </button>
              </div>
            </div>

            {settings.gridMode === "CUSTOM" && (
              <div className="mine-setting-group mine-custom-grid">
                <div className="mine-slider-row">
                  <span className="mine-slider-label">ROWS</span>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    value={settings.customRows}
                    onChange={(e) =>
                      updateSettings({ customRows: +e.target.value })
                    }
                  />
                  <span className="mine-slider-value">
                    {settings.customRows}
                  </span>
                </div>
                <div className="mine-slider-row">
                  <span className="mine-slider-label">COLS</span>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    value={settings.customCols}
                    onChange={(e) =>
                      updateSettings({ customCols: +e.target.value })
                    }
                  />
                  <span className="mine-slider-value">
                    {settings.customCols}
                  </span>
                </div>
                <div className="mine-slider-row">
                  <span className="mine-slider-label">MINES</span>
                  <input
                    type="range"
                    min={1}
                    max={maxMines}
                    value={displayMines}
                    onChange={(e) =>
                      updateSettings({ customMines: +e.target.value })
                    }
                  />
                  <span className="mine-slider-value">{displayMines}</span>
                </div>
              </div>
            )}

            <div className="mine-setting-group">
              <span className="mine-setting-label">フラグモード</span>
              <div className="mine-setting-options">
                <button
                  className={`mine-opt-btn${settings.flagMode === "STANDARD" ? " active" : ""}`}
                  onClick={() => updateSettings({ flagMode: "STANDARD" })}
                >
                  STANDARD
                </button>
                <button
                  className={`mine-opt-btn${settings.flagMode === "TAP_FLAG" ? " active" : ""}`}
                  onClick={() => updateSettings({ flagMode: "TAP_FLAG" })}
                >
                  TAP FLAG
                </button>
              </div>
            </div>

            <button className="game-btn mine-start-btn" onClick={startGame}>
              START
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mine-header">
              <div className="mine-stat">
                <span className="mine-stat-label">STAGE</span>
                <span className="mine-stat-value">{stage}</span>
              </div>
              <div className="mine-timer">{fmt(elapsed)}</div>
              <div className="mine-stat">
                <span className="mine-stat-label">MINES</span>
                <span className="mine-stat-value">{mines - flagCount}</span>
              </div>
            </div>

            {settings.flagMode === "TAP_FLAG" && phase === "playing" && (
              <button
                className={`mine-flag-toggle${flagModeActive ? " active" : ""}`}
                onClick={() => setFlagModeActive((f) => !f)}
              >
                {flagModeActive ? "🚩 FLAG" : "👆 OPEN"}
              </button>
            )}

            {/* Grid */}
            <div
              className="mine-grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                aspectRatio: `${cols} / ${rows}`,
                width: `min(92vw, 480px, calc((80vh - 200px) * ${cols} / ${rows}))`,
              }}
            >
              {cells.map((cell, i) => {
                const cls = cellCls(cell);
                const color =
                  cell.revealed && !cell.mine && cell.adjacent > 0
                    ? NUM_COLORS[cell.adjacent]
                    : undefined;
                return (
                  <div
                    key={i}
                    className={`mine-cell ${cls}`}
                    onPointerDown={() => onPtrDown(i)}
                    onPointerUp={(e) => onPtrUp(i, e)}
                    onPointerLeave={onPtrLeave}
                    onContextMenu={(e) => onCtxMenu(i, e)}
                    style={color ? { color } : undefined}
                  >
                    {cellText(cell)}
                  </div>
                );
              })}
            </div>

            {/* Progress */}
            <div className="mine-progress">
              {openedCount} / {totalSafe}
            </div>

            {/* Game Over overlay */}
            {phase === "gameover" && (
              <div className="game-overlay">
                <div className="mine-result">
                  <h2 className="mine-result-title">GAME OVER</h2>
                  <div className="mine-result-stats">
                    <div>
                      到達ステージ: <strong>{stage}</strong>
                    </div>
                    <div>
                      タイム: <strong>{fmt(elapsed)}</strong>
                    </div>
                    <div className="game-hiscore">ベストステージ: {best}</div>
                  </div>
                  <div className="mine-result-actions">
                    <button className="game-btn" onClick={startGame}>
                      RETRY
                    </button>
                    <button
                      className="game-btn mine-btn-secondary"
                      onClick={toSettings}
                    >
                      SETTINGS
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </GameShell>
  );
};

export default App;
