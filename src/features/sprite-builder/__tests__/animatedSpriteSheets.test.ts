import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANIMATED_SPRITE_SHEETS,
  DEFAULT_ANIMATED_SPRITE_ID,
  GOTHIC_ELF_SPRITE_ID,
  resolveAnimatedSpriteSheet,
  selectionIdForAnimatedSprite,
} from "../animatedSpriteSheets";

describe("animated sprite sheets", () => {
  it("registers the default and gothic elf characters", () => {
    expect(ANIMATED_SPRITE_SHEETS.map((sheet) => sheet.id)).toEqual([
      DEFAULT_ANIMATED_SPRITE_ID,
      GOTHIC_ELF_SPRITE_ID,
    ]);
    expect(resolveAnimatedSpriteSheet(GOTHIC_ELF_SPRITE_ID).name).toBe(
      "Gothic Elf Mage"
    );
    expect(resolveAnimatedSpriteSheet(null).id).toBe(DEFAULT_ANIMATED_SPRITE_ID);
    expect(selectionIdForAnimatedSprite(ANIMATED_SPRITE_SHEETS[0])).toBeNull();
  });

  it("ships the gothic elf as a transparent 512x640 PNG", () => {
    const file = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "..",
        "public",
        "images",
        "players",
        "gothic-elf-mage.png"
      )
    );

    expect(file.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(file.readUInt32BE(16)).toBe(512);
    expect(file.readUInt32BE(20)).toBe(640);
    expect(file[25]).toBe(6); // RGBA
  });
});
