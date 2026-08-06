import React, { useMemo } from "react";
import { hashCloudSeed } from "../cloud/cloudSeed";
import "./reachSparkle.css";

const SPARKLE_COLORS = [
  "#ff6bcb",
  "#67a5ff",
  "#ffd36a",
  "#19ffb4",
  "#a58bff",
  "#ff9f5a",
  "#5af0ff",
  "#ff5d7a",
];

const SPARKLE_COUNT = 7;

export interface ReachSparkleProps {
  hexId: string;
  reducedMotion?: boolean;
}

function sparkleParticleStyle(hexId: string, index: number): React.CSSProperties {
  const h = hashCloudSeed([hexId, "sparkle", String(index)]);
  const h2 = hashCloudSeed([hexId, "sparkle-pos", String(index)]);
  const color = SPARKLE_COLORS[h % SPARKLE_COLORS.length];
  const x = 18 + (h2 % 6400) / 100;
  const y = 14 + ((h2 >>> 8) % 7200) / 100;
  const size = 3.5 + (h % 30) / 10;
  const rot = (h % 90) - 45;
  const dur = 1.1 + (h % 9) / 10;
  const delay = ((h >>> 4) % 14) / 10;

  return {
    ["--sparkleColor" as string]: color,
    ["--sparkleX" as string]: `${x}%`,
    ["--sparkleY" as string]: `${y}%`,
    ["--sparkleSize" as string]: `${size}px`,
    ["--sparkleRot" as string]: `${rot}deg`,
    ["--sparkleDur" as string]: `${dur}s`,
    ["--sparkleDelay" as string]: `${delay}s`,
    ["--sparkleScale" as string]: String(0.85 + (h % 5) / 10),
  };
}

export function ReachSparkle({ hexId, reducedMotion = false }: ReachSparkleProps) {
  const particles = useMemo(
    () => Array.from({ length: SPARKLE_COUNT }, (_, i) => sparkleParticleStyle(hexId, i)),
    [hexId]
  );

  return (
    <div
      className={["reachSparkle", reducedMotion ? "reachSparkleReduced" : ""].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      {particles.map((style, i) => (
        <span key={i} className="reachSparkleParticle" style={style} />
      ))}
    </div>
  );
}
