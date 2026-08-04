import type { CSSProperties } from "react";
import type { SavedCharacter } from "../spriteTypes";
import { isSpriteSheet } from "../spriteTypes";
import { createCharacterFrameDataUrl, renderCharacterFrameToCanvas } from "../spriteRenderer";
import type { CharacterRenderSettings } from "./importAssistantTypes";

export function renderSettingsToCss(settings: CharacterRenderSettings): CSSProperties {
  const filterParts: string[] = [];
  if (settings.shadow) {
    filterParts.push(
      `drop-shadow(0 ${settings.shadowBlur * 0.55}px ${settings.shadowBlur}px rgba(0,0,0,${settings.shadowOpacity}))`
    );
  }
  if (settings.groundGlow && settings.glowSize > 0) {
    filterParts.push(`drop-shadow(0 0 ${settings.glowSize}px ${settings.glowColor})`);
  }
  if (settings.outlineEnabled && settings.outlineThickness > 0) {
    filterParts.push(`drop-shadow(0 0 ${settings.outlineThickness}px ${settings.outlineColor})`);
  }
  return {
    top: `${settings.feetPosition}%`,
    ["--spriteScale" as string]: settings.tokenScale,
    ["--footX" as string]: `${settings.horizontalOffset}px`,
    ["--footY" as string]: `${settings.verticalOffset}px`,
    filter: filterParts.length ? filterParts.join(" ") : undefined,
    imageRendering: "pixelated",
  };
}

export function exportCharacterPng(character: SavedCharacter, frameIndex = 0): string {
  return createCharacterFrameDataUrl(character, frameIndex);
}

export function exportSpriteSheetPng(character: SavedCharacter): string | null {
  if (!isSpriteSheet(character) || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64 * character.columns;
  canvas.height = 64 * character.rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < character.frames.length; i++) {
    const col = i % character.columns;
    const row = Math.floor(i / character.columns);
    const frameCanvas = renderCharacterFrameToCanvas(character, i);
    ctx.drawImage(frameCanvas, col * 64, row * 64);
  }
  return canvas.toDataURL("image/png");
}

export function exportCharacterJson(character: SavedCharacter): string {
  return JSON.stringify(character, null, 2);
}

export function exportNativeCharacterFile(character: SavedCharacter): string {
  return JSON.stringify({ format: "hexgame-character", version: 1, character }, null, 2);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadText(text: string, filename: string, mime = "application/json"): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function attachCharacterExtras<T extends SavedCharacter>(
  character: T,
  importMeta?: SavedCharacter["importMeta"],
  renderSettings?: SavedCharacter["renderSettings"]
): T {
  return {
    ...character,
    ...(importMeta ? { importMeta } : {}),
    ...(renderSettings ? { renderSettings } : {}),
  };
}
