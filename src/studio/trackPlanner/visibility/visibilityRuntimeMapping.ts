import type { CloudMode, ExtendedVisibilityMode } from "../../../ui/types";
import type { VisibilityOverlay, VisibilityStateType } from "../types";

/** Runtime presentation fields derived from a planner visibility overlay. */
export type RuntimeVisibilityExport = {
  cloudMode?: CloudMode;
  visibilityMode?: ExtendedVisibilityMode;
  visibilityParams?: {
    lanternRadius?: number;
    memoryRevealSec?: number;
  };
};

const STATE_LABELS: Record<VisibilityStateType, string> = {
  REGULAR: "Regular",
  PARTLY_CLOUDY: "Partly Cloudy",
  FULL_CLOUD: "Full Cloud",
  NIGHT: "Night",
  INVISIBLE: "Invisible",
  MEMORY: "Memory",
  LANTERN: "Lantern",
  CRYSTAL_VISION: "Crystal Vision",
  ECHO: "Echo",
};

export function visibilityStateLabel(state: VisibilityStateType): string {
  return STATE_LABELS[state];
}

/** Planner state → runtime ScenarioEntry fields (first overlay wins). */
export function overlayToRuntimeExport(overlay: VisibilityOverlay): RuntimeVisibilityExport {
  const params: RuntimeVisibilityExport["visibilityParams"] = {};
  if (overlay.lanternRadius != null) params.lanternRadius = overlay.lanternRadius;
  if (overlay.memoryRevealSec != null) params.memoryRevealSec = overlay.memoryRevealSec;
  const hasParams = Object.keys(params).length > 0;

  switch (overlay.state) {
    case "REGULAR":
      return {};
    case "PARTLY_CLOUDY":
      return { cloudMode: "cloudy", ...(hasParams ? { visibilityParams: params } : {}) };
    case "FULL_CLOUD":
      return { cloudMode: "full_cloud", ...(hasParams ? { visibilityParams: params } : {}) };
    case "NIGHT":
      return { visibilityMode: "night", ...(hasParams ? { visibilityParams: params } : {}) };
    case "INVISIBLE":
      return { visibilityMode: "invisible", ...(hasParams ? { visibilityParams: params } : {}) };
    case "MEMORY":
      return {
        visibilityMode: "memory",
        visibilityParams: { memoryRevealSec: overlay.memoryRevealSec ?? 5, ...params },
      };
    case "LANTERN":
      return {
        visibilityMode: "lantern",
        visibilityParams: { lanternRadius: overlay.lanternRadius ?? 2, ...params },
      };
    case "CRYSTAL_VISION":
      return { visibilityMode: "crystal_vision", ...(hasParams ? { visibilityParams: params } : {}) };
    case "ECHO":
      return { visibilityMode: "echo", ...(hasParams ? { visibilityParams: params } : {}) };
    default:
      return {};
  }
}

/** Effective runtime export from overlay list — uses first overlay only. */
export function visibilityOverlaysToRuntimeExport(
  overlays: VisibilityOverlay[],
): RuntimeVisibilityExport {
  const primary = overlays[0];
  if (!primary || primary.state === "REGULAR") return {};
  return overlayToRuntimeExport(primary);
}

/** Import runtime ScenarioEntry / export JSON fields into a planner overlay. */
export function runtimeImportToOverlay(
  entry: {
    cloudMode?: string;
    visibilityMode?: string;
    visibilityParams?: { lanternRadius?: number; memoryRevealSec?: number };
  },
  existing?: VisibilityOverlay,
): VisibilityOverlay {
  const base: VisibilityOverlay = existing ?? {
    id: "vis_default",
    state: "REGULAR",
    coverage: "FULL_BOARD",
    positions: [],
  };

  if (entry.visibilityMode === "night") {
    return { ...base, state: "NIGHT", ...paramsFromRuntime(entry.visibilityParams) };
  }
  if (entry.visibilityMode === "invisible") {
    return { ...base, state: "INVISIBLE", ...paramsFromRuntime(entry.visibilityParams) };
  }
  if (entry.visibilityMode === "memory") {
    return {
      ...base,
      state: "MEMORY",
      memoryRevealSec: entry.visibilityParams?.memoryRevealSec ?? 5,
      ...paramsFromRuntime(entry.visibilityParams),
    };
  }
  if (entry.visibilityMode === "lantern") {
    return {
      ...base,
      state: "LANTERN",
      lanternRadius: entry.visibilityParams?.lanternRadius ?? 2,
      ...paramsFromRuntime(entry.visibilityParams),
    };
  }
  if (entry.visibilityMode === "crystal_vision") {
    return { ...base, state: "CRYSTAL_VISION", ...paramsFromRuntime(entry.visibilityParams) };
  }
  if (entry.visibilityMode === "echo") {
    return { ...base, state: "ECHO", ...paramsFromRuntime(entry.visibilityParams) };
  }
  if (entry.cloudMode === "cloudy") {
    return { ...base, state: "PARTLY_CLOUDY", ...paramsFromRuntime(entry.visibilityParams) };
  }
  if (entry.cloudMode === "full_cloud") {
    return { ...base, state: "FULL_CLOUD", ...paramsFromRuntime(entry.visibilityParams) };
  }
  return { ...base, state: "REGULAR", ...paramsFromRuntime(entry.visibilityParams) };
}

function paramsFromRuntime(
  params?: { lanternRadius?: number; memoryRevealSec?: number },
): Pick<VisibilityOverlay, "lanternRadius" | "memoryRevealSec"> {
  if (!params) return {};
  return {
    ...(params.lanternRadius != null ? { lanternRadius: params.lanternRadius } : {}),
    ...(params.memoryRevealSec != null ? { memoryRevealSec: params.memoryRevealSec } : {}),
  };
}

/** Map ScenarioEntry at seed time. */
export function scenarioEntryToDefaultOverlay(entry: {
  cloudMode?: string;
  visibilityMode?: string;
}): VisibilityOverlay {
  return runtimeImportToOverlay(entry);
}
