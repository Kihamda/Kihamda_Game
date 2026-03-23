import { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell } from '@shared/components/GameShell';
import { useHighScore } from '@shared/hooks/useHighScore';
import { useAudio, useParticles, ParticleLayer, ScorePopup } from '@shared';
import type { PopupVariant } from '@shared';
import './App.css';

type Phase = 'start' | 'playing' | 'gameover';

const COLORS = ['#FF3366', '#FFCC00', '#00FF66', '#33CCFF'];
const WIDTH = 400;
const HEIGHT = 700;
const BALL_SIZE = 24;
const GRAVITY = 0.4;
const JUMP_FORCE = -10;
const RING_SPEED = 0.02;

interface Ring {
  id: number;
  y: number;
  rotation: number;
  size: number;
}

interface GameState {
  ballY: number;
  ballVelocity: number;
  ballColor: number;
  rings: Ring[];
  score: number;
  cameraY: number;
  passedRings: Set<number>;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('start');
  const [gameState, setGameState] = useState<GameState>({
    ballY: HEIGHT / 2,
    ballVelocity: 0,
    ballColor: 0,
    rings: [],
    score: 0,
    cameraY: 0,
    passedRings: new Set(),
  });
  const { best: highScore, update: updateHighScore } = useHighScore('colorswitch');
  
  // ScorePopup state
  const [popup, setPopup] = useState<{ text: string; key: number; variant: PopupVariant } | null>(null);
  const popupKeyRef = useRef(0);

  // Dopamine hooks
  const { particles, sparkle, explosion } = useParticles();
  const { playTone } = useAudio();
  
  // Use refs for callbacks used in game loop to avoid stale closures
  const playPassRef = useRef<() => void>(() => {});
  const playDeathRef = useRef<() => void>(() => {});
  const sparkleRef = useRef<(x: number, y: number) => void>(() => {});
  const explosionRef = useRef<(x: number, y: number) => void>(() => {});
  const showPopupRef = useRef<(text: string, variant: PopupVariant) => void>(() => {});
  
  useEffect(() => {
    playPassRef.current = () => playTone(660, 0.08, 'sine');
    playDeathRef.current = () => playTone(180, 0.3, 'sawtooth');
    sparkleRef.current = sparkle;
    explosionRef.current = explosion;
    showPopupRef.current = (text: string, variant: PopupVariant) => {
      setPopup({ text, key: ++popupKeyRef.current, variant });
    };
  }, [playTone, sparkle, explosion]);
  
  const playJump = useCallback(() => playTone(440, 0.05, 'triangle'), [playTone]);

  const nextRingId = useRef(0);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameOverRef = useRef(false);

  const createRing = useCallback((y: number, id: number): Ring => {
    return {
      id,
      y,
      rotation: Math.random() * Math.PI * 2,
      size: 80 + Math.random() * 20,
    };
  }, []);

  const initGame = useCallback(() => {
    nextRingId.current = 0;
    gameOverRef.current = false;
    lastTimeRef.current = 0;
    const initialRings: Ring[] = [];
    for (let i = 0; i < 5; i++) {
      initialRings.push(createRing(HEIGHT / 2 - 150 - i * 180, nextRingId.current++));
    }
    setGameState({
      rings: initialRings,
      ballY: HEIGHT / 2 + 100,
      ballVelocity: 0,
      ballColor: Math.floor(Math.random() * 4),
      score: 0,
      cameraY: 0,
      passedRings: new Set(),
    });
  }, [createRing]);

  const startGame = useCallback(() => {
    initGame();
    setPhase('playing');
  }, [initGame]);

  const jump = useCallback(() => {
    if (phase === 'playing') {
      setGameState(prev => ({ ...prev, ballVelocity: JUMP_FORCE }));
      playJump();
    }
  }, [phase, playJump]);

  const handleClick = useCallback(() => {
    if (phase === 'start') {
      startGame();
    } else if (phase === 'playing') {
      jump();
    } else if (phase === 'gameover') {
      setPhase('start');
    }
  }, [phase, startGame, jump]);

