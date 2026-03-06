import type { Particle } from "../hooks/useParticles";

interface Props {
  particles: Particle[];
}

export function ParticleLayer({ particles }: Props) {
  if (particles.length === 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `calc(${p.x}px + ${p.tx}px)`,
            top: `calc(${p.y}px + ${p.ty}px)`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
            opacity: 0,
            animation: `particle-fade ${p.dur}ms ease-out forwards`,
          }}
        />
      ))}
    </div>
  );
}
