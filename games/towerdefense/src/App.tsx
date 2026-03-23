import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import { ScreenShake } from "@shared/components/ScreenShake";
import { ParticleLayer } from "@shared/components/ParticleLayer";
import { ScorePopup } from "@shared/components/ScorePopup";
import { useParticles } from "@shared/hooks/useParticles";
import { useAudio } from "@shared/hooks/useAudio";
import type { ScreenShakeHandle } from "@shared/components/ScreenShake";
import type { PopupVariant } from "@shared/components/ScorePopup";
import type { GameState, TowerType, Enemy, Tower, Projectile, KillEvent } from "./lib/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CELL_SIZE,
  PATH,
  TOWER_CONFIGS,
  INITIAL_LIVES,
  INITIAL_GOLD,
  MAX_WAVES,
  SPAWN_INTERVAL,
  ENEMIES_PER_WAVE_BASE,
  ENEMIES_PER_WAVE_INCREMENT,
  WAVE_BONUS,
  ENEMY_SIZE,
  SPLASH_RADIUS,
} from "./lib/constants";
import {
  createInitialState,
  createTower,
  createEnemy,
  createProjectile,
  updateEnemy,
  hasReachedEnd,
  findTarget,
  updateProjectile,
  applyDamage,
  canPlaceTower,
  distance,
  resetIds,
} from "./lib/towerdefense";
import { loadHighestWave, saveHighestWave } from "./lib/storage";
import "./App.css";

// コイン獲得ポップアップ用
interface GoldPopup {
  id: number;
  x: number;
  y: number;
  gold: number;
  createdAt: number;
}

// ScorePopup用の状態
interface ScorePopupState {
  text: string | null;
  key: number;
  variant: PopupVariant;
  size: "sm" | "md" | "lg" | "xl";
  x?: string;
  y?: string;
}

function drawPath(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#3a3a5e";
  ctx.lineWidth = CELL_SIZE * 0.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) {
    ctx.lineTo(PATH[i].x, PATH[i].y);
  }
  ctx.stroke();

  // Path border
  ctx.strokeStyle = "#2a2a4e";
  ctx.lineWidth = CELL_SIZE * 0.8 + 4;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) {
    ctx.lineTo(PATH[i].x, PATH[i].y);
  }
  ctx.stroke();

  // Inner path
  ctx.strokeStyle = "#4a4a6e";
  ctx.lineWidth = CELL_SIZE * 0.6;
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) {
    ctx.lineTo(PATH[i].x, PATH[i].y);
  }
  ctx.stroke();
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, showRange: boolean, buildProgress?: number) {
  const config = TOWER_CONFIGS[tower.type];

  // Range indicator
  if (showRange) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, config.range, 0, Math.PI * 2);
    ctx.fill();
  }

  // ビルドアニメーション中
  const scale = buildProgress !== undefined ? buildProgress : 1;
  const alpha = buildProgress !== undefined ? 0.5 + buildProgress * 0.5 : 1;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(tower.x, tower.y);
  ctx.scale(scale, scale);

  // Tower base
  ctx.fillStyle = "#222";
  ctx.fillRect(-16, -16, 32, 32);

  // Tower body
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // Tower inner
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, frameCount: number) {
  const isSlowed = enemy.slowUntil > frameCount;

  // Enemy body
  ctx.fillStyle = isSlowed ? "#6699ff" : "#e74c3c";
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, ENEMY_SIZE, 0, Math.PI * 2);
  ctx.fill();

  // Enemy outline
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Health bar background
  ctx.fillStyle = "#333";
  ctx.fillRect(enemy.x - 12, enemy.y - ENEMY_SIZE - 8, 24, 4);

  // Health bar
  const healthPercent = enemy.health / enemy.maxHealth;
  ctx.fillStyle = healthPercent > 0.5 ? "#4CAF50" : healthPercent > 0.25 ? "#FFC107" : "#f44336";
  ctx.fillRect(enemy.x - 12, enemy.y - ENEMY_SIZE - 8, 24 * healthPercent, 4);
}

