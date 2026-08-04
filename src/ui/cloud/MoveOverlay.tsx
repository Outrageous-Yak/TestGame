import React from "react";

export interface MoveOverlayProps {
  glowVar: string;
  pulse?: boolean;
}

/** Full Cloud legal-move hex overlay — above cloud, below portal/goal/player. */
export function MoveOverlay({ glowVar, pulse = true }: MoveOverlayProps) {
  return (
    <div
      className={["moveOverlay", pulse ? "moveOverlayPulse" : ""].filter(Boolean).join(" ")}
      style={{ ["--moveGlow" as string]: glowVar } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
