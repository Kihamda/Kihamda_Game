import { useState, useRef, useEffect, useCallback } from "react";
import { GameShell } from "@shared/components/GameShell";
import {
  useAudio,
  useParticles,
  ParticleLayer,
  ScreenShake,
  ComboCounter,
  ScorePopup,
  useHighScore,
  ShareButton,
  GameRecommendations,
} from "@shared";
import type { ScreenShakeHandle, PopupVariant } from "@shared";
import "./App.css";

// Game constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const SUN_RADIUS = 30;
const PLANET_RADIUS = 12;
const ORBIT_RADIUS = 100;
const STAR_RADIUS = 8;
const ASTEROID_MIN_SIZE = 10;
const ASTEROID_MAX_SIZE = 25;
const NEAR_MISS_THRESHOLD = 30;

// Types
interface Planet {
  angle: number;
  angularVelocity: number; // radians per frame
  orbitRadius: number;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

interface Star {
  id: number;
  angle: number; // angle around sun
  orbitRadius: number;
  collected: boolean;
  pulsePhase: number;
}

type GamePhase = "before" | "playing" | "gameover";

let asteroidIdCounter = 0;
let starIdCounter = 0;

// Pure functions
function createPlanet(): Planet {
  return {
    angle: -Math.PI / 2, // Start at top
    angularVelocity: 0.025,
    orbitRadius: ORBIT_RADIUS,
  };
}

function getPlanetPosition(planet: Planet, centerX: number, centerY: number) {
  return {
    x: centerX + Math.cos(planet.angle) * planet.orbitRadius,
    y: centerY + Math.sin(planet.angle) * planet.orbitRadius,
  };
}

function createAsteroid(difficulty: number): Asteroid {
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number, vx: number, vy: number;
  const baseSpeed = 1.5 + difficulty * 0.3;
  const speed = baseSpeed + Math.random() * 1.5;
  
  switch (side) {
    case 0: // top
      x = Math.random() * CANVAS_WIDTH;
      y = -30;
      vx = (Math.random() - 0.5) * 2;
      vy = speed;
      break;
    case 1: // right
      x = CANVAS_WIDTH + 30;
      y = Math.random() * CANVAS_HEIGHT;
      vx = -speed;
      vy = (Math.random() - 0.5) * 2;
      break;
    case 2: // bottom
      x = Math.random() * CANVAS_WIDTH;
      y = CANVAS_HEIGHT + 30;
      vx = (Math.random() - 0.5) * 2;
      vy = -speed;
      break;
    default: // left
      x = -30;
      y = Math.random() * CANVAS_HEIGHT;
      vx = speed;
      vy = (Math.random() - 0.5) * 2;
  }

  return {
    id: asteroidIdCounter++,
    x,
    y,
    vx,
    vy,
    size: ASTEROID_MIN_SIZE + Math.random() * (ASTEROID_MAX_SIZE - ASTEROID_MIN_SIZE),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.1,
  };
}

function createStar(): Star {
  const minOrbit = ORBIT_RADIUS - 50;
  const maxOrbit = ORBIT_RADIUS + 80;
  return {
    id: starIdCounter++,
    angle: Math.random() * Math.PI * 2,
    orbitRadius: minOrbit + Math.random() * (maxOrbit - minOrbit),
    collected: false,
    pulsePhase: Math.random() * Math.PI * 2,
  };
}

function getStarPosition(star: Star, centerX: number, centerY: number) {
  return {
    x: centerX + Math.cos(star.angle) * star.orbitRadius,
    y: centerY + Math.sin(star.angle) * star.orbitRadius,
  };
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const shakeRef = useRef<ScreenShakeHandle>(null);
  
  const [phase, setPhase] = useState<GamePhase>("before");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [popup, setPopup] = useState<{ text: string; key: number; variant: PopupVariant; x: string; y: string } | null>(null);
  
  const planetRef = useRef<Planet>(createPlanet());
  const asteroidsRef = useRef<Asteroid[]>([]);
  const starsRef = useRef<Star[]>([]);
  const frameCountRef = useRef(0);
  const comboTimerRef = useRef(0);
  const nearMissActiveRef = useRef(false);
  const popupKeyRef = useRef(0);
  
  const { best, update: updateHighScore } = useHighScore("orbitdodge");
  const audio = useAudio();
  const { particles, burst, sparkle, explosion, confetti } = useParticles();
  
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  
  const showPopup = useCallback((text: string, variant: PopupVariant = "default", x = "50%", y = "40%") => {
    popupKeyRef.current++;
    setPopup({ text, key: popupKeyRef.current, variant, x, y });
    setTimeout(() => setPopup(null), 1200);
  }, []);
  
  // Click/tap to change direction
  const handleClick = useCallback(() => {
    if (phase === "playing") {
      planetRef.current.angularVelocity *= -1;
      audio.playTone(600, 0.05, "sine", 0.15);
    }
  }, [phase, audio]);
  
  // Start game
  const startGame = useCallback(() => {
    planetRef.current = createPlanet();
    asteroidsRef.current = [];
    starsRef.current = [createStar()];
    frameCountRef.current = 0;
    comboTimerRef.current = 0;
    nearMissActiveRef.current = false;
    setScore(0);
    setCombo(0);
    setDifficulty(1);
    setPhase("playing");
    audio.playTone(440, 0.1, "sine", 0.2);
  }, [audio]);
  
  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    
    const update = () => {
      const planet = planetRef.current;
      const asteroids = asteroidsRef.current;
      const stars = starsRef.current;
      frameCountRef.current++;
      
      // Update planet
      planet.angle += planet.angularVelocity;
      const planetPos = getPlanetPosition(planet, centerX, centerY);
      
      // Spawn asteroids
      const spawnRate = Math.max(30, 90 - difficulty * 10);
      if (frameCountRef.current % spawnRate === 0) {
        asteroidsRef.current = [...asteroids, createAsteroid(difficulty)];
      }
      
      // Update asteroids
      let hitDetected = false;
      let nearMissThisFrame = false;
      
      asteroidsRef.current = asteroidsRef.current
        .map(a => ({
          ...a,
          x: a.x + a.vx,
          y: a.y + a.vy,
          rotation: a.rotation + a.rotationSpeed,
        }))
        .filter(a => {
          // Check collision with planet
          const dist = distance(planetPos.x, planetPos.y, a.x, a.y);
          if (dist < PLANET_RADIUS + a.size * 0.8) {
            hitDetected = true;
            return false;
          }
          
          // Check near miss (dopamine!)
          if (dist < PLANET_RADIUS + a.size + NEAR_MISS_THRESHOLD && dist > PLANET_RADIUS + a.size) {
            nearMissThisFrame = true;
          }
          
          // Remove off-screen asteroids
          return a.x > -50 && a.x < CANVAS_WIDTH + 50 && 
                 a.y > -50 && a.y < CANVAS_HEIGHT + 50;
        });
      
      // Near miss effect
      if (nearMissThisFrame && !nearMissActiveRef.current) {
        nearMissActiveRef.current = true;
        shakeRef.current?.shake("light", 100);
        audio.playTone(800, 0.03, "sine", 0.1);
        // Small score bonus for near miss
        setScore(s => s + 5);
      } else if (!nearMissThisFrame) {
        nearMissActiveRef.current = false;
      }
      
      // Check star collection
      starsRef.current = stars.filter(star => {
        if (star.collected) return false;
        const starPos = getStarPosition(star, centerX, centerY);
        const dist = distance(planetPos.x, planetPos.y, starPos.x, starPos.y);
        if (dist < PLANET_RADIUS + STAR_RADIUS) {
          // Collected!
          const comboBonus = Math.min(combo, 10);
          const points = 100 + comboBonus * 20;
          setScore(s => s + points);
          setCombo(c => c + 1);
          comboTimerRef.current = 180; // 3 seconds at 60fps
          
          // Effects
          sparkle(starPos.x, starPos.y, 12);
          burst(starPos.x, starPos.y, 8);
          audio.playTone(880, 0.08, "sine", 0.2);
          audio.playTone(1100, 0.08, "sine", 0.15);
          
          // Score popup
          const pxX = `${(starPos.x / CANVAS_WIDTH) * 100}%`;
          const pxY = `${(starPos.y / CANVAS_HEIGHT) * 100}%`;
          if (combo >= 5) {
            showPopup(`+${points} x${combo + 1}`, "combo", pxX, pxY);
          } else if (combo >= 2) {
            showPopup(`+${points}`, "bonus", pxX, pxY);
          } else {
            showPopup(`+${points}`, "default", pxX, pxY);
          }
          
          // Spawn new star
          starsRef.current = [...starsRef.current.filter(s => s.id !== star.id), createStar()];
          return false;
        }
        return true;
      });
      
      // Combo timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current--;
        if (comboTimerRef.current === 0) {
          setCombo(0);
        }
      }
      
      // Increase difficulty over time
      if (frameCountRef.current % 600 === 0) { // Every 10 seconds
        setDifficulty(d => Math.min(d + 1, 10));
      }
      
      // Game over
      if (hitDetected) {
        explosion(planetPos.x, planetPos.y, 30);
        shakeRef.current?.shake("heavy", 500);
        audio.playMiss();
        audio.playNoise(0.3, 0.5, 500);
        
        setPhase("gameover");
        setScore(prevScore => {
          const isNewBest = updateHighScore(prevScore);
          if (isNewBest) {
            confetti(80);
            audio.playLevelUp();
          } else {
            audio.playGameOver();
          }
          return prevScore;
        });
        return;
      }
      
      animationRef.current = requestAnimationFrame(update);
    };
    
    animationRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, centerX, centerY, combo, difficulty, audio, burst, sparkle, explosion, confetti, updateHighScore, showPopup]);
  
  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let drawFrameId = 0;
    
    const draw = () => {
      // Clear
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw background stars
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 80; i++) {
        const x = (i * 97 + frameCountRef.current * 0.05) % CANVAS_WIDTH;
        const y = (i * 131) % CANVAS_HEIGHT;
        const size = (i % 3 === 0) ? 2 : 1;
        ctx.globalAlpha = 0.3 + Math.sin(frameCountRef.current * 0.02 + i) * 0.2;
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
      
      // Draw orbit path
      ctx.strokeStyle = "rgba(100, 150, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 10]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ORBIT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw sun with glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, SUN_RADIUS * 2);
      gradient.addColorStop(0, "#ffdd00");
      gradient.addColorStop(0.4, "#ff8800");
      gradient.addColorStop(0.7, "#ff440044");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, SUN_RADIUS * 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffcc00";
      ctx.beginPath();
      ctx.arc(centerX, centerY, SUN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw stars (collectibles)
      for (const star of starsRef.current) {
        if (star.collected) continue;
        const pos = getStarPosition(star, centerX, centerY);
        const pulse = 1 + Math.sin(frameCountRef.current * 0.1 + star.pulsePhase) * 0.2;
        
        // Star glow
        const starGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, STAR_RADIUS * 2);
        starGradient.addColorStop(0, "rgba(255, 255, 100, 0.8)");
        starGradient.addColorStop(0.5, "rgba(255, 200, 50, 0.3)");
        starGradient.addColorStop(1, "transparent");
        ctx.fillStyle = starGradient;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, STAR_RADIUS * 2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw star shape
        ctx.fillStyle = "#ffff66";
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(frameCountRef.current * 0.03);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? STAR_RADIUS * pulse : STAR_RADIUS * 0.4 * pulse;
          const nextAngle = ((i + 1) * Math.PI * 2) / 5 - Math.PI / 2;
          const nextR = (i + 1) % 2 === 0 ? STAR_RADIUS * pulse : STAR_RADIUS * 0.4 * pulse;
          if (i === 0) {
            ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.lineTo(Math.cos(nextAngle) * nextR, Math.sin(nextAngle) * nextR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      
      // Draw asteroids
      ctx.fillStyle = "#665555";
      ctx.strokeStyle = "#887766";
      ctx.lineWidth = 2;
      for (const asteroid of asteroidsRef.current) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation);
        
        // Irregular asteroid shape
        ctx.beginPath();
        const vertices = 8;
        for (let i = 0; i < vertices; i++) {
          const angle = (i / vertices) * Math.PI * 2;
          const wobble = 0.7 + Math.sin(i * 2.5) * 0.3;
          const r = asteroid.size * wobble;
          if (i === 0) {
            ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
          } else {
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw planet
      if (phase !== "gameover") {
        const planetPos = getPlanetPosition(planetRef.current, centerX, centerY);
        
        // Planet trail
        ctx.strokeStyle = "rgba(100, 200, 255, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        const trailLength = 0.4;
        const startAngle = planetRef.current.angle - trailLength * Math.sign(planetRef.current.angularVelocity);
        ctx.arc(
          centerX, centerY, 
          planetRef.current.orbitRadius, 
          startAngle, 
          planetRef.current.angle, 
          planetRef.current.angularVelocity < 0
        );
        ctx.stroke();
        
        // Planet glow
        const planetGradient = ctx.createRadialGradient(
          planetPos.x, planetPos.y, 0, 
          planetPos.x, planetPos.y, PLANET_RADIUS * 2
        );
        planetGradient.addColorStop(0, "rgba(100, 200, 255, 0.5)");
        planetGradient.addColorStop(1, "transparent");
        ctx.fillStyle = planetGradient;
        ctx.beginPath();
        ctx.arc(planetPos.x, planetPos.y, PLANET_RADIUS * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Planet
        ctx.fillStyle = "#4488ff";
        ctx.beginPath();
        ctx.arc(planetPos.x, planetPos.y, PLANET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // Planet highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.arc(planetPos.x - 3, planetPos.y - 3, PLANET_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw HUD
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE: ${String(score).padStart(6, "0")}`, 15, 30);
      ctx.fillText(`BEST:  ${String(best).padStart(6, "0")}`, 15, 55);
      
      ctx.textAlign = "right";
      ctx.fillStyle = difficulty >= 5 ? "#ff6666" : difficulty >= 3 ? "#ffaa66" : "#ffffff";
      ctx.fillText(`LV ${difficulty}`, CANVAS_WIDTH - 15, 30);
      
      if (phase === "playing") {
        drawFrameId = requestAnimationFrame(draw);
      }
    };
    
    if (phase === "playing") {
      draw();
    } else {
      // Draw static frame
      draw();
    }
    
    return () => {
      if (drawFrameId) {
        cancelAnimationFrame(drawFrameId);
      }
    };
  }, [phase, score, best, difficulty, centerX, centerY]);
  
  return (
    <GameShell gameId="orbitdodge" layout="immersive">
      <ScreenShake ref={shakeRef}>
        <div className="orbitdodge-container" onClick={handleClick}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="orbitdodge-canvas"
          />
          
          <ParticleLayer particles={particles} />
          
          {popup && (
            <ScorePopup
              text={popup.text}
              popupKey={popup.key}
              variant={popup.variant}
              x={popup.x}
              y={popup.y}
            />
          )}
          
          {phase === "playing" && (
            <ComboCounter combo={combo} position="top-right" threshold={2} />
          )}
          
          {phase === "before" && (
            <div className="orbitdodge-overlay">
              <h1 className="orbitdodge-title">ORBIT DODGE</h1>
              <div className="orbitdodge-sun-icon">☀️</div>
              <p className="orbitdodge-instruction">
                太陽の周りを回りながら<br />
                小惑星を避けて星を集めよう！<br /><br />
                <span className="orbitdodge-highlight">タップ / クリック</span><br />
                で回転方向を変更
              </p>
              <button className="orbitdodge-start-btn" onClick={startGame}>
                START
              </button>
            </div>
          )}
          
          {phase === "gameover" && (
            <div className="orbitdodge-overlay">
              <h1 className="orbitdodge-gameover">GAME OVER</h1>
              <p className="orbitdodge-final-score">
                SCORE: {score}
              </p>
              {score === best && score > 0 && (
                <p className="orbitdodge-new-record">★ NEW HIGH SCORE ★</p>
              )}
              <button className="orbitdodge-start-btn" onClick={startGame}>
                RETRY
              </button>
              <ShareButton score={score} gameTitle="Orbit Dodge" gameId="orbitdodge" />
              <GameRecommendations currentGameId="orbitdodge" />
            </div>
          )}
        </div>
      </ScreenShake>
    </GameShell>
  );
}
