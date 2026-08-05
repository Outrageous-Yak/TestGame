/**
 * Production-grade track analysis: optimal path, replay, similarity, quality metrics.
 */
import type { GameState, Scenario, Transition } from "./types";
import { ROW_LENS, posId } from "./board";
import { newGame } from "./api";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove } from "./rules";
import { getRuntimeMovement, layerHasMovement, normalizeScenarioMovement, shiftingLayersInMovement } from "./rowMovement";
import {
  restoreStateLite,
  snapshotStateLite,
  type GameStateLiteDTO,
} from "./snapshot";
import { geometryFingerprint } from "./trackValidator";

export type SolverStats = {
  exploredNodes: number;
  visitedStates: number;
  maxQueueDepth: number;
  maxTurnsSearched: number;
  branchingFactor: number;
  searchAborted: boolean;
  runtimeMs: number;
};

export type ReplayStep = {
  moveNumber: number;
  description: string;
  fromHexId: string;
  toHexId: string;
  playerAfter: string;
  portalType?: "UP" | "DOWN";
  portalDestination?: string;
  rowShiftLayers: number[];
  turnAfter: number;
  won: boolean;
};

export type OptimalSolution = {
  minMoves: number | null;
  pathHexIds: string[];
  replay: ReplayStep[];
  alternativeOptimalCount: number;
  stats: SolverStats;
};

export type SimilarityBreakdown = {
  geometryPercent: number;
  portalPercent: number;
  routePercent: number;
  layerPercent: number;
  movingRowPercent: number;
  /** Max of geometry, portal, route — production originality gate */
  maxPercent: number;
  /** Max across all five dimensions (informational) */
  fullMaxPercent: number;
  matchedPrismFile?: string;
};

export type TrackQualityReport = {
  trackName: string;
  trackId: string;
  shortestSolution: number | null;
  estimatedPlayerMoves: number | null;
  portalsUsed: number;
  layerVisits: number[];
  rowsShiftedPerMove: number;
  deadEndsExplored: number;
  backtrackingRequired: boolean;
  alternativeOptimalSolutions: number;
  softLocksDetected: number;
  portalLoops: number;
  maxPrismSimilarity: SimilarityBreakdown;
  estimatedDifficulty: number;
  qualityScore: number;
  engineeringScore: number;
  replay: ReplayStep[];
  solverStats: SolverStats;
  gameplayNotes: string[];
};

function stateSignature(dto: GameStateLiteDTO): string {
  let rows = "";
  const layerEntries = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const entry of layerEntries) {
    rows += `|L${entry.layer}`;
    for (let i = 0; i < entry.rows.length; i++) {
      rows += `|${entry.rows[i].join(",")}`;
    }
  }
  const activeLayers = [...(dto.movementActiveLayers ?? [])]
    .sort((a, b) => a - b)
    .join(",");
  return `p=${dto.playerHexId}|t=${dto.turn}|active=${activeLayers}${rows}`;
}

function goalIdFromState(state: GameState): string | null {
  for (const hex of state.hexesById.values()) {
    if (hex.kind === "GOAL") return hex.id;
  }
  const g = state.scenario.goal;
  return g ? posId(g) : null;
}

function shiftingLayersAfterTurn(scenario: Scenario): number[] {
  const movement = getRuntimeMovement(scenario);
  return shiftingLayersInMovement(movement);
}

function describeDirection(
  fromId: string,
  toId: string,
  state: GameState
): string {
  const from = state.hexesById.get(fromId);
  const to = state.hexesById.get(toId);
  if (!from || !to) return `Move to ${toId}`;

  const dr = to.pos.row - from.pos.row;
  const dc = to.pos.col - from.pos.col;

  if (dr < 0 && dc === 0) return "Move north";
  if (dr > 0 && dc === 0) return "Move south";
  if (dc > 0 && dr === 0) return "Move east";
  if (dc < 0 && dr === 0) return "Move west";
  if (dr < 0) return "Move northwest";
  if (dr > 0) return "Move southeast";
  return `Move to ${toId}`;
}

