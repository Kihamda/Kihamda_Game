import { useState, useEffect, useCallback, useRef } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ParticleLayer, useAudio, useParticles, ScorePopup } from "@shared";
import type { PopupVariant } from "@shared";
import "./App.css";

// ---------- 型定義 ----------
type Cell = 0 | 1; // 0: 通路, 1: 壁
type Position = { x: number; y: number };
type Direction = { dx: number; dy: number };
type MazeSize = "small" | "medium" | "large";
type GamePhase = "before" | "in_progress" | "after";

// ---------- サイズ設定 ----------
const SIZE_CONFIG: Record<MazeSize, { width: number; height: number }> = {
  small: { width: 15, height: 11 },
  medium: { width: 21, height: 15 },
  large: { width: 31, height: 21 },
};

const CELL_SIZE = 24;
const DIRECTIONS: Direction[] = [
  { dx: 0, dy: -2 },
  { dx: 2, dy: 0 },
  { dx: 0, dy: 2 },
  { dx: -2, dy: 0 },
];

// ---------- 迷路生成 (深さ優先探索) ----------
function generateMaze(width: number, height: number): Cell[][] {
  // 全セルを壁で初期化
  const maze: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 1 as Cell)
  );

  // Fisher-Yates シャッフル
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // 再帰的に壁を掘る
  const carve = (x: number, y: number) => {
    maze[y][x] = 0;

    for (const { dx, dy } of shuffle(DIRECTIONS)) {
      const nx = x + dx;
      const ny = y + dy;
      const mx = x + dx / 2;
      const my = y + dy / 2;

      if (
        nx > 0 &&
        nx < width - 1 &&
        ny > 0 &&
        ny < height - 1 &&
        maze[ny][nx] === 1
      ) {
        maze[my][mx] = 0;
        carve(nx, ny);
      }
    }
  };

  // スタート位置から掘り始める
  carve(1, 1);
  return maze;
}

// ---------- ゴール探索 (最遠点を探す) ----------
function findFarthestPoint(
  maze: Cell[][],
  start: Position
): Position {
  const height = maze.length;
  const width = maze[0].length;
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(false)
  );

  const queue: { pos: Position; dist: number }[] = [{ pos: start, dist: 0 }];
  visited[start.y][start.x] = true;

  let farthest = start;
  let maxDist = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.dist > maxDist) {
      maxDist = current.dist;
      farthest = current.pos;
    }

    for (const { dx, dy } of [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ]) {
      const nx = current.pos.x + dx;
      const ny = current.pos.y + dy;
      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[ny][nx] &&
        maze[ny][nx] === 0
      ) {
        visited[ny][nx] = true;
        queue.push({ pos: { x: nx, y: ny }, dist: current.dist + 1 });
      }
    }
  }

  return farthest;
}

// ---------- 初期状態生成 ----------
function createInitialState(mazeSize: MazeSize) {
  const { width, height } = SIZE_CONFIG[mazeSize];
  const maze = generateMaze(width, height);
  const start: Position = { x: 1, y: 1 };
  const goal = findFarthestPoint(maze, start);
  return { maze, goal };
}

