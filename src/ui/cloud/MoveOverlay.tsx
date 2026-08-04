import React from "react";

export interface MoveOverlayProps {
  glowVar: string;
  pulse?: boolean;
  cardPulse?: boolean;
}

/** Full Cloud legal-move hex overlay — above cloud, below portal/goal/player. */
export function MoveOverlay({ glowVar, pulse = true, cardPulse = false }: MoveOverlayProps) {
  return (
    <div
      className={["moveOverlay", pulse ? "moveOverlayPulse" : "", cardPulse ? "moveOverlayCard" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ ["--moveGlow" as string]: glowVar } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}
