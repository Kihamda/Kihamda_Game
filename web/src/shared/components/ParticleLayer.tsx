import type { Particle } from "../hooks/useParticles";

interface Props {
  particles: Particle[];
}

/** パーティクルタイプに応じたスタイルを生成 */
function getParticleStyle(p: Particle): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    left: p.x,
    top: p.y,
    pointerEvents: "none",
  };

  switch (p.type) {
    case "confetti":
      return {
        ...base,
        width: p.size,
        height: p.size * 0.6,
        background: p.color,
        borderRadius: "2px",
        animation: `particle-confetti ${p.dur}ms ease-out forwards`,
        "--tx": `${p.tx}px`,
        "--ty": `${p.ty}px`,
        "--rot": `${p.rotation ?? 0}deg`,
      } as React.CSSProperties;

    case "sparkle":
      return {
        ...base,
        width: p.size,
        height: p.size,
        background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
        borderRadius: "50%",
        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
        animation: `particle-sparkle ${p.dur}ms ease-out forwards`,
        "--tx": `${p.tx}px`,
        "--ty": `${p.ty}px`,
        "--scale": p.scale ?? 1,
      } as React.CSSProperties;

    case "star":
      return {
        ...base,
        width: p.size,
        height: p.size,
        background: p.color,
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        animation: `particle-explosion ${p.dur}ms ease-out forwards`,
        "--tx": `${p.tx}px`,
        "--ty": `${p.ty}px`,
        "--rot": `${p.rotation ?? 0}deg`,
      } as React.CSSProperties;

    default: // circle
      return {
        ...base,
        width: p.size,
        height: p.size,
        borderRadius: "50%",
        background: p.color,
        boxShadow: `0 0 ${p.size}px ${p.color}`,
        animation: `particle-fade ${p.dur}ms ease-out forwards`,
        "--tx": `${p.tx}px`,
        "--ty": `${p.ty}px`,
      } as React.CSSProperties;
  }
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
        zIndex: 100,
      }}
    >
      {particles.map((p) => (
        <div key={p.id} style={getParticleStyle(p)} />
      ))}
    </div>
  );
}