// ---------- チェックポイント生成 ----------
function generateCheckpoints(
  maze: Cell[][],
  start: Position,
  goal: Position,
  count: number
): Position[] {
  const height = maze.length;
  const width = maze[0].length;
  const candidates: Position[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        maze[y][x] === 0 &&
        !(x === start.x && y === start.y) &&
        !(x === goal.x && y === goal.y)
      ) {
        candidates.push({ x, y });
      }
    }
  }

  // ランダムに選択
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ---------- メインコンポーネント ----------
export default function App() {
  const [size, setSize] = useState<MazeSize>("medium");
  const [{ maze, goal }, setMazeState] = useState(() => createInitialState("medium"));
  const [player, setPlayer] = useState<Position>({ x: 1, y: 1 });
  const [phase, setPhase] = useState<GamePhase>("before");
  const [moves, setMoves] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // チェックポイント
  const [checkpoints, setCheckpoints] = useState<Position[]>([]);
  const [collectedCheckpoints, setCollectedCheckpoints] = useState<Set<string>>(new Set());

  // ScorePopup state
  const [popup, setPopup] = useState<{
    text: string;
    variant: PopupVariant;
    key: number;
  } | null>(null);

  const { playTone } = useAudio();
  const { particles, sparkle, confetti } = useParticles();

  const playMove = useCallback(() => {
    playTone(400, 0.03, "sine");
  }, [playTone]);

  const playGoal = useCallback(() => {
    playTone(880, 0.3, "sine");
  }, [playTone]);

  // 迷路初期化
  const initMaze = useCallback((mazeSize: MazeSize) => {
    const newState = createInitialState(mazeSize);
    setMazeState(newState);
    setPlayer({ x: 1, y: 1 });
    setMoves(0);
    setElapsedTime(0);
    setPhase("before");
    setPopup(null);

    // チェックポイント生成 (サイズに応じて数を変える)
    const checkpointCount = mazeSize === "small" ? 2 : mazeSize === "medium" ? 3 : 5;
    setCheckpoints(
      generateCheckpoints(newState.maze, { x: 1, y: 1 }, newState.goal, checkpointCount)
    );
    setCollectedCheckpoints(new Set());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // タイマー
  useEffect(() => {
    if (phase === "in_progress") {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // 移動処理
  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (phase === "after") return;

      setPlayer((prev) => {
        const nx = prev.x + dx;
        const ny = prev.y + dy;

        if (
          nx >= 0 &&
          nx < maze[0]?.length &&
          ny >= 0 &&
          ny < maze.length &&
          maze[ny][nx] === 0
        ) {
          // ゲーム開始
          if (phase === "before") {
            setPhase("in_progress");
          }
          setMoves((m) => m + 1);
          playMove();
          sparkle(nx * CELL_SIZE + CELL_SIZE / 2, ny * CELL_SIZE + CELL_SIZE / 2);

          // チェックポイント判定
          const checkpointKey = `${nx},${ny}`;
          const isCheckpoint = checkpoints.some((cp) => cp.x === nx && cp.y === ny);
          if (isCheckpoint && !collectedCheckpoints.has(checkpointKey)) {
            setCollectedCheckpoints((prev) => new Set(prev).add(checkpointKey));
            setPopup({
              text: "⭐ チェックポイント!",
              variant: "bonus",
              key: Date.now(),
            });
            playTone(660, 0.15, "sine");
          }

          // ゴール判定
          if (nx === goal.x && ny === goal.y) {
            setPhase("after");
            confetti();
            playGoal();

            // 快速クリア判定 (サイズに応じたタイム)
            const fastTimes: Record<MazeSize, number> = {
              small: 15,
              medium: 30,
              large: 60,
            };
            const isFast = elapsedTime < fastTimes[size];

            if (isFast) {
              setPopup({
                text: "⚡ 超高速クリア!",
                variant: "critical",
                key: Date.now(),
              });
            } else {
              setPopup({
                text: "🎉 ゴール!",
                variant: "level",
                key: Date.now(),
              });
            }
          }

          return { x: nx, y: ny };
        }
        return prev;
      });
    },
    [maze, goal, phase, size, elapsedTime, checkpoints, collectedCheckpoints, playMove, playGoal, playTone, sparkle, confetti]
  );

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [movePlayer]);

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const mazeWidth = maze[0]?.length ?? 0;
  const mazeHeight = maze.length;

  return (
    <GameShell gameId="mazerun" layout="immersive">
      <div className="mazerun">
        <header className="mazerun-header">
          <h1>迷路脱出</h1>
          <div className="mazerun-stats">
            <span>⏱ {formatTime(elapsedTime)}</span>
            <span>👣 {moves}歩</span>
          </div>
        </header>

        <div className="mazerun-controls">
          <label>
            サイズ:
            <select
              value={size}
              onChange={(e) => setSize(e.target.value as MazeSize)}
              disabled={phase === "in_progress"}
            >
              <option value="small">Small (15×11)</option>
              <option value="medium">Medium (21×15)</option>
              <option value="large">Large (31×21)</option>
            </select>
          </label>
          <button onClick={() => initMaze(size)}>新しい迷路</button>
        </div>

        <div
          className="mazerun-board"
          style={{
            width: mazeWidth * CELL_SIZE,
            height: mazeHeight * CELL_SIZE,
          }}
        >
          {maze.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = player.x === x && player.y === y;
              const isGoal = goal.x === x && goal.y === y;
              const isStart = x === 1 && y === 1;
              const isCheckpoint = checkpoints.some((cp) => cp.x === x && cp.y === y);
              const isCollected = collectedCheckpoints.has(`${x},${y}`);

              let cellClass = "mazerun-cell";
              if (cell === 1) cellClass += " mazerun-cell--wall";
              if (isStart && !isPlayer) cellClass += " mazerun-cell--start";
              if (isGoal && !isPlayer) cellClass += " mazerun-cell--goal";
              if (isCheckpoint && !isCollected && !isPlayer) cellClass += " mazerun-cell--checkpoint";
              if (isPlayer) cellClass += " mazerun-cell--player";

              return (
                <div
                  key={`${x}-${y}`}
                  className={cellClass}
                  style={{
                    left: x * CELL_SIZE,
                    top: y * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                />
              );
            })
          )}
        </div>

        {phase === "before" && (
          <p className="mazerun-hint">
            矢印キー or WASD で移動。緑→赤を目指せ！
          </p>
        )}

        {phase === "after" && (
          <div className="mazerun-result">
            <h2>🎉 ゴール！</h2>
            <p>タイム: {formatTime(elapsedTime)}</p>
            <p>手数: {moves}歩</p>
            <button onClick={() => initMaze(size)}>もう一度</button>
          </div>
        )}

        {/* モバイル用コントローラー */}
        <div className="mazerun-dpad">
          <button
            className="mazerun-dpad-btn mazerun-dpad-up"
            onClick={() => movePlayer(0, -1)}
            aria-label="上"
          >
            ▲
          </button>
          <button
            className="mazerun-dpad-btn mazerun-dpad-left"
            onClick={() => movePlayer(-1, 0)}
            aria-label="左"
          >
            ◀
          </button>
          <button
            className="mazerun-dpad-btn mazerun-dpad-right"
            onClick={() => movePlayer(1, 0)}
            aria-label="右"
          >
            ▶
          </button>
          <button
            className="mazerun-dpad-btn mazerun-dpad-down"
            onClick={() => movePlayer(0, 1)}
            aria-label="下"
          >
            ▼
          </button>
        </div>
        <ScorePopup
          text={popup?.text ?? null}
          popupKey={popup?.key}
          variant={popup?.variant}
          size="lg"
        />
        <ParticleLayer particles={particles} />
      </div>
    </GameShell>
  );
}
