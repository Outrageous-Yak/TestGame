/** Import Assistant choice types and metadata stored on characters. */

export type SubjectType =
  | "player-character"
  | "npc"
  | "monster"
  | "boss"
  | "creature"
  | "pet"
  | "object"
  | "decoration";

export type SpriteFramingType =
  | "full-body"
  | "bust"
  | "portrait"
  | "token"
  | "face"
  | "floating-object";

export type LogicalSpriteSize = 32 | 64 | 128;

export type PixelStylePreset =
  | "nes"
  | "game-boy"
  | "snes"
  | "modern-pixel"
  | "soft-pixel"
  | "high-detail"
  | "board-token";

export type PalettePreset = 8 | 16 | 24 | 32 | 64;

export type HexPreviewBackground =
  | "transparent"
  | "white"
  | "dark"
  | "forest"
  | "grass"
  | "snow"
  | "lava"
  | "portal"
  | "stone"
  | "water"
  | "dungeon";

export type BoardPreviewMode = "normal" | "selected" | "portal" | "walking" | "idle";

export interface ImportAssistantChoices {
  subjectType: SubjectType;
  spriteFraming: SpriteFramingType;
  logicalSize: LogicalSpriteSize;
  pixelStyle: PixelStylePreset;
  palettePreset: PalettePreset;
}

export interface ImportMeta {
  subjectType: SubjectType;
  spriteFraming: SpriteFramingType;
  logicalSize: LogicalSpriteSize;
  pixelStyle: PixelStylePreset;
  palettePreset: PalettePreset;
}

export const DEFAULT_ASSISTANT_CHOICES: ImportAssistantChoices = {
  subjectType: "player-character",
  spriteFraming: "full-body",
  logicalSize: 64,
  pixelStyle: "modern-pixel",
  palettePreset: 16,
};

export interface CharacterRenderSettings {
  autoCentre: boolean;
  autoScale: boolean;
  feetPosition: number;
  verticalOffset: number;
  horizontalOffset: number;
  outlineEnabled: boolean;
  outlineThickness: number;
  outlineColor: string;
  groundGlow: boolean;
  glowColor: string;
  glowSize: number;
  shadow: boolean;
  shadowOpacity: number;
  shadowBlur: number;
  tokenScale: number;
}

export const DEFAULT_RENDER_SETTINGS: CharacterRenderSettings = {
  autoCentre: true,
  autoScale: true,
  feetPosition: 86,
  verticalOffset: 0,
  horizontalOffset: -10,
  outlineEnabled: false,
  outlineThickness: 1,
  outlineColor: "#0a1020",
  groundGlow: false,
  glowColor: "#78dcff",
  glowSize: 12,
  shadow: true,
  shadowOpacity: 0.45,
  shadowBlur: 18,
  tokenScale: 1.55,
};

export type QualityRating = 1 | 2 | 3 | 4 | 5;

export interface QualityScoreResult {
  stars: QualityRating;
  label: "Poor" | "Needs Editing" | "Acceptable" | "Good" | "Excellent";
  factors: {
    edgeQuality: number;
    contrast: number;
    paletteUsage: number;
    transparency: number;
    boardReadability: number;
  };
}
