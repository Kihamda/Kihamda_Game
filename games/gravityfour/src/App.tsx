import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { useAudio, GameShell, useHighScore } from "../../../src/shared";

/* ---- Types ---- */
type Player = "p1" | "p2";
type Cell = Player | null;
type Phase = "intro" | "playing" | "finished";
type BoardSize = "small" | "normal" | "large";
type WinLineCell = { row: number; col: number };

interface BoardSizeConfig {
  rows: number;
  cols: number;
  label: string;
}

interface ColorPreset {
  id: string;
  label: string;
  color: string;
  light: string;
  dark: string;
}

interface GameSettings {
  boardSize: BoardSize;
  connectCount: number;
  player1Name: string;
  player2Name: string;
  player1ColorId: string;
  player2ColorId: string;
}

/* ---- Constants ---- */
const BOARD_SIZES: Record<BoardSize, BoardSizeConfig> = {
  small: { rows: 5, cols: 6, label: "SMALL (5×6)" },
  normal: { rows: 6, cols: 7, label: "NORMAL (6×7)" },
  large: { rows: 7, cols: 8, label: "LARGE (7×8)" },
};

const BOARD_SIZE_KEYS: BoardSize[] = ["small", "normal", "large"];
const CONNECT_OPTIONS = [3, 4, 5] as const;

const COLOR_PRESETS: ColorPreset[] = [
  { id: "red", label: "赤", color: "#ef4444", light: "#fca5a5", dark: "#b91c1c" },
  { id: "orange", label: "橙", color: "#f97316", light: "#fdba74", dark: "#c2410c" },
  { id: "yellow", label: "黄", color: "#facc15", light: "#fde68a", dark: "#ca8a04" },
  { id: "green", label: "緑", color: "#22c55e", light: "#86efac", dark: "#15803d" },
  { id: "cyan", label: "水", color: "#06b6d4", light: "#67e8f9", dark: "#0e7490" },
  { id: "blue", label: "青", color: "#3b82f6", light: "#93c5fd", dark: "#1d4ed8" },
  { id: "purple", label: "紫", color: "#a855f7", light: "#d8b4fe", dark: "#7e22ce" },
  { id: "pink", label: "桃", color: "#ec4899", light: "#f9a8d4", dark: "#be185d" },
];

const DEFAULT_SETTINGS: GameSettings = {
  boardSize: "normal",
  connectCount: 4,
  player1Name: "Player 1",
  player2Name: "Player 2",
  player1ColorId: "red",
  player2ColorId: "yellow",
};

const STORAGE_KEY = "gravityfour_settings";

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
] as const;

/* ---- Settings persistence ---- */
const isConnectValid = (c: number, size: BoardSize): boolean => {
  const { rows, cols } = BOARD_SIZES[size];
  return c < Math.min(rows, cols);
};

const clampConnect = (c: number, size: BoardSize): number => {
  const max = Math.min(BOARD_SIZES[size].rows, BOARD_SIZES[size].cols) - 1;
  return Math.min(c, max);
};

const loadSettings = (): GameSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const s = { ...DEFAULT_SETTINGS, ...parsed };
    if (!BOARD_SIZES[s.boardSize]) s.boardSize = DEFAULT_SETTINGS.boardSize;
    if (s.connectCount !== 3 && s.connectCount !== 4 && s.connectCount !== 5)
      s.connectCount = DEFAULT_SETTINGS.connectCount;
    if (!isConnectValid(s.connectCount, s.boardSize))
      s.connectCount = clampConnect(s.connectCount, s.boardSize);
    if (!COLOR_PRESETS.some((c) => c.id === s.player1ColorId))
      s.player1ColorId = DEFAULT_SETTINGS.player1ColorId;
    if (!COLOR_PRESETS.some((c) => c.id === s.player2ColorId))
      s.player2ColorId = DEFAULT_SETTINGS.player2ColorId;
    if (s.player1ColorId === s.player2ColorId) {
      s.player2ColorId = DEFAULT_SETTINGS.player2ColorId;
      if (s.player1ColorId === s.player2ColorId)
        s.player1ColorId = DEFAULT_SETTINGS.player1ColorId;
    }
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (s: GameSettings) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const getColorPreset = (id: string): ColorPreset =>
  COLOR_PRESETS.find((c) => c.id === id) ?? COLOR_PRESETS[0];

