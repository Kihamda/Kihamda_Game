import type { Tower, Enemy, Projectile, TowerType, GameState, DamageResult, KillEvent } from "./types";
import {
  PATH,
  CELL_SIZE,
  TOWER_CONFIGS,
  PROJECTILE_SPEED,
  ENEMY_SIZE,
  SLOW_DURATION,
  SLOW_FACTOR,
  SPLASH_RADIUS,
  GOLD_PER_KILL,
  ENEMY_BASE_HEALTH,
  ENEMY_BASE_SPEED,
  ENEMY_MAX_SPEED,
  ENEMY_HEALTH_SCALE,
} from "./constants";

let nextTowerId = 1;
let nextEnemyId = 1;
let nextProjectileId = 1;

export function resetIds(): void {
  nextTowerId = 1;
  nextEnemyId = 1;
  nextProjectileId = 1;
}

export function createTower(type: TowerType, gridX: number, gridY: number): Tower {
  return {
    id: nextTowerId++,
    type,
    x: gridX * CELL_SIZE + CELL_SIZE / 2,
    y: gridY * CELL_SIZE + CELL_SIZE / 2,
    lastFireTime: 0,
  };
}

export function createEnemy(wave: number): Enemy {
  const health = Math.floor(ENEMY_BASE_HEALTH * Math.pow(ENEMY_HEALTH_SCALE, wave - 1));
  return {
    id: nextEnemyId++,
    x: PATH[0].x,
    y: PATH[0].y,
    health,
    maxHealth: health,
    speed: Math.min(ENEMY_MAX_SPEED, ENEMY_BASE_SPEED + wave * 0.1),
    pathIndex: 0,
    slowUntil: 0,
  };
}

export function createProjectile(tower: Tower, targetId: number): Projectile {
  return {
    id: nextProjectileId++,
    x: tower.x,
    y: tower.y,
    targetId,
    towerType: tower.type,
    speed: PROJECTILE_SPEED,
  };
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function updateEnemy(enemy: Enemy, frameCount: number): Enemy {
  if (enemy.pathIndex >= PATH.length - 1) {
    return enemy;
  }

  const target = PATH[enemy.pathIndex + 1];
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const isSlowed = enemy.slowUntil > frameCount;
  const speed = isSlowed ? enemy.speed * SLOW_FACTOR : enemy.speed;

  if (dist < speed) {
    return {
      ...enemy,
      x: target.x,
      y: target.y,
      pathIndex: enemy.pathIndex + 1,
    };
  }

  return {
    ...enemy,
    x: enemy.x + (dx / dist) * speed,
    y: enemy.y + (dy / dist) * speed,
  };
}

export function hasReachedEnd(enemy: Enemy): boolean {
  return enemy.pathIndex >= PATH.length - 1;
}

export function findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
  const config = TOWER_CONFIGS[tower.type];
  let closest: Enemy | null = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    const dist = distance(tower.x, tower.y, enemy.x, enemy.y);
    if (dist <= config.range && dist < closestDist) {
      closest = enemy;
      closestDist = dist;
    }
  }

  return closest;
}

export function updateProjectile(projectile: Projectile, enemies: Enemy[]): Projectile | null {
  const target = enemies.find((e) => e.id === projectile.targetId);
  if (!target) {
    return null;
  }

  const dx = target.x - projectile.x;
  const dy = target.y - projectile.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < projectile.speed + ENEMY_SIZE / 2) {
    return null; // Hit target
  }

  return {
    ...projectile,
    x: projectile.x + (dx / dist) * projectile.speed,
    y: projectile.y + (dy / dist) * projectile.speed,
  };
}

export function applyDamage(
  enemies: Enemy[],
  projectile: Projectile,
  frameCount: number
): DamageResult {
  const config = TOWER_CONFIGS[projectile.towerType];
  let goldEarned = 0;
  const kills: KillEvent[] = [];
  const target = enemies.find((e) => e.id === projectile.targetId);
  if (!target) return { enemies, goldEarned, kills };

  let newEnemies: Enemy[];

  if (projectile.towerType === "splash") {
    newEnemies = enemies.map((e) => {
      const dist = distance(target.x, target.y, e.x, e.y);
      if (dist <= SPLASH_RADIUS) {
        const newHealth = e.health - config.damage;
        if (newHealth <= 0) {
          goldEarned += GOLD_PER_KILL;
          kills.push({ x: e.x, y: e.y, gold: GOLD_PER_KILL });
          return { ...e, health: 0 };
        }
        return { ...e, health: newHealth };
      }
      return e;
    });
  } else if (projectile.towerType === "slow") {
    newEnemies = enemies.map((e) => {
      if (e.id === target.id) {
        const newHealth = e.health - config.damage;
        if (newHealth <= 0) {
          goldEarned += GOLD_PER_KILL;
          kills.push({ x: e.x, y: e.y, gold: GOLD_PER_KILL });
          return { ...e, health: 0 };
        }
        return { ...e, health: newHealth, slowUntil: frameCount + SLOW_DURATION };
      }
      return e;
    });
  } else {
    newEnemies = enemies.map((e) => {
      if (e.id === target.id) {
        const newHealth = e.health - config.damage;
        if (newHealth <= 0) {
          goldEarned += GOLD_PER_KILL;
          kills.push({ x: e.x, y: e.y, gold: GOLD_PER_KILL });
          return { ...e, health: 0 };
        }
        return { ...e, health: newHealth };
      }
      return e;
    });
  }

  return { enemies: newEnemies.filter((e) => e.health > 0), goldEarned, kills };
}

export function canPlaceTower(gridX: number, gridY: number, towers: Tower[]): boolean {
  // Check if on path
  const centerX = gridX * CELL_SIZE + CELL_SIZE / 2;
  const centerY = gridY * CELL_SIZE + CELL_SIZE / 2;

  // Check collision with path
  for (let i = 0; i < PATH.length - 1; i++) {
    const p1 = PATH[i];
    const p2 = PATH[i + 1];
    const distToLine = distanceToLineSegment(centerX, centerY, p1.x, p1.y, p2.x, p2.y);
    if (distToLine < CELL_SIZE) {
      return false;
    }
  }

  // Check if tower already exists at this position
  for (const tower of towers) {
    const towerGridX = Math.floor((tower.x - CELL_SIZE / 2) / CELL_SIZE);
    const towerGridY = Math.floor((tower.y - CELL_SIZE / 2) / CELL_SIZE);
    if (towerGridX === gridX && towerGridY === gridY) {
      return false;
    }
  }

  return true;
}

function distanceToLineSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length2 = dx * dx + dy * dy;

  if (length2 === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / length2;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

export function createInitialState(highestWave: number): GameState {
  resetIds();
  return {
    phase: "before",
    towers: [],
    enemies: [],
    projectiles: [],
    lives: 0,
    gold: 0,
    wave: 0,
    waveInProgress: false,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    selectedTowerType: null,
    highestWave,
  };
}
