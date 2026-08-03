import React, { useEffect, useMemo, useState } from "react";
import type { SavedPixelSprite } from "./spriteTypes";
import { createPixelSpriteDataUrl } from "./spriteRenderer";

type Facing = "down" | "up" | "left" | "right";

type PlayerTokenProps = {
  variant: "board" | "mini";
  customSprite: SavedPixelSprite | null;
  isWalking?: boolean;
  walkFrame?: number;
  playerFacing?: Facing;
  spriteSheetUrl: string;
  frameW?: number;
  frameH?: number;
  cols?: number;
  rows?: number;
};

function facingRow(facing: Facing): number {
  switch (facing) {
    case "down":
      return 0;
    case "left":
      return 1;
    case "right":
      return 2;
    case "up":
      return 3;
    default:
      return 0;
  }
}

export function PlayerToken({
  variant,
  customSprite,
  isWalking = false,
  walkFrame = 0,
  playerFacing = "down",
  spriteSheetUrl,
  frameW = 128,
  frameH = 128,
  cols = 4,
  rows = 5,
}: PlayerTokenProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!customSprite) {
      setDataUrl(null);
      return;
    }
    setDataUrl(createPixelSpriteDataUrl(customSprite));
  }, [customSprite]);

  if (!customSprite || !dataUrl) {
    const className = variant === "board" ? "playerSpriteSheet" : "miniSprite";
    const walking = variant === "board" && isWalking ? " walking" : "";
    return (
      <span
        className={className + walking}
        style={
          {
            ["--spriteImg" as string]: `url(${spriteSheetUrl})`,
            ["--frameW" as string]: frameW,
            ["--frameH" as string]: frameH,
            ["--cols" as string]: cols,
            ["--rows" as string]: rows,
            ["--frameX" as string]: walkFrame,
            ["--frameY" as string]: facingRow(playerFacing),
          } as React.CSSProperties
        }
      />
    );
  }

  if (variant === "mini") {
    return (
      <img
        src={dataUrl}
        alt=""
        className="miniPixelSprite"
        draggable={false}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt=""
      className="playerPixelSprite"
      draggable={false}
    />
  );
}

export function useCustomSprite(activeId: string | null, sprites: SavedPixelSprite[]): SavedPixelSprite | null {
  return useMemo(() => {
    if (!activeId) return null;
    return sprites.find((s) => s.id === activeId) ?? null;
  }, [activeId, sprites]);
}
