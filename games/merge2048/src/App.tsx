import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { useAudio, useHighScore, GameShell } from "../../../src/shared";

// ─── 型 ─────────────────────────────────────────────────────────────────────

type Board = number[][];
type Direction = "left" | "right" | "up" | "down";
type GameMode = "classic" | "endless";
type GamePhase = "menu" | "playing";

interface Settings {
  boardSize: 3 | 4 | 5;
  winValue: 512 | 1024 | 2048 | 4096;
  gameMode: GameMode;
}

interface PopupScore {
  id: number;
  points: number;
  row: number;
  col: number;
}

// ─── 設定の永続化 ───────────────────────────────────────────────────────────

const SETTINGS_KEY = "merge2048_settings";
const DEFAULT_SETTINGS: Settings = {
  boardSize: 4,
  winValue: 2048,
  gameMode: "classic",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── タイル色テーブル ─────────────────────────────────────────────────────────

const TILE_PALETTE: Partial<Record<number, readonly [string, string]>> = {
  2: ["#eee4da", "#776e65"],
  4: ["#ede0c8", "#776e65"],
  8: ["#f2b179", "#f9f6f2"],
  16: ["#f59563", "#f9f6f2"],
  32: ["#f67c5f", "#f9f6f2"],
  64: ["#f65e3b", "#f9f6f2"],
  128: ["#edcf72", "#f9f6f2"],
  256: ["#edcc61", "#f9f6f2"],
  512: ["#edc850", "#f9f6f2"],
  1024: ["#edc53f", "#f9f6f2"],
  2048: ["#edc22e", "#f9f6f2"],
};

function getTileStyle(value: number): React.CSSProperties {
  const entry = TILE_PALETTE[value];
  if (entry) return { backgroundColor: entry[0], color: entry[1] };
  const hue = 270 + Math.log2(value) * 8;
  return { background: `hsl(${hue}deg 65% 52%)`, color: "#f9f6f2" };
}

function tileFontClass(value: number): string {
  const digits = value.toString().length;
  if (digits <= 2) return "tile-font-lg";
  if (digits === 3) return "tile-font-md";
  if (digits === 4) return "tile-font-sm";
  return "tile-font-xs";
}

// ─── ボードロジック ──────────────────────────────────────────────────────────

function emptyBoard(size: number): Board {
  return Array.from({ length: size }, () => new Array<number>(size).fill(0));
}

function getEmptyCells(board: Board): Array<[number, number]> {
  const size = board.length;
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (board[r][c] === 0) cells.push([r, c]);
  return cells;
}

function spawnTile(board: Board): {
  board: Board;
  pos: [number, number] | null;
} {
  const empty = getEmptyCells(board);
  if (!empty.length) return { board, pos: null };
  const idx = Math.floor(Math.random() * empty.length);
  const cell = empty[idx];
  if (!cell) return { board, pos: null };
  const [r, c] = cell;
  const nb = board.map((row) => [...row]);
  nb[r][c] = Math.random() < 0.9 ? 2 : 4;
  return { board: nb, pos: [r, c] };
}

interface SlideResult {
  board: Board;
  scoreGained: number;
  mergeCount: number;
  mergedCells: Array<[number, number]>;
  changed: boolean;
}

function slideRowLeft(row: number[]): {
  row: number[];
  score: number;
  mergeIndices: number[];
  mergeCount: number;
} {
  const nz = row.filter((v) => v !== 0);
  const result: number[] = [];
  const mergeIndices: number[] = [];
  let score = 0;
  let mergeCount = 0;
  let i = 0;
  while (i < nz.length) {
    if (i + 1 < nz.length && nz[i] === nz[i + 1]) {
      const val = nz[i]! * 2;
      result.push(val);
      mergeIndices.push(result.length - 1);
      score += val;
      mergeCount++;
      i += 2;
    } else {
      result.push(nz[i]!);
      i++;
    }
  }
  while (result.length < row.length) result.push(0);
  return { row: result, score, mergeIndices, mergeCount };
}

function doSlideLeft(board: Board): SlideResult {
  let scoreGained = 0;
  let mergeCount = 0;
  const mergedCells: Array<[number, number]> = [];
  let changed = false;

  const newBoard = board.map((row, r) => {
    const res = slideRowLeft(row);
    if (res.row.some((v, i) => v !== row[i])) changed = true;
    scoreGained += res.score;
    mergeCount += res.mergeCount;
    res.mergeIndices.forEach((c) => mergedCells.push([r, c]));
    return res.row;
  });

  return { board: newBoard, scoreGained, mergeCount, mergedCells, changed };
}

function transpose(board: Board): Board {
  const size = board.length;
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => board[c]![r]!),
  );
}

