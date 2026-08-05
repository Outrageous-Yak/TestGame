import { describe, expect, it } from "vitest";
import { selectHexTileArtUrl, shouldShowMovableFlashHexTile } from "./hexTileVisual";

const REGULAR = "worlds/forgotten_citadel/assets/tiles/hex-normal.png";
const MOVABLE = "worlds/forgotten_citadel/assets/tiles/hex-normal-white.png";

describe("Forgotten Citadel hex tile visual", () => {
  it("non-movable hex uses regular image", () => {
    expect(selectHexTileArtUrl(REGULAR, MOVABLE, false, false)).toBe(REGULAR);
    expect(selectHexTileArtUrl(REGULAR, MOVABLE, false, true)).toBe(REGULAR);
  });

  it("movable hex uses regular image when flash is inactive", () => {
    expect(shouldShowMovableFlashHexTile(MOVABLE, true, false)).toBe(false);
    expect(selectHexTileArtUrl(REGULAR, MOVABLE, true, false)).toBe(REGULAR);
  });

  it("movable hex uses white image during reach pulse flash", () => {
    expect(shouldShowMovableFlashHexTile(MOVABLE, true, true)).toBe(true);
    expect(selectHexTileArtUrl(REGULAR, MOVABLE, true, true)).toBe(MOVABLE);
  });

  it("falls back to regular image when movable artwork is missing", () => {
    expect(selectHexTileArtUrl(REGULAR, undefined, true, true)).toBe(REGULAR);
    expect(selectHexTileArtUrl(REGULAR, "", true, true)).toBe(REGULAR);
  });

  it("non-reachable hex never uses white movable image", () => {
    expect(selectHexTileArtUrl(REGULAR, MOVABLE, false, true)).toBe(REGULAR);
  });
});
