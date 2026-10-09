// ミニゴルフ定数
import type { HoleConfig } from "./types";

/** ゲーム画面サイズ */
export const GAME_WIDTH = 700;
export const GAME_HEIGHT = 600;

/** ボール関連 */
export const BALL_RADIUS = 10;
export const MIN_POWER = 2;
export const MAX_POWER = 15;
export const FRICTION = 0.98;
export const MIN_VELOCITY = 0.1;

/** カップ関連 */
export const CUP_RADIUS = 18;

/** コース定義 (3ホール) */
export const COURSES: HoleConfig[] = [
  // ホール1: シンプルな直線
  {
    id: 1,
    walls: [
      { x1: 100, y1: 100, x2: 600, y2: 100 },
      { x1: 600, y1: 100, x2: 600, y2: 500 },
      { x1: 600, y1: 500, x2: 100, y2: 500 },
      { x1: 100, y1: 500, x2: 100, y2: 100 },
    ],
    ballStart: { x: 200, y: 400 },
    cup: { x: 500, y: 200 },
    obstacles: [],
    par: 2,
  },
  // ホール2: L字コース with 障害物
  {
    id: 2,
    walls: [
      { x1: 100, y1: 100, x2: 400, y2: 100 },
      { x1: 400, y1: 100, x2: 400, y2: 300 },
      { x1: 400, y1: 300, x2: 600, y2: 300 },
      { x1: 600, y1: 300, x2: 600, y2: 500 },
      { x1: 600, y1: 500, x2: 250, y2: 500 },
      { x1: 250, y1: 500, x2: 250, y2: 300 },
      { x1: 250, y1: 300, x2: 100, y2: 300 },
      { x1: 100, y1: 300, x2: 100, y2: 100 },
    ],
    ballStart: { x: 180, y: 200 },
    cup: { x: 500, y: 400 },
    obstacles: [
      { type: "rectangle", x: 350, y: 380, width: 60, height: 20 },
    ],
    par: 3,
  },
  // ホール3: 障害物多め
  {
    id: 3,
    walls: [
      { x1: 100, y1: 80, x2: 600, y2: 80 },
      { x1: 600, y1: 80, x2: 600, y2: 520 },
      { x1: 600, y1: 520, x2: 100, y2: 520 },
      { x1: 100, y1: 520, x2: 100, y2: 80 },
    ],
    ballStart: { x: 200, y: 450 },
    cup: { x: 500, y: 150 },
    obstacles: [
      { type: "circle", x: 350, y: 300, radius: 40 },
      { type: "rectangle", x: 250, y: 180, width: 80, height: 20 },
      { type: "rectangle", x: 420, y: 350, width: 20, height: 80 },
    ],
    par: 4,
  },
];

/** 色定義 */
export const COLORS = {
  grass: "#2e8b57",
  grassDark: "#228b22",
  ball: "#ffffff",
  ballStroke: "#333333",
  cup: "#1a1a1a",
  cupInner: "#333333",
  wall: "#8b4513",
  obstacle: "#654321",
  aimLine: "#ff6b6b",
  powerBar: "#ffd93d",
  flag: "#ff4444",
  flagPole: "#cccccc",
} as const;