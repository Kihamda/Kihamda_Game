import type {
  GameState,
  Brick,
  Ball,
  Paddle,
  PowerUpItem,
  Laser,
  PowerUpType,
} from "./types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_WIDTH_EXPANDED,
  PADDLE_HEIGHT,
  PADDLE_Y,
  PADDLE_EXPAND_DURATION,
  BALL_RADIUS,
  BALL_SPEED,
  MAX_BALLS,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_OFFSET_TOP,
  BRICK_OFFSET_LEFT,
  BRICK_COLORS,
  POWERUP_WIDTH,
  POWERUP_HEIGHT,
  POWERUP_SPEED,
  POWERUP_DROP_CHANCE,
  LASER_WIDTH,
  LASER_HEIGHT,
  LASER_SPEED,
  LASER_DURATION,
  INITIAL_LIVES,
  MAX_LIVES,
  COMBO_TIMEOUT,
  SCORE_BASE,
  SCORE_COMBO_MULTIPLIER,
  STAGE_CONFIGS,
} from "./constants";

// パドル生成
export function createPaddle(): Paddle {
  return {
    x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    y: PADDLE_Y,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    isExpanded: false,
    expandTimer: 0,
  };
}

// ボール生成
export function createBall(x: number, y: number): Ball {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  return {
    x,
    y,
    dx: Math.cos(angle) * BALL_SPEED,
    dy: Math.sin(angle) * BALL_SPEED,
    radius: BALL_RADIUS,
    isPiercing: false,
  };
}

// ブロック生成
export function createBricks(stage: number): Brick[] {
  const config = STAGE_CONFIGS[Math.min(stage - 1, STAGE_CONFIGS.length - 1)];
  const rows = Math.min(config.rows, BRICK_ROWS);
  const hardRows = config.hardRows;
  const bricks: Brick[] = [];

  const powerUpTypes: PowerUpType[] = ["expand", "multiball", "laser", "slow", "life"];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const isHard = row < hardRows;
      const hasPowerUp = Math.random() < POWERUP_DROP_CHANCE;

      bricks.push({
        x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
        y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: BRICK_COLORS[row % BRICK_COLORS.length],
        hp: isHard ? 2 : 1,
        maxHp: isHard ? 2 : 1,
        visible: true,
        powerUp: hasPowerUp
          ? powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
          : undefined,
      });
    }
  }

  return bricks;
}

// 初期状態
export function createInitialState(highScore: number): GameState {
  const paddle = createPaddle();
  return {
    phase: "start",
    stage: 1,
    score: 0,
    lives: INITIAL_LIVES,
    paddle,
    balls: [createBall(CANVAS_WIDTH / 2, paddle.y - BALL_RADIUS - 5)],
    bricks: createBricks(1),
    powerUps: [],
    lasers: [],
    laserActive: false,
    laserTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    highScore,
  };
}

// 次のステージ
export function advanceStage(state: GameState): GameState {
  const nextStage = state.stage + 1;
  const paddle = createPaddle();
  return {
    ...state,
    phase: "playing",
    stage: nextStage,
    paddle,
    balls: [createBall(CANVAS_WIDTH / 2, paddle.y - BALL_RADIUS - 5)],
    bricks: createBricks(nextStage),
    powerUps: [],
    lasers: [],
    laserActive: false,
    laserTimer: 0,
    comboCount: 0,
    comboTimer: 0,
  };
}

// パドル移動
export function movePaddle(state: GameState, targetX: number): GameState {
  const halfWidth = state.paddle.width / 2;
  const x = Math.max(halfWidth, Math.min(CANVAS_WIDTH - halfWidth, targetX)) - halfWidth;
  return {
    ...state,
    paddle: { ...state.paddle, x },
  };
}

// ボール更新
function updateBalls(state: GameState): Ball[] {
  return state.balls.map((ball) => {
    let { x, y, dx, dy } = ball;

    x += dx;
    y += dy;

    // 左右壁
    if (x - BALL_RADIUS <= 0) {
      x = BALL_RADIUS;
      dx = Math.abs(dx);
    } else if (x + BALL_RADIUS >= CANVAS_WIDTH) {
      x = CANVAS_WIDTH - BALL_RADIUS;
      dx = -Math.abs(dx);
    }

    // 上壁
    if (y - BALL_RADIUS <= 0) {
      y = BALL_RADIUS;
      dy = Math.abs(dy);
    }

    return { ...ball, x, y, dx, dy };
  });
}

