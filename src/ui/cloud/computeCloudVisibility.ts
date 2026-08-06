export type CloudMode = "cloudy" | "full_cloud";
export type CloudVisibility = "visible" | "partial" | "cloud";

export interface CloudVisualState {
  visibility: CloudVisibility;
  isLegalMove: boolean;
  hasGoal: boolean;
  hasPortal: boolean;
}

export interface ComputeCloudVisibilityArgs {
  mode: CloudMode;
  currentHexId: string;
  legalMoveHexIds: ReadonlySet<string>;
  allTerrainHexIds: ReadonlySet<string>;
  /** Missing hex slots on the current layer — always cloud-covered, never revealed. */
  missingHexIds?: ReadonlySet<string>;
  goalHexId: string | null;
  portalHexIds: ReadonlySet<string>;
  /** Returns graph neighbors on the same layer for a hex id. */
  adjacency: (hexId: string) => ReadonlySet<string>;
}

function mergeCloudHexIds(
  allTerrainHexIds: ReadonlySet<string>,
  missingHexIds?: ReadonlySet<string>
): Set<string> {
  const merged = new Set(allTerrainHexIds);
  if (missingHexIds) {
    for (const hexId of missingHexIds) merged.add(hexId);
  }
  return merged;
}

function missingCloudState(): CloudVisualState {
  return {
    visibility: "cloud",
    isLegalMove: false,
    hasGoal: false,
    hasPortal: false,
  };
}

/**
 * Resolve every terrain and missing hex into exactly one visibility state.
 * Legal-move and goal/portal flags are independent overlay hints.
 */
export function computeCloudVisibility(args: ComputeCloudVisibilityArgs): Map<string, CloudVisualState> {
  const {
    mode,
    currentHexId,
    legalMoveHexIds,
    allTerrainHexIds,
    missingHexIds,
    goalHexId,
    portalHexIds,
    adjacency,
  } = args;

  const result = new Map<string, CloudVisualState>();
  const allCloudHexIds = mergeCloudHexIds(allTerrainHexIds, missingHexIds);

  if (mode === "full_cloud") {
    for (const hexId of allCloudHexIds) {
      if (missingHexIds?.has(hexId)) {
        result.set(hexId, missingCloudState());
        continue;
      }
      const isCurrent = hexId === currentHexId;
      result.set(hexId, {
        visibility: isCurrent ? "visible" : "cloud",
        isLegalMove: legalMoveHexIds.has(hexId),
        hasGoal: goalHexId === hexId,
        hasPortal: portalHexIds.has(hexId),
      });
    }
    return result;
  }

  // Cloudy: priority visible → partial → cloud
  const visibleSet = new Set<string>();
  if (currentHexId) visibleSet.add(currentHexId);
  for (const id of legalMoveHexIds) visibleSet.add(id);

  const partialSet = new Set<string>();
  for (const legalId of legalMoveHexIds) {
    for (const nb of adjacency(legalId)) {
      if (!visibleSet.has(nb) && allCloudHexIds.has(nb)) {
        partialSet.add(nb);
      }
    }
  }

  for (const hexId of allCloudHexIds) {
    if (missingHexIds?.has(hexId)) {
      result.set(hexId, {
        ...missingCloudState(),
        visibility: partialSet.has(hexId) ? "partial" : "cloud",
      });
      continue;
    }

    let visibility: CloudVisibility = "cloud";
    if (visibleSet.has(hexId)) visibility = "visible";
    else if (partialSet.has(hexId)) visibility = "partial";

    result.set(hexId, {
      visibility,
      isLegalMove: legalMoveHexIds.has(hexId),
      hasGoal: goalHexId === hexId,
      hasPortal: portalHexIds.has(hexId),
    });
  }

  return result;
}
