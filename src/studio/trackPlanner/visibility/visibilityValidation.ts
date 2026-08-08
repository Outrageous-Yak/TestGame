import type { VisibilityOverlay, VisibilityStateType } from "../types";
import { inBoardBounds, isMissingHex, posKey, dedupeMaskPositions } from "./visibilityMask";
import type { PlannerTrack } from "../types";

export type VisibilityValidationSeverity = "green" | "amber" | "red";

export type VisibilityValidationItem = {
  severity: VisibilityValidationSeverity;
  message: string;
  notes?: string;
};

const LANTERN_RADIUS_MIN = 1;
const LANTERN_RADIUS_MAX = 4;
const MEMORY_REVEAL_MIN = 1;
const MEMORY_REVEAL_MAX = 30;

const RUNTIME_SUPPORTED_STATES: Set<VisibilityStateType> = new Set([
  "REGULAR",
  "PARTLY_CLOUDY",
  "FULL_CLOUD",
  "NIGHT",
  "INVISIBLE",
  "MEMORY",
  "LANTERN",
  "CRYSTAL_VISION",
  "ECHO",
]);

export function validateVisibilityOverlay(
  track: PlannerTrack,
  overlay: VisibilityOverlay,
  overlayIndex: number,
  totalOverlays: number,
): VisibilityValidationItem[] {
  const items: VisibilityValidationItem[] = [];

  if (!RUNTIME_SUPPORTED_STATES.has(overlay.state)) {
    items.push({ severity: "red", message: `Unrecognized visibility state: ${overlay.state}` });
  } else if (overlay.state !== "REGULAR") {
    items.push({
      severity: "green",
      message: `${overlay.state} maps to supported runtime presentation`,
    });
  }

  if (overlay.coverage === "CUSTOM") {
    if (overlay.positions.length === 0) {
      items.push({ severity: "red", message: "Custom mask has no positions" });
    } else {
      items.push({
        severity: "amber",
        message: "Custom visibility mask is preserved in authoring metadata but is not yet applied by production runtime",
        notes: "FULL_BOARD coverage is required for runtime parity today",
      });
    }

    const deduped = dedupeMaskPositions(overlay.positions);
    if (deduped.length !== overlay.positions.length) {
      items.push({ severity: "amber", message: "Custom mask contains duplicate positions" });
    }

    for (const p of deduped) {
      if (!inBoardBounds(p)) {
        items.push({
          severity: "red",
          message: `Mask position ${posKey(p)} is out of bounds`,
        });
      } else if (isMissingHex(track, p)) {
        items.push({
          severity: "amber",
          message: `Mask position ${posKey(p)} is on missing geometry`,
          notes: "Missing hex ≠ invisible overlay",
        });
      }
    }
  }

  if (overlay.state === "LANTERN") {
    const r = overlay.lanternRadius ?? 2;
    if (r < LANTERN_RADIUS_MIN || r > LANTERN_RADIUS_MAX) {
      items.push({
        severity: "red",
        message: `Lantern radius ${r} out of range (${LANTERN_RADIUS_MIN}–${LANTERN_RADIUS_MAX})`,
      });
    }
  }

  if (overlay.state === "MEMORY") {
    const sec = overlay.memoryRevealSec ?? 5;
    if (sec < MEMORY_REVEAL_MIN || sec > MEMORY_REVEAL_MAX) {
      items.push({
        severity: "red",
        message: `Memory reveal ${sec}s out of range (${MEMORY_REVEAL_MIN}–${MEMORY_REVEAL_MAX})`,
      });
    }
  }

  if (overlay.movement && overlay.movement.direction !== "NONE" && overlay.movement.amount > 0) {
    items.push({
      severity: "amber",
      message: "Overlay movement is authored but runtime movement is not implemented",
      notes: "Metadata preserved for future independent overlay system",
    });
  }

  if (overlayIndex > 0) {
    items.push({
      severity: "amber",
      message: `Overlay #${overlayIndex + 1} cannot be exported — only the first overlay maps to runtime`,
    });
  }

  if (totalOverlays > 1) {
    items.push({
      severity: "amber",
      message: "Multiple visibility overlays authored; runtime uses first overlay only",
    });
  }

  return items;
}

export function validateAllVisibility(track: PlannerTrack): VisibilityValidationItem[] {
  const items: VisibilityValidationItem[] = [];
  const overlays = track.visibility.length ? track.visibility : [];
  if (overlays.length === 0) {
    items.push({ severity: "green", message: "REGULAR — no special visibility" });
    return items;
  }
  overlays.forEach((o, i) => {
    items.push(...validateVisibilityOverlay(track, o, i, overlays.length));
  });
  return items;
}