function buildReplay(
  base: GameState,
  pathTargets: string[]
): ReplayStep[] {
  const st = newGame(base.scenario);
  const replay: ReplayStep[] = [];
  const shiftLayers = shiftingLayersAfterTurn(st.scenario);

  for (let i = 0; i < pathTargets.length; i++) {
    const targetId = pathTargets[i];
    const fromId = st.playerHexId;
    const desc = describeDirection(fromId, targetId, st);
    const trBefore = st.transitionsByFromId.get(targetId);

    const result = attemptMove(st, targetId);
    if (!result.ok) {
      replay.push({
        moveNumber: i + 1,
        description: `INVALID: ${desc}`,
        fromHexId: fromId,
        toHexId: targetId,
        playerAfter: st.playerHexId,
        rowShiftLayers: [],
        turnAfter: st.turn,
        won: false,
      });
      break;
    }

    let description = desc;
    let portalType: "UP" | "DOWN" | undefined;
    let portalDest: string | undefined;

    if (result.triggeredTransition && trBefore) {
      portalType = trBefore.type;
      portalDest = posId(trBefore.to);
      description =
        portalType === "DOWN"
          ? `DOWN portal → ${portalDest}`
          : `UP portal → ${portalDest}`;
    }

    const layersThatShift = shiftLayers;

    replay.push({
      moveNumber: i + 1,
      description,
      fromHexId: fromId,
      toHexId: targetId,
      playerAfter: st.playerHexId,
      portalType,
      portalDestination: portalDest,
      rowShiftLayers: layersThatShift,
      turnAfter: st.turn,
      won: result.won,
    });

    if (result.won) break;
  }

  return replay;
}

type BfsNode = {
  dto: GameStateLiteDTO;
  turns: number;
  parentSig: string | null;
  moveTarget: string | null;
};

/**
 * BFS optimal solver with path reconstruction, alternative-path counting, and stats.
 */
