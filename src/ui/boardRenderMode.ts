export type BoardRenderMode = "FLAT" | "OLD_2_5D" | "PROJECTED";

/** Development mode on PR #11 branch. Production must remain FLAT until approved. */
export const BOARD_RENDER_MODE: BoardRenderMode = "PROJECTED";

export function isFlatMode(mode: BoardRenderMode = BOARD_RENDER_MODE): boolean {
  return mode === "FLAT";
}

export function isOld25DMode(mode: BoardRenderMode = BOARD_RENDER_MODE): boolean {
  return mode === "OLD_2_5D";
}

export function isProjectedMode(mode: BoardRenderMode = BOARD_RENDER_MODE): boolean {
  return mode === "PROJECTED";
}
