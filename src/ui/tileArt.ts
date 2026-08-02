/**
 * Centralized tile-art registry for the React board renderer.
 * Maps visual tile types to PNG assets under public/tiles/demo/.
 */

export type TileVisualType =
  | "normal"
  | "blocked"
  | "goal"
  | "start"
  | "stairsUp"
  | "stairsDown"
  | "fog"
  | "hole";

const TILE_DEMO_DIR = "tiles/demo";

/** Relative paths (from public/) for each visual type. */
export const TILE_ART_FILES: Record<TileVisualType, string> = {
  normal: "NORMAL.png",
  blocked: "BLOCKED.png",
  fog: "FOG.png",
  goal: "GOAL.png",
  hole: "HOLE.png",
  stairsUp: "STAIRS_UP.png",
  stairsDown: "STAIRS_DOWN.png",
  start: "START.png",
};

export type TileVisualContext = {
  revealed: boolean;
  blocked: boolean;
  isGoal: boolean;
  isStart: boolean;
  isPortalUp: boolean;
  isPortalDown: boolean;
};

/**
 * Priority (highest first): fog → blocked → goal → start → stairsUp → stairsDown → normal.
 * `hole` is registered but not used for missing cells (spacing/interaction unchanged).
 */
export function resolveTileVisualType(ctx: TileVisualContext): TileVisualType {
  if (!ctx.revealed) return "fog";
  if (ctx.blocked) return "blocked";
  if (ctx.isGoal) return "goal";
  if (ctx.isStart) return "start";
  if (ctx.isPortalUp) return "stairsUp";
  if (ctx.isPortalDown) return "stairsDown";
  return "normal";
}

/** Public-relative path for a visual type, e.g. `tiles/demo/NORMAL.png`. */
export function tileArtRelPath(visual: TileVisualType): string {
  return `${TILE_DEMO_DIR}/${TILE_ART_FILES[visual]}`;
}