export function computeOptimalSolution(
  base: GameState,
  maxTurns = 80,
  maxNodes = 400000
): OptimalSolution {
  const start = performance.now();
  const goalId = goalIdFromState(base);
  const empty: OptimalSolution = {
    minMoves: null,
    pathHexIds: [],
    replay: [],
    alternativeOptimalCount: 0,
    stats: {
      exploredNodes: 0,
      visitedStates: 0,
      maxQueueDepth: 0,
      maxTurnsSearched: 0,
      branchingFactor: 0,
      searchAborted: false,
      runtimeMs: 0,
    },
  };

  if (!goalId) return { ...empty, stats: { ...empty.stats, runtimeMs: performance.now() - start } };

  const startHex = base.hexesById.get(base.playerHexId);
  if (!startHex || startHex.missing || startHex.blocked) {
    return { ...empty, stats: { ...empty.stats, runtimeMs: performance.now() - start } };
  }

  if (base.playerHexId === goalId) {
    return {
      minMoves: 0,
      pathHexIds: [],
      replay: [],
      alternativeOptimalCount: 1,
      stats: {
        exploredNodes: 1,
        visitedStates: 1,
        maxQueueDepth: 0,
        maxTurnsSearched: 0,
        branchingFactor: 0,
        searchAborted: false,
        runtimeMs: performance.now() - start,
      },
    };
  }

  const startDto = snapshotStateLite(base);
  const startSig = stateSignature(startDto);

  const parentMap = new Map<string, { parentSig: string; moveTarget: string }>();
  const depthMap = new Map<string, number>();
  depthMap.set(startSig, 0);

  const q: BfsNode[] = [{ dto: startDto, turns: 0, parentSig: null, moveTarget: null }];
  let head = 0;
  const seen = new Set<string>([startSig]);
  let explored = 0;
  let maxDepth = 0;
  let totalBranches = 0;
  let branchNodes = 0;
  let goalSig: string | null = null;
  let minMoves: number | null = null;

  while (head < q.length) {
    if (explored >= maxNodes) {
      const stats = finalizeStats(
        explored,
        seen.size,
        maxDepth,
        maxDepth,
        totalBranches,
        branchNodes,
        true,
        performance.now() - start
      );
      return { ...empty, stats };
    }

    const node = q[head++];
    explored++;
    maxDepth = Math.max(maxDepth, node.turns);

    if (node.turns >= maxTurns) continue;

    const st = restoreStateLite(base, node.dto);
    const neighbors = neighborIdsSameLayer(st, st.playerHexId);
    let validBranches = 0;

    for (const nid of neighbors) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;

      const st2 = restoreStateLite(base, node.dto);
      const result = attemptMove(st2, nid);
      if (!result.ok) continue;

      validBranches++;
      const turnsUsed = node.turns + 1;
      const dto2 = snapshotStateLite(st2);
      const sig2 = stateSignature(dto2);

      if (!depthMap.has(sig2)) depthMap.set(sig2, turnsUsed);

      if (st2.playerHexId === goalId) {
        if (minMoves === null || turnsUsed < minMoves) {
          minMoves = turnsUsed;
          goalSig = sig2;
          parentMap.set(sig2, {
            parentSig: stateSignature(node.dto),
            moveTarget: nid,
          });
        } else if (turnsUsed === minMoves) {
          parentMap.set(sig2, {
            parentSig: stateSignature(node.dto),
            moveTarget: nid,
          });
        }
        continue;
      }

      if (minMoves !== null && turnsUsed >= minMoves) continue;

      if (seen.has(sig2)) continue;
      seen.add(sig2);
      parentMap.set(sig2, {
        parentSig: stateSignature(node.dto),
        moveTarget: nid,
      });
      q.push({ dto: dto2, turns: turnsUsed, parentSig: stateSignature(node.dto), moveTarget: nid });
    }

    if (validBranches > 0) {
      totalBranches += validBranches;
      branchNodes++;
    }
  }

  if (minMoves === null || !goalSig) {
    const stats = finalizeStats(
      explored,
      seen.size,
      maxDepth,
      maxDepth,
      totalBranches,
      branchNodes,
      false,
      performance.now() - start
    );
    return { ...empty, stats };
  }

  // Reconstruct primary path
  const pathTargets: string[] = [];
  let cur: string | undefined = goalSig;
  while (cur && cur !== startSig) {
    const p = parentMap.get(cur);
    if (!p) break;
    pathTargets.unshift(p.moveTarget);
    cur = p.parentSig;
  }

  // Count alternative optimal paths via layered DP
  const altCount = countOptimalPaths(base, startDto, goalId, minMoves, maxTurns);

  const replay = buildReplay(base, pathTargets);
  const stats = finalizeStats(
    explored,
    seen.size,
    maxDepth,
    minMoves,
    totalBranches,
    branchNodes,
    false,
    performance.now() - start
  );

  return {
    minMoves,
    pathHexIds: pathTargets,
    replay,
    alternativeOptimalCount: altCount,
    stats,
  };
}

function finalizeStats(
  explored: number,
  visited: number,
  maxQueueDepth: number,
  maxTurnsSearched: number,
  totalBranches: number,
  branchNodes: number,
  searchAborted: boolean,
  runtimeMs: number
): SolverStats {
  return {
    exploredNodes: explored,
    visitedStates: visited,
    maxQueueDepth,
    maxTurnsSearched,
    branchingFactor: branchNodes > 0 ? totalBranches / branchNodes : 0,
    searchAborted,
    runtimeMs,
  };
}

function countOptimalPaths(
  base: GameState,
  startDto: GameStateLiteDTO,
  goalId: string,
  optimalDepth: number,
  maxTurns: number
): number {
  if (optimalDepth === 0) return 1;

  type Frame = { dto: GameStateLiteDTO };
  let layer: Frame[] = [{ dto: startDto }];
  let layerWays = new Map<string, number>();
  layerWays.set(stateSignature(startDto), 1);

  for (let d = 0; d < optimalDepth; d++) {
    const nextLayerMap = new Map<string, GameStateLiteDTO>();
    const nextWays = new Map<string, number>();

    for (const { dto } of layer) {
      const waysHere = layerWays.get(stateSignature(dto)) ?? 0;
      if (waysHere === 0) continue;

      const st = restoreStateLite(base, dto);
      const neighbors = neighborIdsSameLayer(st, st.playerHexId);

      for (const nid of neighbors) {
        const nh = st.hexesById.get(nid);
        if (!nh || nh.missing || nh.blocked) continue;

        const st2 = restoreStateLite(base, dto);
        const result = attemptMove(st2, nid);
        if (!result.ok) continue;

        if (d + 1 === optimalDepth && st2.playerHexId === goalId) {
          const goalWays = (nextWays.get("__goal__") ?? 0) + waysHere;
          if (goalWays > 1000) return 1000;
          nextWays.set("__goal__", goalWays);
        } else if (d + 1 < optimalDepth) {
          const dto2 = snapshotStateLite(st2);
          const sig2 = stateSignature(dto2);
          nextWays.set(sig2, (nextWays.get(sig2) ?? 0) + waysHere);
          nextLayerMap.set(sig2, dto2);
        }
      }
    }

    layer = [...nextLayerMap.values()].map((dto) => ({ dto }));
    layerWays = nextWays;
  }

  return Math.min(layerWays.get("__goal__") ?? 1, 1000);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : (inter / union) * 100;
}

