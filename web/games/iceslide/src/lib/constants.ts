import type { Stage, CellType } from "./types";

/** セルサイズ (px) */
export const CELL_SIZE = 50;

/** アニメーション時間 (ms) */
export const SLIDE_DURATION = 150;

/**
 * ステージデータ定義
 * I = 氷 (ice)
 * W = 壁 (wall)
 * G = ゴール (goal)
 * P = プレイヤー開始位置 (ice扱い)
 */
function parseStage(id: number, name: string, par: number, map: string[]): Stage {
  const height = map.length;
  const width = map[0].length;
  const cells: CellType[][] = [];
  let startX = 0;
  let startY = 0;

  for (let y = 0; y < height; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < width; x++) {
      const char = map[y][x];
      if (char === "W") {
        row.push("wall");
      } else if (char === "G") {
        row.push("goal");
      } else {
        row.push("ice");
        if (char === "P") {
          startX = x;
          startY = y;
        }
      }
    }
    cells.push(row);
  }

  return { id, name, width, height, cells, startX, startY, par };
}

export const STAGES: Stage[] = [
  // Stage 1: 超簡単 - 直進
  parseStage(1, "はじめの一歩", 1, [
    "WWWWW",
    "WP  W",
    "W  GW",
    "WWWWW",
  ]),
  // Stage 2: 2手
  parseStage(2, "曲がり角", 2, [
    "WWWWWW",
    "WP   W",
    "W W  W",
    "W   GW",
    "WWWWWW",
  ]),
  // Stage 3: 3手
  parseStage(3, "回り道", 3, [
    "WWWWWWW",
    "WP    W",
    "WWW W W",
    "W     W",
    "W WWWWW",
    "W    GW",
    "WWWWWWW",
  ]),
  // Stage 4
  parseStage(4, "迷路の入口", 4, [
    "WWWWWWW",
    "WP W  W",
    "W     W",
    "W WWW W",
    "W     W",
    "W  W GW",
    "WWWWWWW",
  ]),
  // Stage 5
  parseStage(5, "壁を使え", 3, [
    "WWWWWW",
    "W   PW",
    "W WW W",
    "W    W",
    "WG W W",
    "WWWWWW",
  ]),
  // Stage 6
  parseStage(6, "ジグザグ", 5, [
    "WWWWWWWW",
    "WP     W",
    "WWWWWW W",
    "W      W",
    "W WWWWWW",
    "W     GW",
    "WWWWWWWW",
  ]),
  // Stage 7
  parseStage(7, "中央突破", 4, [
    "WWWWWWW",
    "W P   W",
    "W WWW W",
    "W  W  W",
    "W WWW W",
    "W   G W",
    "WWWWWWW",
  ]),
  // Stage 8
  parseStage(8, "螺旋", 6, [
    "WWWWWWWW",
    "WP     W",
    "W WWWW W",
    "W W    W",
    "W W WW W",
    "W W  G W",
    "W WWWW W",
    "W      W",
    "WWWWWWWW",
  ]),
  // Stage 9
  parseStage(9, "交差点", 5, [
    "WWWWWWW",
    "W  P  W",
    "W W W W",
    "W     W",
    "W W W W",
    "W  G  W",
    "WWWWWWW",
  ]),
  // Stage 10
  parseStage(10, "難関", 6, [
    "WWWWWWWW",
    "W P    W",
    "W WWWW W",
    "W    W W",
    "WWWW   W",
    "W    W W",
    "W WWWW W",
    "W    G W",
    "WWWWWWWW",
  ]),
  // Stage 11
  parseStage(11, "氷の城", 5, [
    "WWWWWWWW",
    "W P  W W",
    "W WW   W",
    "W    W W",
    "W WW   W",
    "W    W W",
    "W   G  W",
    "WWWWWWWW",
  ]),
  // Stage 12
  parseStage(12, "滑走路", 4, [
    "WWWWWWWWW",
    "WP      W",
    "WWWWWWW W",
    "W       W",
    "W WWWWWWW",
    "W      GW",
    "WWWWWWWWW",
  ]),
  // Stage 13
  parseStage(13, "障害物", 6, [
    "WWWWWWWW",
    "W P    W",
    "W W W WW",
    "W   W  W",
    "WW W   W",
    "W    W W",
    "W  G   W",
    "WWWWWWWW",
  ]),
  // Stage 14
  parseStage(14, "くねくね", 7, [
    "WWWWWWWWW",
    "WP      W",
    "W WWWWW W",
    "W     W W",
    "WWWWW   W",
    "W     WWW",
    "W WWWW  W",
    "W      GW",
    "WWWWWWWWW",
  ]),
  // Stage 15
  parseStage(15, "氷山", 5, [
    "WWWWWWW",
    "W  P  W",
    "W WWW W",
    "W W W W",
    "W     W",
    "WWW WWW",
    "W  G  W",
    "WWWWWWW",
  ]),
  // Stage 16
  parseStage(16, "迷宮入口", 7, [
    "WWWWWWWWW",
    "W P     W",
    "W WWW W W",
    "W   W   W",
    "WWW WWW W",
    "W   W   W",
    "W W WWW W",
    "W     G W",
    "WWWWWWWWW",
  ]),
  // Stage 17
  parseStage(17, "氷の道", 6, [
    "WWWWWWWW",
    "WP W   W",
    "W    W W",
    "W W    W",
    "W   W  W",
    "W W   WW",
    "W    G W",
    "WWWWWWWW",
  ]),
  // Stage 18
  parseStage(18, "回転", 8, [
    "WWWWWWWWW",
    "W   P   W",
    "W WWWWW W",
    "W W   W W",
    "W W W W W",
    "W W   W W",
    "W WWWWW W",
    "W   G   W",
    "WWWWWWWWW",
  ]),
  // Stage 19
  parseStage(19, "分岐", 6, [
    "WWWWWWWW",
    "WP     W",
    "W WWWW W",
    "W W  W W",
    "W    W W",
    "W WW   W",
    "W   W GW",
    "WWWWWWWW",
  ]),
  // Stage 20
  parseStage(20, "決戦", 9, [
    "WWWWWWWWWW",
    "W  P     W",
    "W WWWWWW W",
    "W      W W",
    "WWWWWW   W",
    "W      W W",
    "W WWWWWW W",
    "W        W",
    "W  WWWWWWW",
    "W       GW",
    "WWWWWWWWWW",
  ]),
];

export const TOTAL_STAGES = STAGES.length;
