import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { useAudio, GameShell, useHighScore } from "../../../src/shared";

type Player = "red" | "yellow";
type Cell = Player | null;
type Phase = "intro" | "playing" | "finished";

type WinLineCell = {
  row: number;
  col: number;
};

const ROWS = 6;
const COLS = 7;
const CONNECT = 4;

const PLAYER_LABEL: Record<Player, string> = {
  red: "プレイヤー1",
  yellow: "プレイヤー2",
};

const PLAYER_COLOR_CLASS: Record<Player, string> = {
  red: "red",
  yellow: "yellow",
};

const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
] as const;

// ---- End constants ----

const createEmptyBoard = (): Cell[][] =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));

const isInsideBoard = (row: number, col: number) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS;

const getDropRow = (board: Cell[][], col: number): number | null => {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][col] === null) {
      return row;
    }
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
): WinLineCell[] => {
  const line: WinLineCell[] = [{ row: startRow, col: startCol }];

  let row = startRow + dr;
  let col = startCol + dc;
  while (isInsideBoard(row, col) && board[row][col] === player) {
    line.push({ row, col });
    row += dr;
    col += dc;
  }

  row = startRow - dr;
  col = startCol - dc;
  while (isInsideBoard(row, col) && board[row][col] === player) {
    line.unshift({ row, col });
    row -= dr;
    col -= dc;
  }

  return line;
};

const findWinLine = (
  board: Cell[][],
  row: number,
  col: number,
  player: Player,
): WinLineCell[] | null => {
  for (const { dr, dc } of DIRECTIONS) {
    const line = collectDirection(board, row, col, player, dr, dc);
    if (line.length >= CONNECT) {
      return line.slice(0, CONNECT);
    }
  }
  return null;
};

const App = () => {
  const { playArpeggio, playTone } = useAudio();
  const { best: bestStreak, update: updateBestStreak } =
    useHighScore("gravityfour");

  const [phase, setPhase] = useState<Phase>("intro");
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>("red");
  const [winner, setWinner] = useState<Player | null>(null);
  const [moves, setMoves] = useState(0);
  const [winLine, setWinLine] = useState<WinLineCell[]>([]);

  // Effect states
  const [landingKey, setLandingKey] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);
  const [consecutiveWins, setConsecutiveWins] = useState(0);

  const isDraw = phase === "finished" && winner === null;

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

  const winCellSet = useMemo(() => {
    return new Set(winLine.map((cell) => `${cell.row}-${cell.col}`));
  }, [winLine]);

  const startGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer("red");
    setWinner(null);
    setMoves(0);
    setWinLine([]);
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
    const line = findWinLine(nextBoard, row, col, currentPlayer);

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
        setPopup(`🎉 ${PLAYER_LABEL[currentPlayer]} の勝利！`);
      }, 120);
      return;
    }

    if (nextMoves >= ROWS * COLS) {
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

    setCurrentPlayer((prev) => (prev === "red" ? "yellow" : "red"));
  };

  return (
    <GameShell title="Gravity Four">
      <main className="app">
        <section
          className={`panel${shaking ? " shake" : ""}`}
          onAnimationEnd={(e) => {
            if (e.animationName === "shake") setShaking(false);
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
              <li>縦 横 斜めのどれかで4つつながったら勝ち</li>
              <li>埋まって誰も4つ作れなければ引き分け</li>
            </ul>
          </div>

          {phase === "intro" && (
            <div className="introBlock">
              <p>先手はプレイヤー1 固定で開始</p>
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
                    手番 {PLAYER_LABEL[currentPlayer]}
                    <span
                      className={`chip ${PLAYER_COLOR_CLASS[currentPlayer]}`}
                    />
                  </>
                )}
                {phase === "finished" && winner && (
                  <>
                    勝者 {PLAYER_LABEL[winner]}
                    <span className={`chip ${PLAYER_COLOR_CLASS[winner]}`} />
                  </>
                )}
                {isDraw && <>引き分け 全マスが埋まった</>}
              </p>

              <div className="dropRow">
                {Array.from({ length: COLS }, (_, col) => (
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
              >
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`;
                    const isWinningCell = winCellSet.has(key);

                    return (
                      <div
                        key={key}
                        className={[
                          "cell",
                          cell ? PLAYER_COLOR_CLASS[cell] : "empty",
                          isWinningCell ? "winning" : "",
                          landingKey === key ? "land-anim" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="piece" />
                      </div>
                    );
                  }),
                )}
              </div>

              <div className="hud">
                <span>手数 {moves}</span>
                <span>先手 プレイヤー1</span>
                <span>目標 4連結</span>
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
