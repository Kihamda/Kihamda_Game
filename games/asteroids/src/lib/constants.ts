export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const SHIP_SIZE = 20;
export const SHIP_ROTATION_SPEED = 0.08;
export const SHIP_THRUST = 0.15;
export const SHIP_MAX_SPEED = 8;
export const SHIP_FRICTION = 0.99;

export const BULLET_SPEED = 10;
export const BULLET_LIFETIME = 60;
export const BULLET_RADIUS = 3;
export const FIRE_COOLDOWN = 10;

export const ASTEROID_SIZES = {
  large: 40,
  medium: 20,
  small: 10,
} as const;

export const ASTEROID_SPEEDS = {
  large: 1.5,
  medium: 2.5,
  small: 3.5,
} as const;

export const ASTEROID_SCORES = {
  large: 20,
  medium: 50,
  small: 100,
} as const;

export const INITIAL_ASTEROIDS = 4;
export const INITIAL_LIVES = 3;
export const RESPAWN_DELAY = 120;
export const INVINCIBLE_FRAMES = 180;

export const STORAGE_KEY = "asteroids_highscore";
