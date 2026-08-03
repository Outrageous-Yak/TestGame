import React, { useEffect, useRef, useState } from "react";
import type { SavedCharacter } from "./spriteTypes";
import { isSpriteSheet } from "./spriteTypes";
import { createCharacterFrameDataUrl, pickPlaybackFrame } from "./spriteRenderer";
import { renderSettingsToCss } from "./import/importExport";

type Facing = "down" | "up" | "left" | "right";

type PlayerTokenProps = {
  variant: "board" | "mini";
  customCharacter: SavedCharacter | null;
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
  customCharacter,
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
  const animStart = useRef(performance.now());
  const [animTick, setAnimTick] = useState(0);

  const hasCustomAnimation =
    customCharacter && isSpriteSheet(customCharacter) && (customCharacter.animation?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasCustomAnimation) return;
    let raf = 0;
    const tick = () => {
      setAnimTick(performance.now() - animStart.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasCustomAnimation, customCharacter?.id, customCharacter?.updatedAt]);

  useEffect(() => {
    animStart.current = performance.now();
  }, [isWalking, customCharacter?.id]);

  useEffect(() => {
    if (!customCharacter) {
      setDataUrl(null);
      return;
    }
    const frameIndex = hasCustomAnimation
      ? pickPlaybackFrame(customCharacter, isWalking, animTick)
      : 0;
    setDataUrl(createCharacterFrameDataUrl(customCharacter, frameIndex));
  }, [customCharacter, hasCustomAnimation, isWalking, animTick]);

  if (!customCharacter || !dataUrl) {
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
    return <img src={dataUrl} alt="" className="miniPixelSprite" draggable={false} />;
  }

  const rs = customCharacter.renderSettings;
  const extraStyle = rs ? renderSettingsToCss(rs) : undefined;

  return (
    <img
      src={dataUrl}
      alt=""
      className="playerPixelSprite"
      style={extraStyle}
      draggable={false}
    />
  );
}

export function useCustomCharacter(
  activeId: string | null,
  characters: SavedCharacter[]
): SavedCharacter | null {
  if (!activeId) return null;
  return characters.find((s) => s.id === activeId) ?? null;
}

/** @deprecated Use useCustomCharacter */
export function useCustomSprite(activeId: string | null, characters: SavedCharacter[]): SavedCharacter | null {
  return useCustomCharacter(activeId, characters);
}
