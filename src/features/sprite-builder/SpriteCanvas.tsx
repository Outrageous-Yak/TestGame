import React, { useCallback, useRef } from "react";
import type { SpriteTool } from "./spriteTypes";
import { SPRITE_WIDTH } from "./spriteTypes";
import { applyBrushStroke } from "./spriteDrawing";

type SpriteCanvasProps = {
  pixels: number[];
  palette: { value: string }[];
  tool: SpriteTool;
  colorIndex: number;
  zoom: number;
  onPaintStroke: (fromX: number, fromY: number, toX: number, toY: number, value: number) => void;
  onFill: (x: number, y: number, value: number) => void;
  onPickColor: (index: number) => void;
  ariaLabel?: string;
};

function cellFromEvent(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  zoom: number
): { x: number; y: number } | null {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / zoom);
  const y = Math.floor((e.clientY - rect.top) / zoom);
  if (x < 0 || x >= SPRITE_WIDTH || y < 0 || y >= SPRITE_WIDTH) return null;
  return { x, y };
}

export function SpriteCanvas({
  pixels,
  palette,
  tool,
  colorIndex,
  zoom,
  onPaintStroke,
  onFill,
  onPickColor,
  ariaLabel = "Pixel sprite canvas",
}: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastCell = useRef<{ x: number; y: number } | null>(null);
  const painting = useRef(false);

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, SPRITE_WIDTH * zoom, SPRITE_WIDTH * zoom);
      ctx.imageSmoothingEnabled = false;

      for (let y = 0; y < SPRITE_WIDTH; y++) {
        for (let x = 0; x < SPRITE_WIDTH; x++) {
          const idx = pixels[y * SPRITE_WIDTH + x] ?? 0;
          const color = palette[idx]?.value ?? "transparent";
          if (color !== "transparent") {
            ctx.fillStyle = color;
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= SPRITE_WIDTH; i++) {
        const p = i * zoom + 0.5;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, SPRITE_WIDTH * zoom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, p);
        ctx.lineTo(SPRITE_WIDTH * zoom, p);
        ctx.stroke();
      }
    },
    [pixels, palette, zoom]
  );

  const paintRef = useRef(drawGrid);
  paintRef.current = drawGrid;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintRef.current(ctx);
  }, [drawGrid]);

  const applyAt = (cell: { x: number; y: number }, isStart: boolean) => {
    const { x, y } = cell;
    const idx = pixels[y * SPRITE_WIDTH + x] ?? 0;

    if (tool === "eyedropper") {
      onPickColor(idx);
      return;
    }

    if (tool === "fill") {
      if (isStart) onFill(x, y, colorIndex);
      return;
    }

    const value = tool === "eraser" ? 0 : colorIndex;
    const prev = lastCell.current;
    if (isStart || !prev) {
      onPaintStroke(x, y, x, y, value);
    } else if (prev.x !== x || prev.y !== y) {
      onPaintStroke(prev.x, prev.y, x, y, value);
    }
    lastCell.current = cell;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    painting.current = true;
    const cell = cellFromEvent(e, canvas, zoom);
    if (!cell) return;
    lastCell.current = cell;
    applyAt(cell, true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cell = cellFromEvent(e, canvas, zoom);
    if (!cell) return;
    applyAt(cell, false);
  };

  const endPaint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!painting.current) return;
    painting.current = false;
    lastCell.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="spriteCanvas"
      width={SPRITE_WIDTH * zoom}
      height={SPRITE_WIDTH * zoom}
      role="img"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPaint}
      onPointerCancel={endPaint}
      onPointerLeave={endPaint}
    />
  );
}

export { applyBrushStroke };