// パドル衝突
function checkPaddleCollision(ball: Ball, paddle: Paddle): Ball {
  if (
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width
  ) {
    const hitPos = (ball.x - paddle.x) / paddle.width - 0.5;
    const angle = -Math.PI / 2 + hitPos * (Math.PI / 3);
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    return {
      ...ball,
      y: paddle.y - ball.radius,
      dx: Math.cos(angle) * speed,
      dy: -Math.abs(Math.sin(angle) * speed),
    };
  }
  return ball;
}

// ブロック衝突
interface BrickCollisionResult {
  ball: Ball;
  bricks: Brick[];
  score: number;
  newPowerUps: PowerUpItem[];
  hitCount: number;
}

function checkBrickCollisions(
  ball: Ball,
  bricks: Brick[],
  currentScore: number,
  comboCount: number
): BrickCollisionResult {
  let updatedBall = { ...ball };
  let hitCount = 0;
  const newPowerUps: PowerUpItem[] = [];

  const updatedBricks = bricks.map((brick) => {
    if (!brick.visible) return brick;

    const closestX = Math.max(brick.x, Math.min(updatedBall.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(updatedBall.y, brick.y + brick.height));
    const distX = updatedBall.x - closestX;
    const distY = updatedBall.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq <= BALL_RADIUS * BALL_RADIUS) {
      const newHp = brick.hp - 1;
      hitCount++;

      if (!updatedBall.isPiercing) {
        // 衝突方向判定
        const overlapLeft = updatedBall.x + BALL_RADIUS - brick.x;
        const overlapRight = brick.x + brick.width - (updatedBall.x - BALL_RADIUS);
        const overlapTop = updatedBall.y + BALL_RADIUS - brick.y;
        const overlapBottom = brick.y + brick.height - (updatedBall.y - BALL_RADIUS);
        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          updatedBall = { ...updatedBall, dx: -updatedBall.dx };
        } else {
          updatedBall = { ...updatedBall, dy: -updatedBall.dy };
        }
      }

      if (newHp <= 0) {
        // ブロック破壊
        if (brick.powerUp) {
          newPowerUps.push({
            x: brick.x + brick.width / 2 - POWERUP_WIDTH / 2,
            y: brick.y + brick.height,
            width: POWERUP_WIDTH,
            height: POWERUP_HEIGHT,
            type: brick.powerUp,
            dy: POWERUP_SPEED,
          });
        }
        return { ...brick, hp: 0, visible: false };
      }
      return { ...brick, hp: newHp };
    }
    return brick;
  });

  const addedScore =
    hitCount > 0
      ? Math.floor(
          hitCount * SCORE_BASE * (1 + comboCount * SCORE_COMBO_MULTIPLIER)
        )
      : 0;

  return {
    ball: updatedBall,
    bricks: updatedBricks,
    score: currentScore + addedScore,
    newPowerUps,
    hitCount,
  };
}

// パワーアップ更新
function updatePowerUps(powerUps: PowerUpItem[]): PowerUpItem[] {
  return powerUps
    .map((p) => ({ ...p, y: p.y + p.dy }))
    .filter((p) => p.y < CANVAS_HEIGHT);
}

// パワーアップ取得
interface PowerUpCollectResult {
  powerUps: PowerUpItem[];
  paddle: Paddle;
  balls: Ball[];
  lives: number;
  laserActive: boolean;
  laserTimer: number;
}

