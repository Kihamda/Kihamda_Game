import { useState, useCallback, useRef } from "react";

export interface Particle {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  size: number;
  dur: number;
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

export function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);

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
    }));
    idRef.current += count;
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) =>
        prev.filter((p) => !newParticles.some((n) => n.id === p.id)),
      );
    }, 1000);
  }, []);

  const clear = useCallback(() => setParticles([]), []);

  return { particles, burst, clear };
}