function reverseRows(board: Board): Board {
  return board.map((row) => [...row].reverse());
}

function applySlide(board: Board, dir: Direction): SlideResult {
  const size = board.length;
  switch (dir) {
    case "left": {
      return doSlideLeft(board);
    }
    case "right": {
      const rev = reverseRows(board);
      const res = doSlideLeft(rev);
      return {
        ...res,
        board: reverseRows(res.board),
        mergedCells: res.mergedCells.map(([r, c]) => [r, size - 1 - c]),
      };
    }
    case "up": {
      const tr = transpose(board);
      const res = doSlideLeft(tr);
      return {
        ...res,
        board: transpose(res.board),
        mergedCells: res.mergedCells.map(([r, c]) => [c, r]),
      };
    }
    case "down": {
      const tr = reverseRows(transpose(board));
      const res = doSlideLeft(tr);
      return {
        ...res,
        board: transpose(reverseRows(res.board)),
        mergedCells: res.mergedCells.map(([r, c]) => [c, size - 1 - r]),
      };
    }
  }
}

function canMove(board: Board): boolean {
  const size = board.length;
  if (getEmptyCells(board).length > 0) return true;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (c + 1 < size && board[r]![c] === board[r]![c + 1]) return true;
      if (r + 1 < size && board[r]![c] === board[r + 1]![c]) return true;
    }
  return false;
}

function hasWon(board: Board, winValue: number): boolean {
  return board.some((row) => row.some((v) => v >= winValue));
}

// ─── ID カウンター ────────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId(): number {
  return _idCounter++;
}

// ─── 設定ボタングループ ──────────────────────────────────────────────────────