function collectPowerUps(
  powerUps: PowerUpItem[],
  paddle: Paddle,
  balls: Ball[],
  lives: number,
  laserActive: boolean,
  laserTimer: number
): PowerUpCollectResult {
  let newPaddle = paddle;
  let newBalls = balls;
  let newLives = lives;
  let newLaserActive = laserActive;
  let newLaserTimer = laserTimer;

  const remaining = powerUps.filter((p) => {
    const collected =
      p.y + p.height >= paddle.y &&
      p.y <= paddle.y + paddle.height &&
      p.x + p.width >= paddle.x &&
      p.x <= paddle.x + paddle.width;

    if (collected) {
      switch (p.type) {
        case "expand":
          newPaddle = {
            ...newPaddle,
            width: PADDLE_WIDTH_EXPANDED,
            isExpanded: true,
            expandTimer: PADDLE_EXPAND_DURATION,
          };
          break;
        case "multiball":
          if (newBalls.length < MAX_BALLS) {
            const baseBall = newBalls[0];
            const extraBalls: Ball[] = [];
            for (let i = 0; i < 2 && newBalls.length + extraBalls.length < MAX_BALLS; i++) {
              extraBalls.push({
                ...baseBall,
                dx: baseBall.dx * (i === 0 ? 0.7 : -0.7) + (Math.random() - 0.5),
                dy: -Math.abs(baseBall.dy),
              });
            }
            newBalls = [...newBalls, ...extraBalls];
          }
          break;
        case "laser":
          newLaserActive = true;
          newLaserTimer = LASER_DURATION;
          break;
        case "slow":
          newBalls = newBalls.map((b) => ({
            ...b,
            dx: b.dx * 0.7,
            dy: b.dy * 0.7,
          }));
          break;
        case "life":
          newLives = Math.min(newLives + 1, MAX_LIVES);
          break;
      }
    }
    return !collected;
  });

  return {
    powerUps: remaining,
    paddle: newPaddle,
    balls: newBalls,
    lives: newLives,
    laserActive: newLaserActive,
    laserTimer: newLaserTimer,
  };
}

// レーザー更新
function updateLasers(lasers: Laser[]): Laser[] {
  return lasers
    .map((l) => ({ ...l, y: l.y + l.dy }))
    .filter((l) => l.y + l.height > 0);
}

// レーザーとブロック衝突
interface LaserBrickResult {
  lasers: Laser[];
  bricks: Brick[];
  score: number;
  newPowerUps: PowerUpItem[];
}

function checkLaserBrickCollisions(
  lasers: Laser[],
  bricks: Brick[],
  score: number,
  comboCount: number
): LaserBrickResult {
  let updatedScore = score;
  const newPowerUps: PowerUpItem[] = [];

  const updatedLasers = [...lasers];
  const updatedBricks = bricks.map((brick) => {
    if (!brick.visible) return brick;

    for (let i = updatedLasers.length - 1; i >= 0; i--) {
      const laser = updatedLasers[i];
      if (
        laser.x + laser.width >= brick.x &&
        laser.x <= brick.x + brick.width &&
        laser.y <= brick.y + brick.height &&
        laser.y + laser.height >= brick.y
      ) {
        updatedLasers.splice(i, 1);
        const newHp = brick.hp - 1;
        if (newHp <= 0) {
          updatedScore += Math.floor(
            SCORE_BASE * (1 + comboCount * SCORE_COMBO_MULTIPLIER)
          );
          if (brick.powerUp) {
            newPowerUps.push({
              x: brick.x + brick.width / 2 - POWERUP_WIDTH / 2,
              y: brick.y + brick.height,
              width: POWERUP_WIDTH,
              height: POWERUP_HEIGHT,
              type: brick.powerUp,
              dy: POWERUP_SPEED,
            });
          }
          return { ...brick, hp: 0, visible: false };
        }
        return { ...brick, hp: newHp };
      }
    }
    return brick;
  });

  return {
    lasers: updatedLasers,
    bricks: updatedBricks,
    score: updatedScore,
    newPowerUps,
  };
}

// レーザー発射
export function fireLaser(state: GameState): GameState {
  if (!state.laserActive || state.phase !== "playing") return state;

  const laser: Laser = {
    x: state.paddle.x + state.paddle.width / 2 - LASER_WIDTH / 2,
    y: state.paddle.y,
    width: LASER_WIDTH,
    height: LASER_HEIGHT,
    dy: -LASER_SPEED,
  };

  return {
    ...state,
    lasers: [...state.lasers, laser],
  };
}

