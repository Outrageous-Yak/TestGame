import { describe, expect, it } from "vitest";
import {
  applyFramingToCrop,
  applyPixelStylePreset,
  buildConversionFromAssistant,
  buildRenderSettingsFromAssistant,
  choicesToImportMeta,
} from "../import/importPresets";
import { DEFAULT_ASSISTANT_CHOICES } from "../import/importAssistantTypes";
import { computeQualityScore, formatQualityStars, estimateCharacterStorageBytes } from "../import/importQualityScore";
import { renderSettingsToCss, exportCharacterJson, attachCharacterExtras } from "../import/importExport";
import { createBlankSprite } from "../spriteConstants";
import { DEFAULT_RENDER_SETTINGS } from "../import/importAssistantTypes";

describe("importPresets", () => {
  it("applies pixel style presets with palette and dither settings", () => {
    const nes = applyPixelStylePreset("nes");
    expect(nes.paletteSize).toBe(8);
    expect(nes.dithering).toBe("off");

    const gb = applyPixelStylePreset("game-boy");
    expect(gb.dithering).toBe("ordered");
  });

  it("buildConversionFromAssistant merges style and palette", () => {
    const choices = { ...DEFAULT_ASSISTANT_CHOICES, pixelStyle: "nes" as const, palettePreset: 16 as const };
    const settings = buildConversionFromAssistant(choices);
    expect(settings.paletteSize).toBe(16);
    expect(settings.mode).toBe("retro");
  });

  it("applyFramingToCrop adjusts scale for token framing", () => {
    const full = applyFramingToCrop("full-body", 200, 400, 512);
    const token = applyFramingToCrop("token", 200, 400, 512);
    expect(token.scale).toBeGreaterThanOrEqual(full.scale);
  });

  it("buildRenderSettingsFromAssistant adjusts token scale for board-token style", () => {
    const rs = buildRenderSettingsFromAssistant({
      ...DEFAULT_ASSISTANT_CHOICES,
      pixelStyle: "board-token",
      spriteFraming: "token",
    });
    expect(rs.tokenScale).toBeGreaterThan(DEFAULT_RENDER_SETTINGS.tokenScale);
  });

  it("choicesToImportMeta stores assistant values", () => {
    const meta = choicesToImportMeta(DEFAULT_ASSISTANT_CHOICES);
    expect(meta.subjectType).toBe("player-character");
    expect(meta.logicalSize).toBe(64);
  });
});

describe("importQualityScore", () => {
  it("scores a painted sprite", () => {
    const sprite = createBlankSprite();
    sprite.pixels.fill(2);
    sprite.pixels[0] = 0;
    const score = computeQualityScore(sprite);
    expect(score.stars).toBeGreaterThanOrEqual(1);
    expect(score.stars).toBeLessThanOrEqual(5);
    expect(formatQualityStars(score.stars)).toHaveLength(5);
  });

  it("estimates storage bytes", () => {
    const sprite = createBlankSprite();
    expect(estimateCharacterStorageBytes(sprite)).toBeGreaterThan(100);
  });
});

describe("render adjustments and export", () => {
  it("renderSettingsToCss maps token scale and offsets", () => {
    const css = renderSettingsToCss({
      ...DEFAULT_RENDER_SETTINGS,
      tokenScale: 1.8,
      horizontalOffset: -5,
    });
    expect(css["--spriteScale" as keyof typeof css]).toBe(1.8);
    expect(String(css["--footX" as keyof typeof css])).toContain("-5");
  });

  it("exportCharacterJson includes render settings when attached", () => {
    const sprite = attachCharacterExtras(createBlankSprite(), choicesToImportMeta(DEFAULT_ASSISTANT_CHOICES), DEFAULT_RENDER_SETTINGS);
    const json = exportCharacterJson(sprite);
    expect(json).toContain("renderSettings");
    expect(json).toContain("importMeta");
  });
});