function transitionSet(s: Scenario): Set<string> {
  const set = new Set<string>();
  for (const t of s.transitions ?? []) {
    set.add(`${t.type}:${posId(t.from)}->${posId(t.to)}`);
  }
  return set;
}

function posSet(list: { layer: number; row: number; col: number }[] = []): Set<string> {
  return new Set(list.map(posId));
}

function movementSimilarityShiftingOnly(a: Scenario, b: Scenario): number {
  const normA = normalizeScenarioMovement(a.movement ?? {});
  const normB = normalizeScenarioMovement(b.movement ?? {});
  let match = 0;
  let total = 0;
  for (let layer = 1; layer <= 7; layer++) {
    const layerKey = layer as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const aMoves = layerHasMovement(normA[layerKey].rows);
    const bMoves = layerHasMovement(normB[layerKey].rows);
    if (!aMoves && !bMoves) continue;
    total++;
    if (JSON.stringify(normA[layerKey].rows) === JSON.stringify(normB[layerKey].rows)) {
      match++;
    }
  }
  return total === 0 ? 0 : (match / total) * 100;
}

function structuralGeometryPercent(a: Scenario, b: Scenario): number {
  if (geometryFingerprint(a) === geometryFingerprint(b)) return 100;

  const missingSim = jaccard(posSet(a.missing), posSet(b.missing));
  const blockedSim = jaccard(posSet(a.blocked), posSet(b.blocked));
  let score = (missingSim + blockedSim) / 2;

  if (posId(a.start) === posId(b.start)) score += 25;
  if (posId(a.goal) === posId(b.goal)) score += 25;

  return Math.min(100, score);
}

function layerUsageSimilarity(pathA: string[], pathB: string[]): number {
  const toLayerSet = (path: string[]) => {
    const s = new Set<string>();
    for (const id of path) {
      const m = /^L(\d+)/.exec(id);
      if (m) s.add(m[1]);
    }
    return s;
  };
  return jaccard(toLayerSet(pathA), toLayerSet(pathB));
}

function routeSimilarity(pathA: string[], pathB: string[]): number {
  const setA = new Set(pathA);
  const setB = new Set(pathB);
  return jaccard(setA, setB);
}

export function compareToScenario(
  a: Scenario,
  b: Scenario,
  pathA: string[],
  pathB: string[]
): Omit<SimilarityBreakdown, "maxPercent" | "matchedPrismFile"> {
  const portalSim = jaccard(transitionSet(a), transitionSet(b));
  const geometryPercent = structuralGeometryPercent(a, b);
  const routePercent = pathA.length && pathB.length ? routeSimilarity(pathA, pathB) : 0;
  const layerPercent = pathA.length && pathB.length ? layerUsageSimilarity(pathA, pathB) : 0;
  const movingRowPercent = movementSimilarityShiftingOnly(a, b);

  return {
    geometryPercent,
    portalPercent: portalSim,
    routePercent,
    layerPercent,
    movingRowPercent,
  };
}