function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="option-group">
      <div className="option-label">{label}</div>
      <div className="option-buttons">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            className={`option-btn ${value === opt.value ? "option-active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── コンポーネント ──────────────────────────────────────────────────────────

export default function App() {
  const { playTone, playArpeggio } = useAudio();
  const { best: bestScore, update: updateBestScore } =
    useHighScore("merge2048");

  const [phase, setPhase] = useState<GamePhase>("menu");
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const [board, setBoard] = useState<Board>(() => emptyBoard(4));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboVisible, setComboVisible] = useState(false);
  const [mergedCells, setMergedCells] = useState<Set<string>>(new Set());
  const [newCell, setNewCell] = useState<string | null>(null);
  const [popups, setPopups] = useState<PopupScore[]>([]);

  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // ゲームリセット
  const initGame = useCallback(() => {
    const sz = settings.boardSize;
    const r1 = spawnTile(emptyBoard(sz));
    const r2 = spawnTile(r1.board);
    setBoard(r2.board);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setCombo(0);
    setComboVisible(false);
    setMergedCells(new Set());
    setNewCell(null);
    setPopups([]);
  }, [settings.boardSize]);

  const startGame = useCallback(() => {
    saveSettings(settings);
    initGame();
    setPhase("playing");
  }, [settings, initGame]);

  const backToMenu = useCallback(() => {
    setPhase("menu");
  }, []);

  // 移動
  const move = useCallback(
    (dir: Direction) => {
      if (gameOver || (won && !keepPlaying)) return;

      const result = applySlide(board, dir);
      if (!result.changed) return;

      const { board: slid, scoreGained, mergeCount, mergedCells: mc } = result;
      const { board: next, pos: newPos } = spawnTile(slid);

      setBoard(next);

      const newScore = score + scoreGained;
      setScore(newScore);
      updateBestScore(newScore);

      // アニメーション: 合体セル + 新タイル
      const mcSet = new Set(mc.map(([r, c]) => `${r}-${c}`));
      setMergedCells(mcSet);
      if (newPos) setNewCell(`${newPos[0]}-${newPos[1]}`);
      setTimeout(() => {
        setMergedCells(new Set());
        setNewCell(null);
      }, 280);

      // スコアポップアップ
      if (scoreGained > 0) {
        const first = mc[0];
        if (first) {
          const [pr, pc] = first;
          const pid = nextId();
          setPopups((prev) => [
            ...prev,
            { id: pid, points: scoreGained, row: pr, col: pc },
          ]);
          setTimeout(
            () => setPopups((prev) => prev.filter((p) => p.id !== pid)),
            1000,
          );
        }
      }

      // コンボ
      if (mergeCount > 1) {
        setCombo(mergeCount);
        setComboVisible(true);
        if (comboTimerRef.current !== null) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => setComboVisible(false), 1600);
      }

      // 効果音
      if (scoreGained > 0) {
        const maxVal = mc.reduce<number>(
          (m, [r, c]) => Math.max(m, next[r]?.[c] ?? 2),
          2,
        );
        const freq = 180 + Math.log2(maxVal) * 55;
        playTone(freq, 0.14, "sine", 0.18);
      }

      // 勝利 / ゲームオーバー判定
      if (!won && hasWon(next, settings.winValue)) {
        setWon(true);
        if (settings.gameMode === "endless") {
          setKeepPlaying(true);
        }
        playArpeggio([523, 659, 784, 1047, 1319], 0.38, "sine", 0.22, 0.13);
      } else if (!canMove(next)) {
        setGameOver(true);
        playArpeggio([440, 370, 311, 261], 0.32, "sawtooth", 0.14, 0.22);
      }
    },
    [
      board,
      score,
      gameOver,
      won,
      keepPlaying,
      settings.winValue,
      settings.gameMode,
      updateBestScore,
      playTone,
      playArpeggio,
    ],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const MAP: Partial<Record<string, Direction>> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const dir = MAP[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  // タッチ
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  };

  // ─── メニュー画面 ──────────────────────────────────────────────────────────

  if (phase === "menu") {
    return (
      <GameShell title="Merge 2048" gameId="merge2048">
        <div className="app">
          <div className="menu">
            <h1 className="menu-title">Merge 2048</h1>
            <p className="menu-sub">タイルをスライドして合体させよう</p>

            <div className="settings-panel">
              <OptionGroup<number>
                label="ボードサイズ"
                options={[
                  { value: 3, label: "3×3" },
                  { value: 4, label: "4×4" },
                  { value: 5, label: "5×5" },
                ]}
                value={settings.boardSize}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    boardSize: v as Settings["boardSize"],
                  }))
                }
              />
              <OptionGroup<number>
                label="目標値"
                options={[
                  { value: 512, label: "512" },
                  { value: 1024, label: "1024" },
                  { value: 2048, label: "2048" },
                  { value: 4096, label: "4096" },
                ]}
                value={settings.winValue}
                onChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    winValue: v as Settings["winValue"],
                  }))
                }
              />
              <OptionGroup<string>
                label="ゲームモード"
                options={[
                  { value: "classic", label: "CLASSIC" },
                  { value: "endless", label: "ENDLESS" },
                ]}
                value={settings.gameMode}
                onChange={(v) =>
                  setSettings((s) => ({ ...s, gameMode: v as GameMode }))
                }
              />
            </div>

            <button className="start-btn" onClick={startGame}>
              ゲーム開始
            </button>

            {bestScore > 0 && (
              <div className="menu-best">ハイスコア: {bestScore}</div>
            )}
          </div>
        </div>
      </GameShell>
    );
  }

  // ─── プレイ画面 ────────────────────────────────────────────────────────────

  const gridSize = settings.boardSize;
  const showWinOverlay = won && !keepPlaying;
  const showOverlay = gameOver || showWinOverlay;
  const gridRepeat = `repeat(${gridSize}, 1fr)`;

  return (
    <GameShell title="Merge 2048" gameId="merge2048">
      <div
        className="app"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ヘッダー */}
        <header className="header">
          <h1 className="title">Merge 2048</h1>
          <div className="header-right">
            <div className="scores">
              <div className="score-box">
                <span className="score-label">SCORE</span>
                <span className="score-value">{score}</span>
              </div>
              <div className="score-box">
                <span className="score-label">BEST</span>
                <span className="score-value">{bestScore}</span>
              </div>
            </div>
            <button className="new-game-btn" onClick={initGame}>
              New Game
            </button>
            <button
              className="settings-btn"
              onClick={backToMenu}
              title="設定"
            >
              ⚙
            </button>
          </div>
        </header>

        {settings.gameMode === "endless" && (
          <div className="mode-badge">ENDLESS</div>
        )}

        {/* コンボバッジ */}
        <div
          className={`combo-badge ${comboVisible && combo > 1 ? "combo-visible" : ""}`}
        >
          COMBO×{combo}
        </div>

        {/* グリッド */}
        <div className="grid-wrapper">
          {/* 背景セル */}
          <div
            className="grid-bg"
            style={{
              gridTemplateColumns: gridRepeat,
              gridTemplateRows: gridRepeat,
            }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, i) => (
              <div key={i} className="cell-bg" />
            ))}
          </div>

          {/* タイル */}
          <div
            className="grid-tiles"
            style={{
              gridTemplateColumns: gridRepeat,
              gridTemplateRows: gridRepeat,
            }}
          >
            {board.map((row, r) =>
              row.map((value, c) => {
                if (value === 0) return null;
                const key = `${r}-${c}`;
                const isMerged = mergedCells.has(key);
                const isNew = newCell === key;
                const isWinTile = won && value >= settings.winValue;
                return (
                  <div
                    key={key}
                    className={[
                      "tile",
                      tileFontClass(value),
                      isMerged ? "tile-merged" : "",
                      isNew ? "tile-new" : "",
                      isWinTile ? "tile-win" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        ...getTileStyle(value),
                        "--r": r,
                        "--c": c,
                      } as React.CSSProperties
                    }
                  >
                    {value}
                    {/* スコアポップアップ */}
                    {popups
                      .filter((p) => p.row === r && p.col === c)
                      .map((p) => (
                        <span key={p.id} className="score-popup">
                          +{p.points}
                        </span>
                      ))}
                  </div>
                );
              }),
            )}
          </div>

          {/* オーバーレイ */}
          {showOverlay && (
            <div
              className={`overlay ${showWinOverlay ? "overlay-win" : "overlay-lose"}`}
            >
              <div className="overlay-content">
                {showWinOverlay ? (
                  <>
                    <div className="overlay-emoji">🎉</div>
                    <div className="overlay-title">
                      {settings.winValue} 達成！
                    </div>
                    <div className="overlay-sub">スコア: {score}</div>
                    <button
                      className="overlay-btn btn-continue"
                      onClick={() => setKeepPlaying(true)}
                    >
                      続けてプレイ
                    </button>
                    <button className="overlay-btn" onClick={initGame}>
                      New Game
                    </button>
                    <button
                      className="overlay-btn btn-menu"
                      onClick={backToMenu}
                    >
                      設定変更
                    </button>
                  </>
                ) : (
                  <>
                    <div className="overlay-title">Game Over</div>
                    <div className="overlay-sub">スコア: {score}</div>
                    <button className="overlay-btn" onClick={initGame}>
                      もう一度
                    </button>
                    <button
                      className="overlay-btn btn-menu"
                      onClick={backToMenu}
                    >
                      設定変更
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="hint">矢印キー または スワイプで操作</p>
      </div>
    </GameShell>
  );
}
