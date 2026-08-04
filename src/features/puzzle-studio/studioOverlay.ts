import { posId } from "../../engine/board";
import type { Scenario, Transition } from "../../engine/types";

/** Colour map for portal overlay — keys are portal FROM hex ids. */
export function buildPortalColorMap(
  transitions: Transition[] | undefined
): Map<string, string> {
  const PORTAL_COLORS = ["#f472b6", "#60a5fa", "#a78bfa", "#34d399", "#fb923c", "#f87171"];
  const map = new Map<string, string>();
  if (!transitions) return map;
  transitions.forEach((t, i) => {
    map.set(posId(t.from), PORTAL_COLORS[i % PORTAL_COLORS.length]);
  });
  return map;
}

export type HexOverlayKind = "missing" | "blocked" | "normal" | "none";

export function classifyHexOverlay(
  missing: boolean,
  blocked: boolean,
  overlays: { missing: boolean; blocked: boolean }
): HexOverlayKind {
  if (overlays.missing && missing) return "missing";
  if (overlays.blocked && blocked && !missing) return "blocked";
  if (overlays.missing && !missing && !blocked) return "normal";
  return "none";
}

export function serializeScenarioExport(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}