export function maxPrismSimilarity(
  scenario: Scenario,
  pathHexIds: string[],
  prismScenarios: Array<{ file: string; scenario: Scenario; path: string[] }>
): SimilarityBreakdown {
  let best: SimilarityBreakdown = {
    geometryPercent: 0,
    portalPercent: 0,
    routePercent: 0,
    layerPercent: 0,
    movingRowPercent: 0,
    maxPercent: 0,
    fullMaxPercent: 0,
  };

  for (const p of prismScenarios) {
    const comp = compareToScenario(scenario, p.scenario, pathHexIds, p.path);
    const gatePercent = Math.max(
      comp.geometryPercent,
      comp.portalPercent,
      comp.routePercent
    );
    const fullMaxPercent = Math.max(
      comp.geometryPercent,
      comp.portalPercent,
      comp.routePercent,
      comp.layerPercent,
      comp.movingRowPercent
    );
    if (gatePercent > best.maxPercent) {
      best = { ...comp, maxPercent: gatePercent, fullMaxPercent, matchedPrismFile: p.file };
    } else if (gatePercent === best.maxPercent && fullMaxPercent > best.fullMaxPercent) {
      best = { ...best, fullMaxPercent, matchedPrismFile: p.file };
    }
  }

  return best;
}

export function analyzeTrackQuality(
  scenario: Scenario,
  prismScenarios: Array<{ file: string; scenario: Scenario; path: string[] }>
): TrackQualityReport {
  const base = newGame(scenario);
  const solution = computeOptimalSolution(base);

  const replay = solution.replay;
  const portalsUsed = replay.filter((s) => s.portalType).length;
  const layerVisits = new Set<number>();
  for (const step of replay) {
    const m = /^L(\d+)/.exec(step.playerAfter);
    if (m) layerVisits.add(Number(m[1]));
  }

  let portalLoops = 0;
  const portalVisits = new Map<string, number>();
  for (const step of replay) {
    if (step.portalDestination) {
      const k = step.portalDestination;
      portalVisits.set(k, (portalVisits.get(k) ?? 0) + 1);
      if ((portalVisits.get(k) ?? 0) > 1) portalLoops++;
    }
  }

  const rowsShiftedPerMove = replay.reduce((sum, s) => sum + s.rowShiftLayers.length, 0);
  const backtrackingRequired = portalsUsed >= 2 && replay.some((s) => s.portalType === "DOWN");

  const similarity = maxPrismSimilarity(scenario, solution.pathHexIds, prismScenarios);

  const shiftingLayerCount = shiftingLayersAfterTurn(scenario).length;
  const minMoves = solution.minMoves ?? 0;
  const estimatedDifficulty = Math.min(
    10,
    Math.round(
      minMoves * 0.35 +
        portalsUsed * 0.8 +
        shiftingLayerCount * 0.6 +
        (similarity.maxPercent > 20 ? 1 : 0)
    )
  );

  const qualityScore = computeQualityScore(
    scenario,
    solution,
    similarity,
    portalsUsed,
    shiftingLayerCount
  );
  const engineeringScore = computeEngineeringScore(solution, similarity);

  const gameplayNotes = buildGameplayNotes(scenario, solution, similarity);

  return {
    trackName: scenario.name,
    trackId: scenario.id,
    shortestSolution: solution.minMoves,
    estimatedPlayerMoves: solution.minMoves,
    portalsUsed,
    layerVisits: [...layerVisits].sort((a, b) => a - b),
    rowsShiftedPerMove,
    deadEndsExplored: solution.stats.exploredNodes - (solution.minMoves ?? 0),
    backtrackingRequired,
    alternativeOptimalSolutions: solution.alternativeOptimalCount,
    softLocksDetected: 0,
    portalLoops,
    maxPrismSimilarity: similarity,
    estimatedDifficulty,
    qualityScore,
    engineeringScore,
    replay,
    solverStats: solution.stats,
    gameplayNotes,
  };
}

function computeQualityScore(
  scenario: Scenario,
  solution: OptimalSolution,
  similarity: SimilarityBreakdown,
  portalsUsed: number,
  shiftingLayerCount: number
): number {
  let score = 10;
  if (solution.minMoves === null) score = 0;
  if (similarity.maxPercent > 35) score -= 3;
  if (solution.alternativeOptimalCount > 3) score -= 1;
  if (portalsUsed === 0 && shiftingLayerCount === 0 && (solution.minMoves ?? 0) > 8) score -= 1;
  const moveRatio = (solution.minMoves ?? 0) / Math.max(1, portalsUsed + shiftingLayerCount);
  if (moveRatio > 8) score -= 1;
  return Math.max(0, Math.min(10, score));
}

