import React, { useEffect, useRef } from "react";
import type { SavedPixelSprite } from "./spriteTypes";
import { renderPixelSpriteToCanvas } from "./spriteRenderer";

type SpritePreviewProps = {
  sprite: SavedPixelSprite;
  size?: number;
  label?: string;
};

export function SpritePreview({ sprite, size = 96, label }: SpritePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rendered = renderPixelSpriteToCanvas(sprite, canvas);
    const ctx = rendered.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
  }, [sprite]);

  return (
    <div className="spritePreview" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={64}
        height={64}
        style={{ width: size, height: size, imageRendering: "pixelated" }}
        aria-label={label ?? `${sprite.name} preview`}
      />
    </div>
  );
}
