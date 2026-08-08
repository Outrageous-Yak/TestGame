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

function parseHexId(id: string): { layer: number; row: number; col: number } | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function bfsDistances(
  startId: string,
  allTerrainHexIds: ReadonlySet<string>,
  adjacency: (hexId: string) => ReadonlySet<string>
): Map<string, number> {
  const dist = new Map<string, number>();
  if (!startId) return dist;
  const queue = [startId];
  dist.set(startId, 0);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    const d = dist.get(id)!;
    for (const nb of adjacency(id)) {
      if (!allTerrainHexIds.has(nb) || dist.has(nb)) continue;
      dist.set(nb, d + 1);
      queue.push(nb);
    }
  }
  return dist;
}

/** Hexes on a greedy path from `from` toward `to` (for crystal line-of-sight). */
function hexesOnLineToward(
  fromId: string,
  toId: string,
  allTerrainHexIds: ReadonlySet<string>,
  adjacency: (hexId: string) => ReadonlySet<string>
): Set<string> {
  const line = new Set<string>();
  if (!fromId || !toId || fromId === toId) return line;

  const target = parseHexId(toId);
  if (!target) return line;

  let current = fromId;
  const walked = new Set<string>([fromId]);

  for (let step = 0; step < 64; step++) {
    if (current === toId) break;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const nb of adjacency(current)) {
      if (!allTerrainHexIds.has(nb) || walked.has(nb)) continue;
      const c = parseHexId(nb);
      if (!c) continue;
      const d = Math.abs(c.row - target.row) + Math.abs(c.col - target.col);
      if (d < bestDist) {
        bestDist = d;
        best = nb;
      }
    }
    if (!best) break;
    line.add(best);
    walked.add(best);
    current = best;
  }

  return line;
}

function buildForkEffectMap(
  args: ComputeBoardVisibilityArgs,
  classify: (hexId: string) => CloudVisualState["visibility"]
): Map<string, CloudVisualState> {
  const { legalMoveHexIds, allTerrainHexIds, missingHexIds, goalHexId, portalHexIds } = args;
  const result = new Map<string, CloudVisualState>();

  for (const hexId of allTerrainHexIds) {
    result.set(hexId, {
      visibility: classify(hexId),
      isLegalMove: legalMoveHexIds.has(hexId),
      hasGoal: goalHexId === hexId,
      hasPortal: portalHexIds.has(hexId),
    });
  }

  if (missingHexIds) {
    for (const hexId of missingHexIds) {
      result.set(hexId, {
        visibility: "hidden",
        isLegalMove: false,
        hasGoal: false,
        hasPortal: false,
      });
    }
  }

  return result;
}

function buildPlayerOnlyVisibility(
  args: ComputeBoardVisibilityArgs,
  concealed: "faded" | "hidden"
): Map<string, CloudVisualState> {
  const {
    currentHexId,
    legalMoveHexIds,
    allTerrainHexIds,
    missingHexIds,
    goalHexId,
    portalHexIds,
  } = args;

  const result = new Map<string, CloudVisualState>();
  const allHexIds = new Set(allTerrainHexIds);
  if (missingHexIds) {
    for (const hexId of missingHexIds) allHexIds.add(hexId);
  }

  for (const hexId of allHexIds) {
    const isCurrent = hexId === currentHexId;
    result.set(hexId, {
      visibility: isCurrent ? "visible" : concealed,
      isLegalMove: legalMoveHexIds.has(hexId),
      hasGoal: goalHexId === hexId,
      hasPortal: portalHexIds.has(hexId),
    });
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
    return buildPlayerOnlyVisibility(args, "faded");
  }

  if (mode === "invisible") {
    return buildPlayerOnlyVisibility(args, "hidden");
  }

  if (mode === "memory") {
    const ember = new Set<string>();
    if (currentHexId) ember.add(currentHexId);
    for (const id of context?.memoryVisitedHexIds ?? []) ember.add(id);

    const goldEdge = new Set<string>();
    for (const legalId of legalMoveHexIds) {
      if (ember.has(legalId)) continue;
      for (const nb of args.adjacency(legalId)) {
        if (ember.has(nb)) {
          goldEdge.add(legalId);
          break;
        }
      }
    }

    return buildForkEffectMap(args, (hexId) => {
      if (hexId === currentHexId) return "visible";
      if (ember.has(hexId)) return "ember";
      if (goldEdge.has(hexId)) return "partial";
      return "hidden";
    });
  }

  if (mode === "lantern") {
    const radius = context?.lanternRadius ?? 2;
    const dist = bfsDistances(currentHexId, args.allTerrainHexIds, args.adjacency);

    return buildForkEffectMap(args, (hexId) => {
      const d = dist.get(hexId);
      if (d == null) return "hidden";
      if (d < radius) return "visible";
      if (d === radius) return "faded";
      return "hidden";
    });
  }

  if (mode === "crystal_vision") {
    const beacons = new Set<string>();
    if (args.goalHexId) beacons.add(args.goalHexId);
    for (const id of args.portalHexIds) beacons.add(id);

    const nearPlayer = new Set<string>();
    if (currentHexId) {
      nearPlayer.add(currentHexId);
      for (const nb of args.adjacency(currentHexId)) nearPlayer.add(nb);
    }

    const los = new Set<string>();
    for (const beacon of beacons) {
      for (const id of hexesOnLineToward(
        currentHexId,
        beacon,
        args.allTerrainHexIds,
        args.adjacency
      )) {
        los.add(id);
      }
    }

    return buildForkEffectMap(args, (hexId) => {
      if (beacons.has(hexId)) return "beacon";
      if (nearPlayer.has(hexId)) return "visible";
      if (los.has(hexId)) return "faded";
      return "hidden";
    });
  }

  if (mode === "echo") {
    const echoes = context?.echoHexIds ?? new Set<string>();
    return buildForkEffectMap(args, (hexId) => {
      if (hexId === currentHexId) return "visible";
      if (echoes.has(hexId)) return "echo";
      return "hidden";
    });
  }

  return new Map();
}

export function visibilityAtmosphereMode(mode: BoardVisibilityMode): string {
  if (mode === "cloudy" || mode === "full_cloud") return mode;
  return mode;
}

/** Fork effect modes use forkVisibility.css instead of cloud scene dim overlays. */
export function usesForkEffectAtmosphere(mode: BoardVisibilityMode | null): boolean {
  return (
    mode === "memory" ||
    mode === "lantern" ||
    mode === "echo" ||
    mode === "crystal_vision"
  );
}