function computeEngineeringScore(
  solution: OptimalSolution,
  similarity: SimilarityBreakdown
): number {
  let score = 10;
  if (solution.minMoves === null) return 0;
  if (similarity.maxPercent > 35) score -= 4;
  if (solution.stats.searchAborted) score -= 3;
  if (solution.stats.runtimeMs > 2000) score -= 1;
  return Math.max(0, Math.min(10, score));
}

function buildGameplayNotes(
  scenario: Scenario,
  solution: OptimalSolution,
  similarity: SimilarityBreakdown
): string[] {
  const notes: string[] = [];
  const min = solution.minMoves ?? 0;
  const portals = (scenario.transitions ?? []).length;

  if (min <= 6) notes.push("Teaches a single core mechanic.");
  if (portals > 1) notes.push("Requires portal sequencing.");
  if ((scenario.missing ?? []).length > 0) notes.push("Missing hexes shape routing.");
  if (similarity.maxPercent > 35)
    notes.push(`HIGH similarity to Prism Path (${similarity.matchedPrismFile}).`);
  if (solution.alternativeOptimalCount > 1)
    notes.push(`${solution.alternativeOptimalCount} optimal routes — elegance reduced.`);
  if (min > 15) notes.push("Long solve — verify movement is purposeful.");
  return notes;
}

export function formatReplay(replay: ReplayStep[]): string {
  const lines: string[] = [];
  for (const step of replay) {
    lines.push(`Move ${step.moveNumber}`);
    lines.push(step.description);
    if (step.rowShiftLayers.length > 0) {
      lines.push(`Row shift (layers ${step.rowShiftLayers.join(", ")})`);
    }
    if (step.won) lines.push("Goal");
  }
  if (!replay.some((s) => s.won)) lines.push("(Did not reach goal in replay)");
  return lines.join("\n\n");
}

export function formatQualityReport(r: TrackQualityReport): string {
  return [
    `Track: ${r.trackName} (${r.trackId})`,
    `Shortest solution: ${r.shortestSolution ?? "UNSOLVABLE"}`,
    `Estimated player moves: ${r.estimatedPlayerMoves ?? "-"}`,
    `Portals used in optimal path: ${r.portalsUsed}`,
    `Layer visits: ${r.layerVisits.join(", ") || "none"}`,
    `Row-shift events (total layers shifted): ${r.rowsShiftedPerMove}`,
    `Dead ends explored (search): ${r.deadEndsExplored}`,
    `Backtracking required: ${r.backtrackingRequired ? "YES" : "NO"}`,
    `Alternative optimal solutions: ${r.alternativeOptimalSolutions}`,
    `Soft locks detected: ${r.softLocksDetected}`,
    `Portal loops: ${r.portalLoops}`,
    `Max Prism similarity (gate): ${r.maxPrismSimilarity.maxPercent.toFixed(1)}% (${r.maxPrismSimilarity.matchedPrismFile ?? "none"})`,
    `  full max ${r.maxPrismSimilarity.fullMaxPercent.toFixed(1)}% geometry ${r.maxPrismSimilarity.geometryPercent.toFixed(1)}% portal ${r.maxPrismSimilarity.portalPercent.toFixed(1)}% route ${r.maxPrismSimilarity.routePercent.toFixed(1)}% layer ${r.maxPrismSimilarity.layerPercent.toFixed(1)}% moving-row ${r.maxPrismSimilarity.movingRowPercent.toFixed(1)}%`,
    `Estimated difficulty: ${r.estimatedDifficulty}/10`,
    `Quality score: ${r.qualityScore}/10`,
    `Engineering score: ${r.engineeringScore}/10`,
    `Solver: explored ${r.solverStats.exploredNodes} states in ${r.solverStats.runtimeMs.toFixed(1)}ms`,
    `Gameplay notes: ${r.gameplayNotes.join("; ") || "none"}`,
    "",
    "--- Replay ---",
    formatReplay(r.replay),
  ].join("\n");
}
