import { computeCloudVisibility, type CloudMode, type CloudVisualState } from "./computeCloudVisibility";

export type BoardVisibilityMode =
  | "cloudy"
  | "full_cloud"
  | "night"
  | "invisible"
  | "memory"
  | "lantern"
  | "crystal_vision"
  | "echo";

export type BoardVisibilityContext = {
  memoryVisitedHexIds?: ReadonlySet<string>;
  echoHexIds?: ReadonlySet<string>;
  lanternRadius?: number;
};

export type ComputeBoardVisibilityArgs = {
  mode: BoardVisibilityMode;
  currentHexId: string;
  legalMoveHexIds: ReadonlySet<string>;
  allTerrainHexIds: ReadonlySet<string>;
  missingHexIds?: ReadonlySet<string>;
  goalHexId: string | null;
  portalHexIds: ReadonlySet<string>;
  adjacency: (hexId: string) => ReadonlySet<string>;
  context?: BoardVisibilityContext;
};

export function resolveScenarioVisibilityMode(entry: {
  cloudMode?: string;
  visibilityMode?: string;
}): BoardVisibilityMode | null {
  const extended = [
    "night",
    "invisible",
    "memory",
    "lantern",
    "crystal_vision",
    "echo",
  ] as const;
  if (entry.visibilityMode && extended.includes(entry.visibilityMode as (typeof extended)[number])) {
    return entry.visibilityMode as BoardVisibilityMode;
  }
  if (entry.cloudMode === "cloudy" || entry.cloudMode === "full_cloud") {
    return entry.cloudMode;
  }
  return null;
}

function lanternVisibleSet(
  currentHexId: string,
  radius: number,
  allTerrainHexIds: ReadonlySet<string>,
  adjacency: (hexId: string) => ReadonlySet<string>
): Set<string> {
  const visible = new Set<string>();
  if (!currentHexId) return visible;
  visible.add(currentHexId);
  let frontier = new Set<string>([currentHexId]);
  for (let d = 0; d < radius; d++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const nb of adjacency(id)) {
        if (!allTerrainHexIds.has(nb) || visible.has(nb)) continue;
        visible.add(nb);
        next.add(nb);
      }
    }
    frontier = next;
  }
  return visible;
}

function buildFromVisibleSet(
  visibleSet: ReadonlySet<string>,
  partialFromLegal: boolean,
  args: ComputeBoardVisibilityArgs
): Map<string, CloudVisualState> {
  const {
    legalMoveHexIds,
    allTerrainHexIds,
    missingHexIds,
    goalHexId,
    portalHexIds,
    adjacency,
  } = args;

  const result = new Map<string, CloudVisualState>();
  const partialSet = new Set<string>();

  if (partialFromLegal) {
    for (const legalId of legalMoveHexIds) {
      for (const nb of adjacency(legalId)) {
        if (!visibleSet.has(nb) && allTerrainHexIds.has(nb)) partialSet.add(nb);
      }
    }
  }

  for (const hexId of allTerrainHexIds) {
    if (missingHexIds?.has(hexId)) {
      result.set(hexId, {
        visibility: visibleSet.has(hexId) ? "visible" : partialSet.has(hexId) ? "partial" : "cloud",
        isLegalMove: legalMoveHexIds.has(hexId),
        hasGoal: goalHexId === hexId,
        hasPortal: portalHexIds.has(hexId),
      });
      continue;
    }

    let visibility: "visible" | "partial" | "cloud" = "cloud";
    if (visibleSet.has(hexId)) visibility = "visible";
    else if (partialSet.has(hexId)) visibility = "partial";

    result.set(hexId, {
      visibility,
      isLegalMove: legalMoveHexIds.has(hexId),
      hasGoal: goalHexId === hexId,
      hasPortal: portalHexIds.has(hexId),
    });
  }

  if (missingHexIds) {
    for (const hexId of missingHexIds) {
      if (!result.has(hexId)) {
        result.set(hexId, {
          visibility: "cloud",
          isLegalMove: false,
          hasGoal: false,
          hasPortal: false,
        });
      }
    }
  }

  return result;
}

export function computeBoardVisibility(
  args: ComputeBoardVisibilityArgs
): Map<string, CloudVisualState> {
  const { mode, currentHexId, legalMoveHexIds, context } = args;

  if (mode === "cloudy" || mode === "full_cloud") {
    return computeCloudVisibility({
      mode: mode as CloudMode,
      currentHexId: args.currentHexId,
      legalMoveHexIds: args.legalMoveHexIds,
      allTerrainHexIds: args.allTerrainHexIds,
      missingHexIds: args.missingHexIds,
      goalHexId: args.goalHexId,
      portalHexIds: args.portalHexIds,
      adjacency: args.adjacency,
    });
  }

  if (mode === "night") {
    return computeCloudVisibility({
      mode: "full_cloud",
      currentHexId: args.currentHexId,
      legalMoveHexIds: args.legalMoveHexIds,
      allTerrainHexIds: args.allTerrainHexIds,
      missingHexIds: args.missingHexIds,
      goalHexId: args.goalHexId,
      portalHexIds: args.portalHexIds,
      adjacency: args.adjacency,
    });
  }

  if (mode === "invisible") {
    const visible = new Set<string>();
    if (currentHexId) visible.add(currentHexId);
    return buildFromVisibleSet(visible, false, args);
  }

  if (mode === "memory") {
    const visible = new Set<string>();
    if (currentHexId) visible.add(currentHexId);
    for (const id of legalMoveHexIds) visible.add(id);
    for (const id of context?.memoryVisitedHexIds ?? []) visible.add(id);
    return buildFromVisibleSet(visible, true, args);
  }

  if (mode === "lantern") {
    const radius = context?.lanternRadius ?? 2;
    const visible = lanternVisibleSet(
      currentHexId,
      radius,
      args.allTerrainHexIds,
      args.adjacency
    );
    for (const id of legalMoveHexIds) visible.add(id);
    return buildFromVisibleSet(visible, true, args);
  }

  if (mode === "crystal_vision") {
    const base = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: args.currentHexId,
      legalMoveHexIds: args.legalMoveHexIds,
      allTerrainHexIds: args.allTerrainHexIds,
      missingHexIds: args.missingHexIds,
      goalHexId: args.goalHexId,
      portalHexIds: args.portalHexIds,
      adjacency: args.adjacency,
    });
    for (const [hexId, state] of base) {
      if (args.goalHexId === hexId || args.portalHexIds.has(hexId)) {
        base.set(hexId, { ...state, visibility: "visible" });
      }
    }
    return base;
  }

  if (mode === "echo") {
    const visible = new Set<string>();
    if (currentHexId) visible.add(currentHexId);
    for (const id of legalMoveHexIds) visible.add(id);
    for (const id of context?.echoHexIds ?? []) visible.add(id);
    return buildFromVisibleSet(visible, true, args);
  }

  return new Map();
}

export function visibilityAtmosphereMode(mode: BoardVisibilityMode): string {
  if (mode === "cloudy" || mode === "full_cloud") return mode;
  return mode;
}
