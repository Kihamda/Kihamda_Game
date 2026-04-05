import type { Ship, Bullet, Asteroid, Vector2D, GameState, CollisionInfo } from "./types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHIP_MAX_SPEED,
  SHIP_FRICTION,
  BULLET_SPEED,
  BULLET_LIFETIME,
  ASTEROID_SIZES,
  ASTEROID_SPEEDS,
  ASTEROID_SCORES,
} from "./constants";

let nextBulletId = 0;
let nextAsteroidId = 0;

export function createInitialShip(): Ship {
  return {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
  };
}

export function updateShip(
  ship: Ship,
  rotateLeft: boolean,
  rotateRight: boolean,
  thrust: boolean
): Ship {
  let angle = ship.angle;
  if (rotateLeft) angle -= SHIP_ROTATION_SPEED;
  if (rotateRight) angle += SHIP_ROTATION_SPEED;

  let vx = ship.vx;
  let vy = ship.vy;

  if (thrust) {
    vx += Math.cos(angle) * SHIP_THRUST;
    vy += Math.sin(angle) * SHIP_THRUST;
  }

  // Apply friction
  vx *= SHIP_FRICTION;
  vy *= SHIP_FRICTION;

  // Clamp speed
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > SHIP_MAX_SPEED) {
    vx = (vx / speed) * SHIP_MAX_SPEED;
    vy = (vy / speed) * SHIP_MAX_SPEED;
  }

  // Update position with wrapping
  let x = ship.x + vx;
  let y = ship.y + vy;
  x = ((x % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
  y = ((y % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;

  return { x, y, angle, vx, vy };
}

export function createBullet(ship: Ship): Bullet {
  return {
    id: nextBulletId++,
    x: ship.x + Math.cos(ship.angle) * 25,
    y: ship.y + Math.sin(ship.angle) * 25,
    vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx * 0.5,
    vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy * 0.5,
    lifetime: BULLET_LIFETIME,
  };
}

export function updateBullet(bullet: Bullet): Bullet {
  let x = bullet.x + bullet.vx;
  let y = bullet.y + bullet.vy;
  x = ((x % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
  y = ((y % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;
  return { ...bullet, x, y, lifetime: bullet.lifetime - 1 };
}

function generateAsteroidVertices(radius: number): Vector2D[] {
  const vertices: Vector2D[] = [];
  const numVertices = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.3);
    vertices.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }
  return vertices;
}

export function createAsteroid(
  x: number,
  y: number,
  size: "large" | "medium" | "small"
): Asteroid {
  const radius = ASTEROID_SIZES[size];
  const speed = ASTEROID_SPEEDS[size];
  const angle = Math.random() * Math.PI * 2;
  return {
    id: nextAsteroidId++,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    vertices: generateAsteroidVertices(radius),
  };
}

export function createInitialAsteroids(count: number): Asteroid[] {
  const asteroids: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    do {
      x = Math.random() * CANVAS_WIDTH;
      y = Math.random() * CANVAS_HEIGHT;
    } while (
      Math.abs(x - CANVAS_WIDTH / 2) < 150 &&
      Math.abs(y - CANVAS_HEIGHT / 2) < 150
    );
    asteroids.push(createAsteroid(x, y, "large"));
  }
  return asteroids;
}

export function updateAsteroid(asteroid: Asteroid): Asteroid {
  let x = asteroid.x + asteroid.vx;
  let y = asteroid.y + asteroid.vy;
  x = ((x % CANVAS_WIDTH) + CANVAS_WIDTH) % CANVAS_WIDTH;
  y = ((y % CANVAS_HEIGHT) + CANVAS_HEIGHT) % CANVAS_HEIGHT;
  return { ...asteroid, x, y };
}

export function checkBulletAsteroidCollision(
  bullet: Bullet,
  asteroid: Asteroid
): boolean {
  const dx = bullet.x - asteroid.x;
  const dy = bullet.y - asteroid.y;
  return Math.sqrt(dx * dx + dy * dy) < asteroid.radius;
}

export function checkShipAsteroidCollision(
  ship: Ship,
  asteroid: Asteroid,
  shipRadius: number
): boolean {
  const dx = ship.x - asteroid.x;
  const dy = ship.y - asteroid.y;
  return Math.sqrt(dx * dx + dy * dy) < asteroid.radius + shipRadius;
}

export function splitAsteroid(asteroid: Asteroid): Asteroid[] {
  if (asteroid.radius === ASTEROID_SIZES.large) {
    return [
      createAsteroid(asteroid.x, asteroid.y, "medium"),
      createAsteroid(asteroid.x, asteroid.y, "medium"),
    ];
  } else if (asteroid.radius === ASTEROID_SIZES.medium) {
    return [
      createAsteroid(asteroid.x, asteroid.y, "small"),
      createAsteroid(asteroid.x, asteroid.y, "small"),
    ];
  }
  return [];
}

export function getAsteroidScore(asteroid: Asteroid): number {
  if (asteroid.radius === ASTEROID_SIZES.large) return ASTEROID_SCORES.large;
  if (asteroid.radius === ASTEROID_SIZES.medium) return ASTEROID_SCORES.medium;
  return ASTEROID_SCORES.small;
}

export function processCollisions(state: GameState): {
  bullets: Bullet[];
  asteroids: Asteroid[];
  scoreGained: number;
  collisions: CollisionInfo[];
} {
  const remainingBullets: Bullet[] = [];
  const asteroids = [...state.asteroids];
  let scoreGained = 0;
  const newAsteroids: Asteroid[] = [];
  const collisions: CollisionInfo[] = [];

  for (const bullet of state.bullets) {
    let bulletHit = false;
    for (let i = 0; i < asteroids.length; i++) {
      if (checkBulletAsteroidCollision(bullet, asteroids[i])) {
        bulletHit = true;
        const destroyed = asteroids[i];
        const score = getAsteroidScore(destroyed);
        scoreGained += score;
        
        // サイズ判定
        let size: "large" | "medium" | "small" = "small";
        if (destroyed.radius === ASTEROID_SIZES.large) size = "large";
        else if (destroyed.radius === ASTEROID_SIZES.medium) size = "medium";
        
        collisions.push({ x: destroyed.x, y: destroyed.y, size, score });
        
        const fragments = splitAsteroid(destroyed);
        newAsteroids.push(...fragments);
        asteroids.splice(i, 1);
        break;
      }
    }
    if (!bulletHit) {
      remainingBullets.push(bullet);
    }
  }

  return {
    bullets: remainingBullets,
    asteroids: [...asteroids, ...newAsteroids],
    scoreGained,
    collisions,
  };
}