function drawProjectile(ctx: CanvasRenderingContext2D, projectile: Projectile) {
  const config = TOWER_CONFIGS[projectile.towerType];
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlacementPreview(
  ctx: CanvasRenderingContext2D,
  gridX: number,
  gridY: number,
  towerType: TowerType,
  canPlace: boolean
) {
  const config = TOWER_CONFIGS[towerType];
  const x = gridX * CELL_SIZE + CELL_SIZE / 2;
  const y = gridY * CELL_SIZE + CELL_SIZE / 2;

  // Range preview
  ctx.fillStyle = canPlace ? "rgba(76, 175, 80, 0.2)" : "rgba(244, 67, 54, 0.2)";
  ctx.beginPath();
  ctx.arc(x, y, config.range, 0, Math.PI * 2);
  ctx.fill();

  // Tower preview
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = canPlace ? config.color : "#f44336";
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const gameStateRef = useRef<GameState | null>(null);
  const mouseGridRef = useRef<{ x: number; y: number } | null>(null);
  const screenShakeRef = useRef<ScreenShakeHandle>(null);
  
  // ドーパミン演出
  const { particles, burst, confetti, sparkle, explosion } = useParticles();
  const { playTone, playSweep, playNoise, playBonus, playCelebrate, playWarning } = useAudio();

  // 演出用ステート
  const [screenFlash, setScreenFlash] = useState<"red" | "white" | null>(null);
  const [goldPopups, setGoldPopups] = useState<GoldPopup[]>([]);
  const [buildingTowers, setBuildingTowers] = useState<Map<number, number>>(new Map());
  const goldPopupIdRef = useRef(0);
  const scorePopupKeyRef = useRef(0);
  const [scorePopup, setScorePopup] = useState<ScorePopupState>({
    text: null,
    key: 0,
    variant: "default",
    size: "md",
  });

  // ScorePopup表示ヘルパー
  const showScorePopup = useCallback((
    text: string,
    variant: PopupVariant = "default",
    size: "sm" | "md" | "lg" | "xl" = "md",
    x?: string,
    y?: string
  ) => {
    scorePopupKeyRef.current++;
    setScorePopup({ text, key: scorePopupKeyRef.current, variant, size, x, y });
  }, []);

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(loadHighestWave())
  );

  // 効果音関数
  const playBuild = useCallback(() => {
    playTone(220, 0.1, "square", 0.15);
    playTone(330, 0.15, "triangle", 0.2, 0.05);
    playTone(440, 0.2, "sine", 0.18, 0.1);
  }, [playTone]);

  const playShoot = useCallback(() => {
    playTone(880, 0.05, "sawtooth", 0.1);
    playSweep(800, 400, 0.08, "sine", 0.15);
  }, [playTone, playSweep]);

  const playKill = useCallback(() => {
    playNoise(0.15, 0.3, 1200);
    playTone(200, 0.2, "sine", 0.25);
    playSweep(600, 100, 0.15, "sawtooth", 0.15);
  }, [playNoise, playTone, playSweep]);

  const playWaveClear = useCallback(() => {
    playCelebrate();
  }, [playCelebrate]);

  const playLeak = useCallback(() => {
    playWarning();
    playSweep(300, 100, 0.3, "sawtooth", 0.25);
  }, [playWarning, playSweep]);

  // ゴールドポップアップ追加
  const addGoldPopup = useCallback((kills: KillEvent[]) => {
    const now = performance.now();
    const newPopups = kills.map((k) => ({
      id: goldPopupIdRef.current++,
      x: k.x,
      y: k.y,
      gold: k.gold,
      createdAt: now,
    }));
    setGoldPopups((prev) => [...prev, ...newPopups]);
    // 自動削除
    setTimeout(() => {
      setGoldPopups((prev) => prev.filter((p) => !newPopups.some((n) => n.id === p.id)));
    }, 1000);
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    // イベントコールバック参照を保持
    const effectsRef = {
      playShoot,
      playKill,
      playLeak,
      playWaveClear,
      burst,
      explosion,
      confetti,
      sparkle,
      addGoldPopup,
      setScreenFlash,
      screenShakeRef,
      playBonus,
      showScorePopup,
    };

    const updateGame = () => {
      const state = gameStateRef.current;
      if (!state || state.phase !== "playing") return;

      frameCountRef.current++;
      const frameCount = frameCountRef.current;

      // Spawn enemies
      let newEnemiesToSpawn = state.enemiesToSpawn;
      let newSpawnTimer = state.spawnTimer;
      let newEnemies = [...state.enemies];

      if (state.waveInProgress && newEnemiesToSpawn > 0) {
        newSpawnTimer--;
        if (newSpawnTimer <= 0) {
          newEnemies.push(createEnemy(state.wave));
          newEnemiesToSpawn--;
          newSpawnTimer = SPAWN_INTERVAL;
        }
      }

      // Update enemies
      let livesLost = 0;
      const leakPositions: { x: number; y: number }[] = [];
      newEnemies = newEnemies
        .map((e) => updateEnemy(e, frameCount))
        .filter((e) => {
          if (hasReachedEnd(e)) {
            livesLost++;
            leakPositions.push({ x: e.x, y: e.y });
            return false;
          }
          return true;
        });

      // 敵がゴール到達時の演出
      if (livesLost > 0) {
        effectsRef.playLeak();
        effectsRef.setScreenFlash("red");
        effectsRef.screenShakeRef.current?.shake("heavy", 300);
        setTimeout(() => effectsRef.setScreenFlash(null), 200);
      }

      // Tower firing (use > to prevent firing on first frame when lastFireTime=0)
      const newProjectiles = [...state.projectiles];
      let didShoot = false;
      for (const tower of state.towers) {
        const config = TOWER_CONFIGS[tower.type];
        if (frameCount - tower.lastFireTime > config.fireRate) {
          const target = findTarget(tower, newEnemies);
          if (target) {
            newProjectiles.push(createProjectile(tower, target.id));
            tower.lastFireTime = frameCount;
            didShoot = true;
          }
        }
      }
      if (didShoot) {
        effectsRef.playShoot();
      }

      // Update projectiles and apply damage
      let totalGold = 0;
      const allKills: KillEvent[] = [];
      const updatedProjectiles: Projectile[] = [];
      for (const proj of newProjectiles) {
        const updated = updateProjectile(proj, newEnemies);
        if (updated) {
          updatedProjectiles.push(updated);
        } else {
          // Projectile hit target
          const result = applyDamage(newEnemies, proj, frameCount);
          newEnemies = result.enemies;
          totalGold += result.goldEarned;
          allKills.push(...result.kills);
        }
      }

      // 敵撃破時の演出
      if (allKills.length > 0) {
        effectsRef.playKill();
        for (const kill of allKills) {
          effectsRef.explosion(kill.x, kill.y, 16);
        }
        effectsRef.addGoldPopup(allKills);
        
        // マルチキル時のScorePopup
        if (allKills.length >= 3) {
          effectsRef.showScorePopup(
            `💥 MULTI KILL x${allKills.length}! +${totalGold}💰`,
            "combo",
            "lg"
          );
        } else if (allKills.length >= 2) {
          effectsRef.showScorePopup(
            `⚔️ DOUBLE KILL! +${totalGold}💰`,
            "default",
            "md"
          );
        }
      }

      // Check wave completion
      let newWaveInProgress = state.waveInProgress;
      let newGold = state.gold + totalGold;
      const newWave = state.wave;
      let newPhase: GameState["phase"] = state.phase;
      let newHighestWave = state.highestWave;

      if (state.waveInProgress && newEnemiesToSpawn === 0 && newEnemies.length === 0) {
        newWaveInProgress = false;
        newGold += WAVE_BONUS;

        // ウェーブクリア演出
        effectsRef.playWaveClear();
        effectsRef.confetti(80);
        effectsRef.setScreenFlash("white");
        setTimeout(() => effectsRef.setScreenFlash(null), 150);
        effectsRef.playBonus();
        
        // ウェーブクリアScorePopup
        if (newWave >= MAX_WAVES) {
          effectsRef.showScorePopup(
            `🏆 ALL WAVES CLEARED! 🏆`,
            "level",
            "xl"
          );
        } else {
          effectsRef.showScorePopup(
            `🎉 WAVE ${newWave} CLEAR! +${WAVE_BONUS}💰`,
            "bonus",
            "lg"
          );
        }

        if (newWave >= MAX_WAVES) {
          newPhase = "won";
          if (newWave > state.highestWave) {
            newHighestWave = newWave;
            saveHighestWave(newHighestWave);
          }
        }
      }

      // Check game over
      const newLives = state.lives - livesLost;
      if (newLives <= 0) {
        newPhase = "lost";
        if (newWave > state.highestWave) {
          newHighestWave = newWave;
          saveHighestWave(newHighestWave);
        }
        // ゲームオーバーScorePopup
        effectsRef.showScorePopup(
          `💀 GAME OVER - Wave ${newWave}`,
          "critical",
          "xl"
        );
      }

      setGameState((prev) => ({
        ...prev,
        phase: newPhase,
        enemies: newEnemies,
        projectiles: updatedProjectiles,
        lives: Math.max(0, newLives),
        gold: newGold,
        waveInProgress: newWaveInProgress,
        enemiesToSpawn: newEnemiesToSpawn,
        spawnTimer: newSpawnTimer,
        highestWave: newHighestWave,
      }));

      animationRef.current = requestAnimationFrame(updateGame);
    };

    animationRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState.phase, playShoot, playKill, playLeak, playWaveClear, burst, explosion, confetti, sparkle, addGoldPopup, playBonus, showScorePopup]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid (subtle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += CELL_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Path
    drawPath(ctx);

    // Spawn point
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(PATH[0].x, PATH[0].y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("S", PATH[0].x, PATH[0].y);

    // End point
    ctx.fillStyle = "#f44336";
    ctx.beginPath();
    ctx.arc(PATH[PATH.length - 1].x, PATH[PATH.length - 1].y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText("E", PATH[PATH.length - 1].x, PATH[PATH.length - 1].y);

    // Towers
    for (const tower of gameState.towers) {
      const buildProgress = buildingTowers.get(tower.id);
      drawTower(ctx, tower, false, buildProgress);
    }

    // Enemies
    for (const enemy of gameState.enemies) {
      drawEnemy(ctx, enemy, frameCountRef.current);
    }

    // Projectiles
    for (const proj of gameState.projectiles) {
      drawProjectile(ctx, proj);

      // Splash preview
      if (proj.towerType === "splash") {
        const target = gameState.enemies.find((e) => e.id === proj.targetId);
        if (target && distance(proj.x, proj.y, target.x, target.y) < 30) {
          ctx.strokeStyle = "rgba(255, 87, 34, 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(target.x, target.y, SPLASH_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Placement preview
    if (gameState.selectedTowerType && mouseGridRef.current && gameState.phase === "playing") {
      const canPlace = canPlaceTower(mouseGridRef.current.x, mouseGridRef.current.y, gameState.towers);
      drawPlacementPreview(
        ctx,
        mouseGridRef.current.x,
        mouseGridRef.current.y,
        gameState.selectedTowerType,
        canPlace
      );
    }
  }, [gameState, buildingTowers]);

  const startGame = useCallback(() => {
    frameCountRef.current = 0;
    resetIds();
    setGameState({
      phase: "playing",
      towers: [],
      enemies: [],
      projectiles: [],
      lives: INITIAL_LIVES,
      gold: INITIAL_GOLD,
      wave: 0,
      waveInProgress: false,
      enemiesToSpawn: 0,
      spawnTimer: 0,
      selectedTowerType: "normal",
      highestWave: loadHighestWave(),
    });
  }, []);

  const startWave = useCallback(() => {
    setGameState((prev) => {
      if (prev.waveInProgress || prev.phase !== "playing") return prev;
      const newWave = prev.wave + 1;
      const enemies = ENEMIES_PER_WAVE_BASE + (newWave - 1) * ENEMIES_PER_WAVE_INCREMENT;
      return {
        ...prev,
        wave: newWave,
        waveInProgress: true,
        enemiesToSpawn: enemies,
        spawnTimer: 0,
      };
    });
  }, []);

  const selectTower = useCallback((type: TowerType) => {
    setGameState((prev) => ({
      ...prev,
      selectedTowerType: prev.selectedTowerType === type ? null : type,
    }));
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (gameState.phase !== "playing" || !gameState.selectedTowerType) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const gridX = Math.floor(x / CELL_SIZE);
      const gridY = Math.floor(y / CELL_SIZE);

      const config = TOWER_CONFIGS[gameState.selectedTowerType];
      if (gameState.gold < config.cost) return;
      if (!canPlaceTower(gridX, gridY, gameState.towers)) return;

      const newTower = createTower(gameState.selectedTowerType, gridX, gridY);
      
      // タワー設置演出
      playBuild();
      sparkle(newTower.x, newTower.y, 12);
      
      // タワー購入ScorePopup
      showScorePopup(
        `🏗️ ${config.name} -${config.cost}💰`,
        "default",
        "sm"
      );
      
      // ビルドアニメーション開始
      setBuildingTowers((prev) => {
        const next = new Map(prev);
        next.set(newTower.id, 0);
        return next;
      });
      
      // ビルドアニメーション進行
      const startTime = performance.now();
      const animateBuild = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / 300, 1);
        setBuildingTowers((prev) => {
          const next = new Map(prev);
          if (progress >= 1) {
            next.delete(newTower.id);
          } else {
            next.set(newTower.id, progress);
          }
          return next;
        });
        if (progress < 1) {
          requestAnimationFrame(animateBuild);
        }
      };
      requestAnimationFrame(animateBuild);

      setGameState((prev) => ({
        ...prev,
        towers: [...prev.towers, newTower],
        gold: prev.gold - config.cost,
      }));
    },
    [gameState.phase, gameState.selectedTowerType, gameState.gold, gameState.towers, playBuild, sparkle, showScorePopup]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      mouseGridRef.current = {
        x: Math.floor(x / CELL_SIZE),
        y: Math.floor(y / CELL_SIZE),
      };
    },
    []
  );

  const handleCanvasMouseLeave = useCallback(() => {
    mouseGridRef.current = null;
  }, []);

  return (
    <GameShell gameId="towerdefense" layout="immersive">
      <ScreenShake ref={screenShakeRef}>
        <div className="td-container">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="td-canvas"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />

          {/* パーティクルレイヤー */}
          <ParticleLayer particles={particles} />

          {/* 画面フラッシュ */}
          {screenFlash && (
            <div
              className={`td-screen-flash ${screenFlash === "red" ? "td-flash-red" : "td-flash-white"}`}
            />
          )}

          {/* ゴールド獲得ポップアップ */}
          {goldPopups.map((popup) => (
            <div
              key={popup.id}
              className="td-gold-popup"
              style={{
                left: popup.x,
                top: popup.y,
              }}
            >
              +{popup.gold}💰
            </div>
          ))}

          {/* ScorePopup */}
          <ScorePopup
            text={scorePopup.text}
            popupKey={scorePopup.key}
            variant={scorePopup.variant}
            size={scorePopup.size}
            x={scorePopup.x}
            y={scorePopup.y}
          />

          {gameState.phase === "playing" && (
            <>
              <div className="td-hud">
                <div className="td-hud-left">
                  <div className="td-hud-item">
                    <span className="icon">❤️</span>
                    <span>{gameState.lives}</span>
                  </div>
                  <div className="td-hud-item">
                    <span className="icon">💰</span>
                    <span>{gameState.gold}</span>
                  </div>
                </div>
                <div className="td-hud-right">
                  <div className="td-hud-item">
                    <span>Wave {gameState.wave}/{MAX_WAVES}</span>
                  </div>
                </div>
              </div>

              <div className="td-tower-info">
                <h4>タワー情報</h4>
                <ul>
                  <li>🟢 通常: 高ダメージ</li>
                  <li>🔵 遅延: 敵を減速</li>
                  <li>🔴 範囲: 範囲攻撃</li>
                </ul>
              </div>

              <div className="td-tower-panel">
                {(["normal", "slow", "splash"] as TowerType[]).map((type) => {
                  const config = TOWER_CONFIGS[type];
                  const canAfford = gameState.gold >= config.cost;
                  return (
                    <button
                      key={type}
                      className="td-tower-btn"
                      onClick={() => selectTower(type)}
                      disabled={!canAfford}
                    >
                      <div
                        className="td-tower-preview"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="name">{config.name}</span>
                      <span className="cost">💰 {config.cost}</span>
                    </button>
                  );
                })}
                <button
                  className="td-wave-btn"
                  onClick={startWave}
                  disabled={gameState.waveInProgress || gameState.wave >= MAX_WAVES}
                >
                  {gameState.wave === 0
                    ? "Wave 1 開始"
                    : gameState.waveInProgress
                    ? "Wave 進行中..."
                    : `Wave ${gameState.wave + 1} 開始`}
                </button>
              </div>
            </>
          )}

          {gameState.phase === "before" && (
            <div className="td-overlay">
              <h1 className="td-title">TOWER DEFENSE</h1>
              <p className="td-subtitle">
                敵の進軍を阻止せよ！<br />
                3種類のタワーを配置して<br />
                10ウェーブを生き残れ！
              </p>
              {gameState.highestWave > 0 && (
                <p className="td-high-record">最高記録: Wave {gameState.highestWave}</p>
              )}
              <button className="td-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}

          {gameState.phase === "won" && (
            <div className="td-overlay">
              <h1 className="td-victory-title">🎉 VICTORY! 🎉</h1>
              <p className="td-result-text">全10ウェーブクリア！</p>
              <p className="td-high-record">残りライフ: {gameState.lives}</p>
              <button className="td-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}

          {gameState.phase === "lost" && (
            <div className="td-overlay">
              <h1 className="td-gameover-title">GAME OVER</h1>
              <p className="td-result-text">Wave {gameState.wave} で敗北</p>
              {gameState.wave === gameState.highestWave && gameState.wave > 0 && (
                <p className="td-high-record">★ NEW RECORD ★</p>
              )}
              <button className="td-start-btn" onClick={startGame}>
                RETRY
              </button>
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
