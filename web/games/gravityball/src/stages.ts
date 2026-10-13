export interface Vector {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "wall" | "spike";
}

export interface Stage {
  ball: Vector;
  goal: Vector;
  obstacles: Obstacle[];
}

// ステージデータ
export const STAGES: Stage[] = [
  // Stage 1: 簡単な導入
  {
    ball: { x: 80, y: 100 },
    goal: { x: 420, y: 500 },
    obstacles: [
      { x: 150, y: 250, width: 200, height: 20, type: "wall" },
    ],
  },
  // Stage 2: 障害物を避ける
  {
    ball: { x: 250, y: 80 },
    goal: { x: 250, y: 520 },
    obstacles: [
      { x: 0, y: 200, width: 200, height: 20, type: "wall" },
      { x: 300, y: 200, width: 200, height: 20, type: "wall" },
      { x: 100, y: 350, width: 300, height: 20, type: "wall" },
    ],
  },
  // Stage 3: スパイク登場
  {
    ball: { x: 60, y: 540 },
    goal: { x: 440, y: 540 },
    obstacles: [
      { x: 150, y: 400, width: 200, height: 20, type: "wall" },
      { x: 200, y: 500, width: 100, height: 20, type: "spike" },
    ],
  },
  // Stage 4: 迷路風
  {
    ball: { x: 60, y: 60 },
    goal: { x: 440, y: 540 },
    obstacles: [
      { x: 100, y: 0, width: 20, height: 180, type: "wall" },
      { x: 100, y: 180, width: 300, height: 20, type: "wall" },
      { x: 380, y: 180, width: 20, height: 200, type: "wall" },
      { x: 100, y: 380, width: 300, height: 20, type: "wall" },
      { x: 100, y: 380, width: 20, height: 180, type: "wall" },
      { x: 200, y: 280, width: 80, height: 20, type: "spike" },
    ],
  },
  // Stage 5: 最終ステージ
  {
    ball: { x: 250, y: 50 },
    goal: { x: 250, y: 550 },
    obstacles: [
      { x: 0, y: 120, width: 180, height: 20, type: "wall" },
      { x: 320, y: 120, width: 180, height: 20, type: "wall" },
      { x: 200, y: 200, width: 100, height: 20, type: "spike" },
      { x: 100, y: 300, width: 300, height: 20, type: "wall" },
      { x: 0, y: 400, width: 150, height: 20, type: "wall" },
      { x: 350, y: 400, width: 150, height: 20, type: "wall" },
      { x: 180, y: 480, width: 140, height: 20, type: "spike" },
    ],
  },
];