  // Game loop - all state updates happen here
  useEffect(() => {
    if (phase !== 'playing') return;

    const gameLoop = (timestamp: number) => {
      if (gameOverRef.current) return;
      
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimeRef.current) / 16.67, 2);
      lastTimeRef.current = timestamp;

      setGameState(prev => {
        // Physics update
        const newVelocity = prev.ballVelocity + GRAVITY * delta;
        const newBallY = prev.ballY + newVelocity * delta;
        
        // Camera follows ball
        const targetCam = Math.max(0, HEIGHT / 2 - newBallY);
        const newCameraY = prev.cameraY + (targetCam - prev.cameraY) * 0.1;
        
        // Floor collision check
        if (newBallY > HEIGHT - BALL_SIZE / 2 + newCameraY) {
          gameOverRef.current = true;
          playDeathRef.current();
          explosionRef.current(WIDTH / 2, HEIGHT / 2);
          updateHighScore(prev.score);
          setPhase('gameover');
          return prev;
        }
        
        // Update rings rotation
        const updatedRings = prev.rings.map(ring => ({
          ...ring,
          rotation: ring.rotation + RING_SPEED * delta,
        }));
        
        // Collision detection with rings
        const ballScreenY = newBallY - newCameraY;
        let newScore = prev.score;
        let newBallColor = prev.ballColor;
        const newPassedRings = new Set(prev.passedRings);
        
        for (const ring of updatedRings) {
          const ringScreenY = ring.y + newCameraY;
          const distY = Math.abs(ballScreenY - ringScreenY);
          
          // Check collision with ring edge
          if (distY < BALL_SIZE / 2 + 10) {
            const distFromCenter = Math.abs(ballScreenY - ringScreenY);
            
            if (distFromCenter < ring.size && distFromCenter > ring.size - 30) {
              // Determine which color segment
              const angle = (ring.rotation + Math.PI / 2) % (Math.PI * 2);
              const segment = Math.floor(((angle + Math.PI * 4) % (Math.PI * 2)) / (Math.PI / 2)) % 4;
              
              if (segment !== prev.ballColor) {
                gameOverRef.current = true;
                playDeathRef.current();
                explosionRef.current(WIDTH / 2, HEIGHT / 2);
                updateHighScore(prev.score);
                setPhase('gameover');
                return prev;
              }
            }
          }
          
          // Score when ball passes through ring center
          if (!newPassedRings.has(ring.id) && ringScreenY > ballScreenY + 30) {
            newPassedRings.add(ring.id);
            newScore = prev.score + 1;
            playPassRef.current();
            sparkleRef.current(WIDTH / 2, HEIGHT / 2);
            
            // Color change bonus popup
            const colorChanged = newBallColor !== Math.floor(Math.random() * 4);
            newBallColor = Math.floor(Math.random() * 4);
            
            // Milestone check (every 10 points)
            if (newScore > 0 && newScore % 10 === 0) {
              showPopupRef.current(`🎯 ${newScore}点!`, 'level');
            } else if (colorChanged && newScore > 1) {
              showPopupRef.current('COLOR!', 'bonus');
            } else {
              showPopupRef.current(`+1`, 'default');
            }
          }
        }
        
        // Add new rings and remove old ones
        const filteredRings = updatedRings.filter(r => r.y + newCameraY < HEIGHT + 100);
        if (filteredRings.length > 0) {
          const topRing = Math.min(...filteredRings.map(r => r.y));
          if (topRing > -HEIGHT) {
            const newRing = createRing(topRing - 180, nextRingId.current++);
            filteredRings.push(newRing);
          }
        }
        
        return {
          ...prev,
          ballY: newBallY,
          ballVelocity: newVelocity,
          cameraY: newCameraY,
          rings: filteredRings,
          score: newScore,
          ballColor: newBallColor,
          passedRings: newPassedRings,
        };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, createRing, updateHighScore]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClick]);

  const renderRing = (ring: Ring) => {
    const screenY = ring.y + gameState.cameraY;
    if (screenY < -150 || screenY > HEIGHT + 150) return null;

    return (
      <g
        key={ring.id}
        transform={`translate(${WIDTH / 2}, ${screenY}) rotate(${(ring.rotation * 180) / Math.PI})`}
      >
        {COLORS.map((color, i) => (
          <path
            key={i}
            d={`M 0 0 L ${ring.size} 0 A ${ring.size} ${ring.size} 0 0 1 ${
              Math.cos(Math.PI / 2) * ring.size
            } ${Math.sin(Math.PI / 2) * ring.size} Z`}
            fill={color}
            transform={`rotate(${i * 90})`}
            style={{ filter: 'drop-shadow(0 0 5px rgba(0,0,0,0.3))' }}
          />
        ))}
        <circle cx={0} cy={0} r={ring.size - 25} fill="#1a1a2e" />
      </g>
    );
  };

  const { ballY, ballColor, cameraY, rings, score } = gameState;

  return (
    <GameShell gameId="colorswitch" layout="immersive">
      <div 
        className="colorswitch-container"
        style={{ width: WIDTH, height: HEIGHT, position: 'relative' }}
        onClick={handleClick}
      >
        <svg width={WIDTH} height={HEIGHT} className="colorswitch-canvas">
          <defs>
            <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#2a2a4e" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </radialGradient>
          </defs>
          
          <rect width={WIDTH} height={HEIGHT} fill="url(#bgGradient)" />
          
          {/* Rings */}
          {rings.map(renderRing)}
          
          {/* Ball */}
          {phase !== 'start' && (
            <circle
              cx={WIDTH / 2}
              cy={ballY - cameraY}
              r={BALL_SIZE / 2}
              fill={COLORS[ballColor]}
              style={{ filter: 'drop-shadow(0 0 10px ' + COLORS[ballColor] + ')' }}
            />
          )}
        </svg>

        {/* Score */}
        <div className="colorswitch-score">{score}</div>
        
        {/* High Score */}
        <div className="colorswitch-highscore">BEST: {highScore}</div>

        {/* Start Screen */}
        {phase === 'start' && (
          <div className="colorswitch-overlay">
            <h1 className="colorswitch-title">COLOR SWITCH</h1>
            <p className="colorswitch-subtitle">通過できるのは同じ色だけ</p>
            <div className="colorswitch-tap">タップでスタート</div>
          </div>
        )}

        {/* Game Over Screen */}
        {phase === 'gameover' && (
          <div className="colorswitch-overlay">
            <h2 className="colorswitch-gameover">GAME OVER</h2>
            <p className="colorswitch-final-score">SCORE: {score}</p>
            {score === highScore && score > 0 && (
              <p className="colorswitch-newbest">NEW BEST!</p>
            )}
            <div className="colorswitch-tap">タップでリトライ</div>
          </div>
        )}
        <ParticleLayer particles={particles} />
        {popup && (
          <ScorePopup
            text={popup.text}
            popupKey={popup.key}
            variant={popup.variant}
            y="35%"
            size="lg"
          />
        )}
      </div>
    </GameShell>
  );
}