// メインゲーム更新
export function updateGame(state: GameState): GameState {
  if (state.phase !== "playing") return state;

  // パドルの拡大タイマー
  let paddle = state.paddle;
  if (paddle.isExpanded) {
    const newTimer = paddle.expandTimer - 1;
    if (newTimer <= 0) {
      paddle = { ...paddle, width: PADDLE_WIDTH, isExpanded: false, expandTimer: 0 };
    } else {
      paddle = { ...paddle, expandTimer: newTimer };
    }
  }

  // レーザータイマー
  let laserActive = state.laserActive;
  let laserTimer = state.laserTimer;
  if (laserActive) {
    laserTimer--;
    if (laserTimer <= 0) {
      laserActive = false;
      laserTimer = 0;
    }
  }

  // ボール更新
  let balls = updateBalls({ ...state, paddle });

  // パドル衝突
  balls = balls.map((ball) => checkPaddleCollision(ball, paddle));

  // ブロック衝突
  let bricks = state.bricks;
  let score = state.score;
  let powerUps = state.powerUps;
  let comboCount = state.comboCount;
  let comboTimer = state.comboTimer;

  for (let i = 0; i < balls.length; i++) {
    const result = checkBrickCollisions(balls[i], bricks, score, comboCount);
    balls[i] = result.ball;
    bricks = result.bricks;
    score = result.score;
    powerUps = [...powerUps, ...result.newPowerUps];
    if (result.hitCount > 0) {
      comboCount += result.hitCount;
      comboTimer = COMBO_TIMEOUT;
    }
  }

  // コンボタイマー
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer <= 0) {
      comboCount = 0;
    }
  }

  // パワーアップ更新
  powerUps = updatePowerUps(powerUps);

  // パワーアップ取得
  let lives = state.lives;
  const collectResult = collectPowerUps(
    powerUps,
    paddle,
    balls,
    lives,
    laserActive,
    laserTimer
  );
  powerUps = collectResult.powerUps;
  paddle = collectResult.paddle;
  balls = collectResult.balls;
  lives = collectResult.lives;
  laserActive = collectResult.laserActive;
  laserTimer = collectResult.laserTimer;

  // レーザー更新
  let lasers = updateLasers(state.lasers);

  // レーザーとブロック衝突
  const laserResult = checkLaserBrickCollisions(lasers, bricks, score, comboCount);
  lasers = laserResult.lasers;
  bricks = laserResult.bricks;
  score = laserResult.score;
  powerUps = [...powerUps, ...laserResult.newPowerUps];

  // ボール落下チェック
  const aliveBalls = balls.filter((ball) => ball.y - ball.radius < CANVAS_HEIGHT);
  if (aliveBalls.length === 0) {
    lives--;
    if (lives <= 0) {
      return {
        ...state,
        phase: "gameover",
        score,
        lives: 0,
        bricks,
        powerUps: [],
        lasers: [],
        highScore: Math.max(state.highScore, score),
      };
    }
    // ボールリセット
    return {
      ...state,
      paddle: createPaddle(),
      balls: [createBall(CANVAS_WIDTH / 2, PADDLE_Y - BALL_RADIUS - 5)],
      bricks,
      powerUps: [],
      lasers: [],
      laserActive: false,
      laserTimer: 0,
      score,
      lives,
      comboCount: 0,
      comboTimer: 0,
    };
  }

  // クリアチェック
  const remainingBricks = bricks.filter((b) => b.visible).length;
  if (remainingBricks === 0) {
    return {
      ...state,
      phase: "cleared",
      paddle,
      balls: aliveBalls,
      bricks,
      powerUps,
      lasers,
      laserActive,
      laserTimer,
      score,
      lives,
      comboCount,
      comboTimer,
      highScore: Math.max(state.highScore, score),
    };
  }

  return {
    ...state,
    paddle,
    balls: aliveBalls,
    bricks,
    powerUps,
    lasers,
    laserActive,
    laserTimer,
    score,
    lives,
    comboCount,
    comboTimer,
  };
}
