import type { ConversionSettings } from "./pixelConversion";
import { DEFAULT_CONVERSION_SETTINGS } from "./pixelConversion";
import type { CropTransform } from "./imageCrop";
import { DEFAULT_CROP_TRANSFORM, fitCharacterTransform } from "./imageCrop";
import type {
  ImportAssistantChoices,
  ImportMeta,
  PixelStylePreset,
  PalettePreset,
  SpriteFramingType,
  CharacterRenderSettings,
} from "./importAssistantTypes";
import { DEFAULT_RENDER_SETTINGS } from "./importAssistantTypes";
import type { PaletteSizeOption } from "./pixelConversion";

export function applyPixelStylePreset(style: PixelStylePreset): Partial<ConversionSettings> {
  switch (style) {
    case "nes":
      return { mode: "retro", paletteSize: 8, contrast: 15, dithering: "off", outline: "dark", detailLevel: 30 };
    case "game-boy":
      return { mode: "retro", paletteSize: 8, contrast: 10, saturation: -20, dithering: "ordered", outline: "off", detailLevel: 25 };
    case "snes":
      return { mode: "detailed", paletteSize: 16, contrast: 5, dithering: "off", outline: "auto", detailLevel: 55 };
    case "modern-pixel":
      return { mode: "clean", paletteSize: 24, contrast: 0, dithering: "off", outline: "auto", detailLevel: 60 };
    case "soft-pixel":
      return { mode: "clean", paletteSize: 24, contrast: -5, saturation: 5, dithering: "ordered", outline: "off", detailLevel: 50 };
    case "high-detail":
      return { mode: "detailed", paletteSize: 32, contrast: 0, dithering: "off", outline: "auto", detailLevel: 85 };
    case "board-token":
      return { mode: "silhouette", paletteSize: 12, contrast: 20, outline: "dark", detailLevel: 40 };
    default:
      return {};
  }
}

export function applyPalettePreset(preset: PalettePreset): PaletteSizeOption {
  return preset as PaletteSizeOption;
}

export function applyFramingToCrop(
  framing: SpriteFramingType,
  imageWidth: number,
  imageHeight: number,
  workspaceSize: number
): CropTransform {
  const base = fitCharacterTransform(imageWidth, imageHeight, workspaceSize);
  switch (framing) {
    case "full-body":
      return { ...base, scale: base.scale * 0.92, offsetY: workspaceSize * 0.02 };
    case "bust":
      return { ...base, scale: base.scale * 1.15, offsetY: -workspaceSize * 0.08 };
    case "portrait":
      return { ...base, scale: base.scale * 1.25, offsetY: -workspaceSize * 0.12 };
    case "token":
      return { ...base, scale: Math.max(base.scale, workspaceSize / Math.max(imageWidth, imageHeight)) * 1.05 };
    case "face":
      return { ...base, scale: base.scale * 1.45, offsetY: -workspaceSize * 0.15 };
    case "floating-object":
      return { ...base, scale: base.scale * 0.88, offsetY: -workspaceSize * 0.04 };
    default:
      return base;
  }
}

export function buildConversionFromAssistant(choices: ImportAssistantChoices): ConversionSettings {
  const stylePart = applyPixelStylePreset(choices.pixelStyle);
  const paletteSize = applyPalettePreset(choices.palettePreset);
  const detailBoost = choices.logicalSize === 128 ? 15 : choices.logicalSize === 32 ? -10 : 0;
  return {
    ...DEFAULT_CONVERSION_SETTINGS,
    ...stylePart,
    paletteSize,
    detailLevel: Math.max(0, Math.min(100, (stylePart.detailLevel ?? DEFAULT_CONVERSION_SETTINGS.detailLevel) + detailBoost)),
  };
}

export function buildRenderSettingsFromAssistant(choices: ImportAssistantChoices): CharacterRenderSettings {
  const base = { ...DEFAULT_RENDER_SETTINGS };
  if (choices.spriteFraming === "token" || choices.pixelStyle === "board-token") {
    base.tokenScale = 1.7;
    base.autoScale = true;
  }
  if (choices.spriteFraming === "floating-object") {
    base.feetPosition = 78;
    base.verticalOffset = -4;
  }
  if (choices.subjectType === "boss" || choices.subjectType === "monster") {
    base.tokenScale = 1.65;
    base.shadowOpacity = 0.55;
  }
  if (choices.pixelStyle === "nes" || choices.pixelStyle === "game-boy") {
    base.outlineEnabled = true;
    base.outlineThickness = 1;
  }
  return base;
}

export function choicesToImportMeta(choices: ImportAssistantChoices): ImportMeta {
  return { ...choices };
}

export function logicalSizeLabel(size: number): string {
  switch (size) {
    case 32:
      return "Best for tiny board tokens.";
    case 64:
      return "Recommended.";
    case 128:
      return "Highest detail.";
    default:
      return "";
  }
}

export function palettePresetHint(preset: PalettePreset): string {
  if (preset <= 16) return "Recommended for retro styles.";
  if (preset <= 32) return "Recommended for most characters.";
  return "Recommended for high detail.";
}
