import { useState, useCallback, useRef } from "react";

export type ParticleType = "circle" | "confetti" | "sparkle" | "star";

export interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  size: number;
  dur: number;
  type: ParticleType;
  rotation?: number;
  scale?: number;
}

const PARTICLE_COLORS = [
  "#facc15",
  "#f59e0b",
  "#fb923c",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#f472b6",
];

const CONFETTI_COLORS = [
  "#ff6b6b",
  "#feca57",
  "#48dbfb",
  "#ff9ff3",
  "#54a0ff",
  "#5f27cd",
  "#00d2d3",
  "#1dd1a1",
];

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);

  /** 基本バースト（円形パーティクル） */
  const burst = useCallback((x: number, y: number, count = 12) => {
    const now = idRef.current;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: now + i,
      x,
      y,
      tx: (Math.random() - 0.5) * 120,
      ty: -(Math.random() * 80 + 40),
      color:
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: Math.random() * 6 + 4,
      dur: Math.random() * 400 + 500,
      type: "circle" as ParticleType,
    }));
    idRef.current += count;
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, 1000);
  }, []);

  /** 紙吹雪エフェクト（画面全体） */
  const confetti = useCallback((count = 50) => {
    const now = idRef.current;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: now + i,
      x: Math.random() * window.innerWidth,
      y: -20,
      tx: (Math.random() - 0.5) * 200,
      ty: window.innerHeight + 100,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 6,
      dur: Math.random() * 1500 + 2000,
      type: "confetti" as ParticleType,
      rotation: Math.random() * 720 - 360,
    }));
    idRef.current += count;
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, 3500);
  }, []);

  /** キラキラエフェクト（指定座標周辺） */
  const sparkle = useCallback((x: number, y: number, count = 8) => {
    const now = idRef.current;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist = Math.random() * 60 + 30;
      return {
        id: now + i,
        x,
        y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color: Math.random() > 0.5 ? "#ffffff" : "#ffe066",
        size: Math.random() * 4 + 2,
        dur: Math.random() * 300 + 400,
        type: "sparkle" as ParticleType,
        scale: Math.random() * 0.5 + 0.5,
      };
    });
    idRef.current += count;
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, 800);
  }, []);

  /** 爆発エフェクト（放射状に拡散） */
  const explosion = useCallback((x: number, y: number, count = 24) => {
    const now = idRef.current;
    const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = Math.random() * 150 + 50;
      return {
        id: now + i,
        x,
        y,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        color:
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: Math.random() * 10 + 6,
        dur: Math.random() * 400 + 600,
        type: "star" as ParticleType,
        rotation: Math.random() * 360,
      };
    });
    idRef.current += count;
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, 1200);
  }, []);

  const clear = useCallback(() => setParticles([]), []);

  return { particles, burst, confetti, sparkle, explosion, clear };
}
