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

/** Visual types rendered on the board (hole is registered but unused for missing cells). */
export const TILE_VISUAL_TYPES: TileVisualType[] = [
  "normal",
  "blocked",
  "goal",
  "start",
  "stairsUp",
  "stairsDown",
  "fog",
];

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

/** Stable CSS class for a visual type (background set once in injected stylesheet). */
export function tileArtClassName(visual: TileVisualType): string {
  return `tile-${visual}`;
}

const urlCache = new Map<string, string>();
const preloadStarted = new Set<string>();
const preloadFailed = new Set<string>();

/** Memoized absolute/public URL for a relative asset path. */
export function cachedPublicUrl(relPath: string, toPublicUrl: (p: string) => string): string {
  const hit = urlCache.get(relPath);
  if (hit) return hit;
  const url = toPublicUrl(relPath);
  urlCache.set(relPath, url);
  return url;
}

/**
 * Build CSS rules that assign --tileArt once per visual type (shared by all hexes).
 * Theme override uses `.hexInner.tile-theme`.
 */
export function buildTileArtCssRules(toPublicUrl: (p: string) => string): string {
  const lines: string[] = [];
  for (const visual of TILE_VISUAL_TYPES) {
    const url = cachedPublicUrl(tileArtRelPath(visual), toPublicUrl);
    if (preloadFailed.has(url)) continue;
    lines.push(
      `.hexInner.${tileArtClassName(visual)}{--tileArt:url("${url}");}`
    );
  }
  return lines.join("\n");
}

/** Theme hexTile override rule (single shared URL for all tiles). */
export function buildThemeTileCssRule(hexTile: string, toPublicUrl: (p: string) => string): string {
  const url = cachedPublicUrl(hexTile, toPublicUrl);
  if (preloadFailed.has(url)) return "";
  return `.hexInner.tile-theme{--tileArt:url("${url}");}`;
}

/** Preload each tile URL once; failed URLs are not retried. */
export function preloadTileArt(toPublicUrl: (p: string) => string): void {
  const urls = TILE_VISUAL_TYPES.map((v) => cachedPublicUrl(tileArtRelPath(v), toPublicUrl));
  for (const url of urls) {
    if (preloadStarted.has(url) || preloadFailed.has(url)) continue;
    preloadStarted.add(url);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      preloadStarted.add(url);
    };
    img.onerror = () => {
      preloadFailed.add(url);
    };
    img.src = url;
  }
}