const pieceGradient = (p: ColorPreset) =>
  `radial-gradient(circle at 30% 30%, ${p.light}, ${p.dark} 70%)`;

/* ---- Game logic (parameterized) ---- */
const createEmptyBoard = (rows: number, cols: number): Cell[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

const isInsideBoard = (r: number, c: number, rows: number, cols: number) =>
  r >= 0 && r < rows && c >= 0 && c < cols;

const getDropRow = (board: Cell[][], col: number): number | null => {
  for (let r = board.length - 1; r >= 0; r -= 1) {
    if (board[r][col] === null) return r;
  }
  return null;
};

const collectDirection = (
  board: Cell[][],
  startRow: number,
  startCol: number,
  player: Player,
  dr: number,
  dc: number,
  rows: number,
  cols: number,
): WinLineCell[] => {
  const line: WinLineCell[] = [{ row: startRow, col: startCol }];
  let r = startRow + dr;
  let c = startCol + dc;
  while (isInsideBoard(r, c, rows, cols) && board[r][c] === player) {
    line.push({ row: r, col: c });
    r += dr;
    c += dc;
  }
  r = startRow - dr;
  c = startCol - dc;
  while (isInsideBoard(r, c, rows, cols) && board[r][c] === player) {
    line.unshift({ row: r, col: c });
    r -= dr;
    c -= dc;
  }
  return line;
};

const findWinLine = (
  board: Cell[][],
  row: number,
  col: number,
  player: Player,
  connect: number,
  rows: number,
  cols: number,
): WinLineCell[] | null => {
  for (const { dr, dc } of DIRECTIONS) {
    const line = collectDirection(board, row, col, player, dr, dc, rows, cols);
    if (line.length >= connect) return line.slice(0, connect);
  }
  return null;
};

/* ---- Component ---- */
const App = () => {
  const { playArpeggio, playTone } = useAudio();
  const { best: bestStreak, update: updateBestStreak } =
    useHighScore("gravityfour");

  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [phase, setPhase] = useState<Phase>("intro");
  const [board, setBoard] = useState<Cell[][]>(() =>
    createEmptyBoard(
      BOARD_SIZES[DEFAULT_SETTINGS.boardSize].rows,
      BOARD_SIZES[DEFAULT_SETTINGS.boardSize].cols,
    ),
  );
  const [gameConnect, setGameConnect] = useState(DEFAULT_SETTINGS.connectCount);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("p1");
  const [winner, setWinner] = useState<Player | null>(null);
  const [moves, setMoves] = useState(0);
  const [winLine, setWinLine] = useState<WinLineCell[]>([]);

  const [landingKey, setLandingKey] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [consecutiveWins, setConsecutiveWins] = useState(0);

  const p1Color = getColorPreset(settings.player1ColorId);
  const p2Color = getColorPreset(settings.player2ColorId);

  const playerLabel: Record<Player, string> = useMemo(
    () => ({
      p1: settings.player1Name || "Player 1",
      p2: settings.player2Name || "Player 2",
    }),
    [settings.player1Name, settings.player2Name],
  );

  const playerColor: Record<Player, ColorPreset> = useMemo(
    () => ({ p1: p1Color, p2: p2Color }),
    [p1Color, p2Color],
  );

  const isDraw = phase === "finished" && winner === null;

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.boardSize && !isConnectValid(next.connectCount, next.boardSize))
        next.connectCount = clampConnect(next.connectCount, next.boardSize);
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!landingKey) return;
    const t = setTimeout(() => setLandingKey(null), 600);
    return () => clearTimeout(t);
  }, [landingKey]);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 2800);
    return () => clearTimeout(t);
  }, [popup]);

  const winCellSet = useMemo(
    () => new Set(winLine.map((c) => `${c.row}-${c.col}`)),
    [winLine],
  );

  const startGame = () => {
    const { rows, cols } = BOARD_SIZES[settings.boardSize];
    setBoard(createEmptyBoard(rows, cols));
    setGameConnect(settings.connectCount);
    setCurrentPlayer("p1");
    setWinner(null);
    setMoves(0);
    setWinLine([]);
    setShaking(false);
    setPhase("playing");
  };

  const handleDrop = (col: number) => {
    if (phase !== "playing") return;
    const row = getDropRow(board, col);
    if (row === null) return;

    playTone(120, 0.15, "sine", 0.4);
    setLandingKey(`${row}-${col}`);

    const nextBoard = board.map((line) => [...line]);
    nextBoard[row][col] = currentPlayer;
    const nextMoves = moves + 1;

    const bRows = board.length;
    const bCols = board[0].length;
    const line = findWinLine(
      nextBoard,
      row,
      col,
      currentPlayer,
      gameConnect,
      bRows,
      bCols,
    );

    setBoard(nextBoard);
    setMoves(nextMoves);

    if (line) {
      setWinner(currentPlayer);
      setWinLine(line);
      setPhase("finished");
      const newStreak = consecutiveWins + 1;
      setConsecutiveWins(newStreak);
      updateBestStreak(newStreak);
      setTimeout(() => {
        playArpeggio([440, 554, 659, 880], 0.22, "triangle", 0.3, 0.13);
        setShaking(true);
        setPopup(`🎉 ${playerLabel[currentPlayer]} の勝利！`);
      }, 120);
      return;
    }

    if (nextMoves >= bRows * bCols) {
      setWinner(null);
      setWinLine([]);
      setPhase("finished");
      setConsecutiveWins(0);
      setTimeout(() => {
        playTone(220, 0.5, "square", 0.15);
        setShaking(true);
        setPopup("引き分け！");
      }, 120);
      return;
    }

    setCurrentPlayer((prev) => (prev === "p1" ? "p2" : "p1"));
  };

  const previewConnect =
    phase === "intro" ? settings.connectCount : gameConnect;
  const playCols =
    phase === "intro"
      ? BOARD_SIZES[settings.boardSize].cols
      : (board[0]?.length ?? BOARD_SIZES[settings.boardSize].cols);

  return (
    <GameShell title="Gravity Four" gameId="gravityfour">
      <main className="app">
        <section
          className={`panel${shaking ? " shake" : ""}`}
          onAnimationEnd={(e) => {
            if (e.animationName === "game-shake") setShaking(false);
          }}
        >
          <h1>Gravity Four</h1>
          <p className="subtitle">ローカル2人で遊ぶ重力四目並べ</p>

          {consecutiveWins >= 2 && (
            <div className="combo-badge">🔥 {consecutiveWins}連勝中！</div>
          )}
          {bestStreak >= 2 && (
            <div className="combo-badge" style={{ opacity: 0.6, fontSize: 13 }}>
              🏆 最長記録: {bestStreak}連勝
            </div>
          )}

          {popup && (
            <div key={popup} className="win-popup">
              {popup}
            </div>
          )}

          <div className="ruleBox">
            <h2>ルール</h2>
            <ul>
              <li>交互に列を選んでコインを落とす</li>
              <li>
                縦 横 斜めのどれかで{previewConnect}つつながったら勝ち
              </li>
              <li>
                埋まって誰も{previewConnect}つ作れなければ引き分け
              </li>
            </ul>
          </div>

          {phase === "intro" && (
            <div className="introBlock">
              {/* Board size */}
              <div className="setting-group">
                <span className="setting-label">ボードサイズ</span>
                <div className="btn-group">
                  {BOARD_SIZE_KEYS.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`btn-option${settings.boardSize === size ? " active" : ""}`}
                      onClick={() => updateSettings({ boardSize: size })}
                    >
                      {BOARD_SIZES[size].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Connect count */}
              <div className="setting-group">
                <span className="setting-label">勝利ライン数</span>
                <div className="btn-group">
                  {CONNECT_OPTIONS.map((n) => {
                    const valid = isConnectValid(n, settings.boardSize);
                    return (
                      <button
                        key={n}
                        type="button"
                        className={`btn-option${settings.connectCount === n ? " active" : ""}`}
                        disabled={!valid}
                        onClick={() => updateSettings({ connectCount: n })}
                      >
                        {n}目
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Player 1 */}
              <div className="setting-group player-setting">
                <span className="setting-label">
                  <span
                    className="setting-chip"
                    style={{ background: p1Color.color }}
                  />
                  プレイヤー1
                </span>
                <input
                  type="text"
                  className="name-input"
                  maxLength={16}
                  placeholder="Player 1"
                  value={settings.player1Name}
                  onChange={(e) =>
                    updateSettings({ player1Name: e.target.value })
                  }
                />
                <div className="color-palette">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`color-swatch${settings.player1ColorId === preset.id ? " selected" : ""}${settings.player2ColorId === preset.id ? " taken" : ""}`}
                      style={{ background: preset.color }}
                      disabled={settings.player2ColorId === preset.id}
                      title={preset.label}
                      onClick={() =>
                        updateSettings({ player1ColorId: preset.id })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Player 2 */}
              <div className="setting-group player-setting">
                <span className="setting-label">
                  <span
                    className="setting-chip"
                    style={{ background: p2Color.color }}
                  />
                  プレイヤー2
                </span>
                <input
                  type="text"
                  className="name-input"
                  maxLength={16}
                  placeholder="Player 2"
                  value={settings.player2Name}
                  onChange={(e) =>
                    updateSettings({ player2Name: e.target.value })
                  }
                />
                <div className="color-palette">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`color-swatch${settings.player2ColorId === preset.id ? " selected" : ""}${settings.player1ColorId === preset.id ? " taken" : ""}`}
                      style={{ background: preset.color }}
                      disabled={settings.player1ColorId === preset.id}
                      title={preset.label}
                      onClick={() =>
                        updateSettings({ player2ColorId: preset.id })
                      }
                    />
                  ))}
                </div>
              </div>

              <p className="setting-hint">
                先手は{settings.player1Name || "Player 1"}固定で開始
              </p>
              <button className="action" type="button" onClick={startGame}>
                対戦開始
              </button>
            </div>
          )}

          {phase !== "intro" && (
            <>
              <p className="statusText">
                {phase === "playing" && (
                  <>
                    手番 {playerLabel[currentPlayer]}
                    <span
                      className="chip"
                      style={{
                        background: playerColor[currentPlayer].color,
                      }}
                    />
                  </>
                )}
                {phase === "finished" && winner && (
                  <>
                    勝者 {playerLabel[winner]}
                    <span
                      className="chip"
                      style={{ background: playerColor[winner].color }}
                    />
                  </>
                )}
                {isDraw && <>引き分け 全マスが埋まった</>}
              </p>

              <div
                className="dropRow"
                style={{
                  gridTemplateColumns: `repeat(${playCols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: playCols }, (_, col) => (
                  <button
                    key={`drop-${col}`}
                    className="dropButton"
                    type="button"
                    onClick={() => handleDrop(col)}
                    disabled={
                      phase !== "playing" || getDropRow(board, col) === null
                    }
                  >
                    ↓
                  </button>
                ))}
              </div>

              <div
                className="board"
                role="grid"
                aria-label="gravity four board"
                style={{
                  gridTemplateColumns: `repeat(${playCols}, minmax(0, 1fr))`,
                }}
              >
                {board.map((rowArr, ri) =>
                  rowArr.map((cell, ci) => {
                    const key = `${ri}-${ci}`;
                    const isWin = winCellSet.has(key);
                    const cp = cell ? playerColor[cell] : null;
                    return (
                      <div
                        key={key}
                        className={[
                          "cell",
                          cell ? "filled" : "empty",
                          isWin ? "winning" : "",
                          landingKey === key ? "land-anim" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span
                          className="piece"
                          style={
                            cp
                              ? { background: pieceGradient(cp) }
                              : undefined
                          }
                        />
                      </div>
                    );
                  }),
                )}
              </div>

              <div className="hud">
                <span>手数 {moves}</span>
                <span>先手 {playerLabel.p1}</span>
                <span>目標 {gameConnect}連結</span>
              </div>

              <div className="actionRow">
                <button className="action" type="button" onClick={startGame}>
                  もう一戦
                </button>
                <button
                  className="action secondary"
                  type="button"
                  onClick={() => setPhase("intro")}
                >
                  タイトルへ
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </GameShell>
  );
};

export default App;
