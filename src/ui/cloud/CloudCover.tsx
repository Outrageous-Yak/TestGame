import React, { useMemo } from "react";
import type { CloudDensity } from "./cloudSeed";
import { deriveCloudSeed, cloudSeedClassName } from "./cloudSeed";

export interface CloudCoverProps {
  scenarioId: string;
  layerId: string;
  hexId: string;
  density: CloudDensity;
  hidden?: boolean;
  reducedMotion?: boolean;
  transitioning?: "revealing" | "concealing" | null;
}

export function CloudCover({
  scenarioId,
  layerId,
  hexId,
  density,
  hidden = false,
  reducedMotion = false,
  transitioning = null,
}: CloudCoverProps) {
  const seed = useMemo(
    () => deriveCloudSeed(scenarioId, layerId, hexId, density),
    [scenarioId, layerId, hexId, density]
  );

  if (hidden) return null;

  const classes = [
    "cloudCover",
    density === "partial" ? "cloudPartialDensity" : "cloudFullDensity",
    cloudSeedClassName(seed, density),
    reducedMotion ? "cloudReducedMotion" : "",
    transitioning === "revealing" ? "cloudRevealing" : "",
    transitioning === "concealing" ? "cloudConcealing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    ["--cloudScaleX" as string]: String(seed.scaleX),
    ["--cloudScaleY" as string]: String(seed.scaleY),
    ["--cloudRot" as string]: `${seed.rotationDeg}deg`,
    ["--cloudDriftX" as string]: `${seed.driftX}px`,
    ["--cloudDriftY" as string]: `${seed.driftY}px`,
    ["--cloudDur" as string]: `${seed.durationSec}s`,
    ["--cloudInnerDur" as string]: `${seed.innerDurationSec}s`,
    ["--cloudWisp" as string]: `${seed.wispOffset}%`,
  } as React.CSSProperties;

  return (
    <div className={classes} style={style} aria-hidden="true">
      <div className="cloudMass cloudMassBack" />
      <div className="cloudMass cloudMassMid" />
      <div className="cloudMass cloudMassFront" />
      <div className="cloudWisp cloudWispA" />
      <div className="cloudWisp cloudWispB" />
    </div>
  );
}
