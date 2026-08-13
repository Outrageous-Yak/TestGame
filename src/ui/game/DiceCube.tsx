import React from "react";
import type { DiceRot } from "./diceGeometry";

export type DiceCubeProps = {
  value: number;
  rot: DiceRot;
  rolling: boolean;
  /** Absolute or public URL for face N (1–6). */
  faceUrl: (n: number) => string;
  sizeClass?: "diceLg" | "";
  "aria-label"?: string;
};

function DiceCorners() {
  return (
    <>
      <span className="diceCorner tl" />
      <span className="diceCorner tr" />
      <span className="diceCorner bl" />
      <span className="diceCorner br" />
    </>
  );
}

/**
 * Shared 3D dice cube presentation (Green risk/villain + Red encounters).
 * Outcome logic stays outside this component.
 */
export function DiceCube({
  value,
  rot,
  rolling,
  faceUrl,
  sizeClass = "diceLg",
  "aria-label": ariaLabel,
}: DiceCubeProps) {
  const classes = ["dice3d", sizeClass, rolling ? "rolling" : ""].filter(Boolean).join(" ");
  return (
    <div className={classes} aria-label={ariaLabel} aria-live="polite">
      <div
        className="cube"
        style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}
      >
        <div className="face face-front" style={{ backgroundImage: `url(${faceUrl(value)})` }}>
          <DiceCorners />
        </div>
        <div className="face face-back" style={{ backgroundImage: `url(${faceUrl(5)})` }}>
          <DiceCorners />
        </div>
        <div className="face face-right" style={{ backgroundImage: `url(${faceUrl(3)})` }}>
          <DiceCorners />
        </div>
        <div className="face face-left" style={{ backgroundImage: `url(${faceUrl(4)})` }}>
          <DiceCorners />
        </div>
        <div className="face face-top" style={{ backgroundImage: `url(${faceUrl(1)})` }}>
          <DiceCorners />
        </div>
        <div className="face face-bottom" style={{ backgroundImage: `url(${faceUrl(6)})` }}>
          <DiceCorners />
        </div>
      </div>
    </div>
  );
}
