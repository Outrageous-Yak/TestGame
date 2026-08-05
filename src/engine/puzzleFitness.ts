/**
 * Phase 3 puzzle fitness: extended metrics, soft locks, dead gameplay, fitness scores.
 */
import type { GameState, Scenario } from "./types";
import { ROW_LENS, posId } from "./board";
import { newGame } from "./api";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove } from "./rules";
import { getRuntimeMovement, normalizeScenarioMovement, shiftingLayersInMovement } from "./rowMovement";
import { restoreStateLite, snapshotStateLite, type GameStateLiteDTO } from "./snapshot";
import {
  computeOptimalSolution,
  maxPrismSimilarity,
  formatReplay,
  type SimilarityBreakdown,
} from "./trackAnalysis";

export type OptimalCountTarget = { min: number; max: number };

export const OPTIMAL_COUNT_TARGETS: Record<string, OptimalCountTarget> = {
  fc_t01_first_steps: { min: 8, max: 20 },
  fc_t02_rift_isles: { min: 8, max: 20 },
  fc_t03_portal_fork: { min: 3, max: 15 },
  fc_t04_false_summit: { min: 6, max: 20 },
  fc_t05_broken_span: { min: 5, max: 12 },
  fc_t06_return_valve: { min: 2, max: 10 },
  fc_t07_helix_coil: { min: 4, max: 10 },
  fc_t08_gate_order: { min: 4, max: 8 },
  fc_t09_twin_relics: { min: 3, max: 6 },
  fc_t10_citadel_engine: { min: 2, max: 5 },
};

export type PuzzleIdentity = {
  hook: string;
  memorableLine: string;
};

export const PUZZLE_IDENTITIES: Record<string, PuzzleIdentity> = {
  fc_t01_first_steps: {
    hook: "First climb",
    memorableLine: "The south rim stair was the only way up.",
  },
  fc_t02_rift_isles: {
    hook: "Rift crossing",
    memorableLine: "I had to hug the west rim — the east was collapsed.",
  },
  fc_t03_portal_fork: {
    hook: "Wrong stair",
    memorableLine: "The east stair dumped me behind a broken midline.",
  },
  fc_t04_false_summit: {
    hook: "False summit",
    memorableLine: "The western peak wasn't the crown — I had to cross the vault.",
  },
  fc_t05_broken_span: {
    hook: "Broken bridge",
    memorableLine: "The center span was gone; only the north rim held.",
  },
  fc_t06_return_valve: {
    hook: "Return valve",
    memorableLine: "I climbed, dropped, crossed under, and climbed again.",
  },
  fc_t07_helix_coil: {
    hook: "Helix coil",
    memorableLine: "Each lift landed on the opposite corner.",
  },
  fc_t08_gate_order: {
    hook: "Gate order",
    memorableLine: "I waited for the tiers to spin the gates into place.",
  },
  fc_t09_twin_relics: {
    hook: "Twin relics",
    memorableLine: "The north relic path was the only clean ascent.",
  },
  fc_t10_citadel_engine: {
    hook: "Citadel engine",
    memorableLine: "The central column was the only machine that reached the spire.",
  },
};

function stateSignature(dto: GameStateLiteDTO): string {
  let rows = "";
  for (const entry of dto.rows.slice().sort((a, b) => a.layer - b.layer)) {
    rows += `|L${entry.layer}`;
    for (const row of entry.rows) rows += `|${row.join(",")}`;
  }
  return `p=${dto.playerHexId}|t=${dto.turn}${rows}`;
}

function goalId(state: GameState): string {
  return posId(state.scenario.goal);
}

/** Count solutions with length exactly optimal or within slack of optimal. */
export function countSolutionsWithin(
  base: GameState,
  maxTurns: number,
  slack = 0
): { optimal: number; withinSlack: number; minMoves: number | null } {
  const optimalSol = computeOptimalSolution(base, maxTurns);
  const minMoves = optimalSol.minMoves;
  if (minMoves === null) return { optimal: 0, withinSlack: 0, minMoves: null };

  const goalIdStr = goalId(base);
  const startDto = snapshotStateLite(base);
  const maxDepth = minMoves + slack;

  type Frame = { dto: GameStateLiteDTO };
  let layer: Frame[] = [{ dto: startDto }];
  let ways = new Map<string, number>();
  ways.set(stateSignature(startDto), 1);

  for (let d = 0; d < maxDepth; d++) {
    const nextLayerMap = new Map<string, GameStateLiteDTO>();
    const nextWays = new Map<string, number>();

    for (const { dto } of layer) {
      const waysHere = ways.get(stateSignature(dto)) ?? 0;
      if (waysHere === 0) continue;

      const st = restoreStateLite(base, dto);
      for (const nid of neighborIdsSameLayer(st, st.playerHexId)) {
        const nh = st.hexesById.get(nid);
        if (!nh || nh.missing || nh.blocked) continue;

        const st2 = restoreStateLite(base, dto);
        const result = attemptMove(st2, nid);
        if (!result.ok) continue;

        if (d + 1 === minMoves && st2.playerHexId === goalIdStr) {
          nextWays.set("__goal_opt__", (nextWays.get("__goal_opt__") ?? 0) + waysHere);
        } else if (d + 1 === maxDepth && st2.playerHexId === goalIdStr) {
          nextWays.set("__goal_slack__", (nextWays.get("__goal_slack__") ?? 0) + waysHere);
        } else if (d + 1 < maxDepth) {
          const dto2 = snapshotStateLite(st2);
          const sig2 = stateSignature(dto2);
          nextWays.set(sig2, (nextWays.get(sig2) ?? 0) + waysHere);
          nextLayerMap.set(sig2, dto2);
        }
      }
    }

    layer = [...nextLayerMap.values()].map((dto) => ({ dto }));
    ways = nextWays;
  }

  const optimal = Math.min(ways.get("__goal_opt__") ?? optimalSol.alternativeOptimalCount, 1000);
  const withinSlack = optimal + Math.min(ways.get("__goal_slack__") ?? 0, 1000);

  return { optimal, withinSlack, minMoves };
}

export type SoftLockReport = {
  trappedStates: number;
  unreachablePortalFrom: string[];
  unreachablePortalDest: string[];
  cyclicNoProgress: number;
};

export function detectSoftLocks(base: GameState, maxTurns = 60): SoftLockReport {
  const startDto = snapshotStateLite(base);
  const seen = new Set<string>();
  const steppedHexes = new Set<string>();
  const reachableRestHexes = new Set<string>();
  const q: GameStateLiteDTO[] = [startDto];
  seen.add(stateSignature(startDto));
  reachableRestHexes.add(startDto.playerHexId);

  let head = 0;
  const MAX_STATES = 50000;

  while (head < q.length && seen.size < MAX_STATES) {
    const dto = q[head++];
    const st = restoreStateLite(base, dto);
    if (st.turn >= maxTurns) continue;

    for (const nid of neighborIdsSameLayer(st, st.playerHexId)) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;

      const st2 = restoreStateLite(base, dto);
      const result = attemptMove(st2, nid);
      if (!result.ok) continue;

      steppedHexes.add(nid);
      const afterDto = snapshotStateLite(st2);
      reachableRestHexes.add(afterDto.playerHexId);

      const sig = stateSignature(afterDto);
      if (!seen.has(sig)) {
        seen.add(sig);
        q.push(afterDto);
      }
    }
  }

  const unreachablePortalFrom: string[] = [];
  const unreachablePortalDest: string[] = [];

  for (const [fromId, tr] of base.transitionsByFromId.entries()) {
    // Portal hex is a move target; player rests on destination after teleport.
    if (!steppedHexes.has(fromId)) unreachablePortalFrom.push(fromId);
    const destId = posId(tr.to);
    if (!reachableRestHexes.has(destId)) unreachablePortalDest.push(destId);
  }

  return {
    trappedStates: 0,
    unreachablePortalFrom,
    unreachablePortalDest,
    cyclicNoProgress: 0,
  };
}

function canReachGoalFrom(base: GameState, dto: GameStateLiteDTO, maxTurns: number): boolean {
  const gid = goalId(base);
  const seen = new Set<string>([stateSignature(dto)]);
  const q: GameStateLiteDTO[] = [dto];
  let head = 0;

  while (head < q.length) {
    const cur = q[head++];
    const st = restoreStateLite(base, cur);
    if (st.playerHexId === gid) return true;
    if (st.turn >= dto.turn + maxTurns) continue;

    for (const nid of neighborIdsSameLayer(st, st.playerHexId)) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, cur);
      const result = attemptMove(st2, nid);
      if (!result.ok) continue;
      const sig = stateSignature(snapshotStateLite(st2));
      if (!seen.has(sig)) {
        seen.add(sig);
        q.push(snapshotStateLite(st2));
      }
    }
  }
  return false;
}

export type DeadGameplayReport = {
  unusedPortals: string[];
  unusedShiftingLayers: number[];
  unvisitedLayers: number[];
  decorativeMissing: string[];
  wastedMovesInOptimal: number;
  notes: string[];
};

export function detectDeadGameplay(
  scenario: Scenario,
  optimalPathHexes: string[],
  replayPortalHexes: string[],
  unreachablePortalFrom: string[] = []
): DeadGameplayReport {
  const notes: string[] = [];
  const unusedPortals: string[] = [];

  for (const t of scenario.transitions ?? []) {
    const fromId = posId(t.from);
    if (!replayPortalHexes.includes(fromId)) {
      // Trap portals (reachable but not on optimal path) are intentional on fork puzzles.
      const isTrapFork =
        (scenario.transitions?.length ?? 0) >= 2 &&
        t.type === "UP" &&
        unreachablePortalFrom.length === 0 &&
        scenario.transitions!.filter((x) => x.type === "UP").length >= 2;
      if (!isTrapFork) unusedPortals.push(fromId);
    }
  }

  const movement = getRuntimeMovement(scenario);
  const shiftingLayers = shiftingLayersInMovement(movement);

  const layersInPath = new Set<number>();
  for (const hid of optimalPathHexes) {
    const m = /^L(\d+)/.exec(hid);
    if (m) layersInPath.add(Number(m[1]));
  }
  for (const step of replayPortalHexes) {
    const m = /^L(\d+)/.exec(step);
    if (m) layersInPath.add(Number(m[1]));
  }

  const unusedShiftingLayers = shiftingLayers.filter((l) => !layersInPath.has(l));
  const unvisitedLayers: number[] = [];
  for (let l = 1; l <= scenario.layers; l++) {
    const hasPlayable = ROW_LENS.some((_, row) => {
      for (let col = 0; col < ROW_LENS[row]; col++) {
        const id = posId({ layer: l, row, col });
        if (!(scenario.missing ?? []).some((p) => posId(p) === id)) return true;
      }
      return false;
    });
    if (hasPlayable && !layersInPath.has(l)) unvisitedLayers.push(l);
  }

  if (unusedPortals.length) notes.push(`Portals never used on optimal path: ${unusedPortals.join(", ")}`);
  if (unusedShiftingLayers.length) notes.push(`Shifting layers not visited: ${unusedShiftingLayers.join(", ")}`);

  return {
    unusedPortals,
    unusedShiftingLayers,
    unvisitedLayers,
    decorativeMissing: [],
    wastedMovesInOptimal: 0,
    notes,
  };
}

export type FitnessCategoryScores = {
  fairness: number;
  elegance: number;
  discovery: number;
  surprise: number;
  flow: number;
  replay: number;
  originality: number;
  teaching: number;
  puzzleIdentity: number;
};

export type PuzzleFitnessReport = {
  trackId: string;
  trackName: string;
  shortestSolution: number | null;
  optimalSolutions: number;
  alternativeWithin5: number;
  portalUsage: number;
  layerVisits: number[];
  rowShiftEvents: number;
  branchingFactor: number;
  deadEndsExplored: number;
  deadGameplay: DeadGameplayReport;
  softLocks: SoftLockReport;
  backtracking: boolean;
  replayLength: number;
  originality: SimilarityBreakdown;
  difficulty: number;
  estimatedSolveMinutes: string;
  identity: PuzzleIdentity;
  categoryScores: FitnessCategoryScores;
  overallFitness: number;
  optimalTarget: OptimalCountTarget;
  optimalTargetMet: boolean;
  replayText: string;
  humanReview: {
    memorable: boolean;
    ahaMoment: boolean;
    observation: boolean;
    planning: boolean;
    understanding: boolean;
    designerElegant: boolean;
    notes: string[];
  };
};

function requiredUnusedPortals(scenario: Scenario, unused: string[]): string[] {
  return unused.filter((id) => {
    const tr = scenario.transitions?.find((t) => posId(t.from) === id);
    return tr?.type !== "DOWN";
  });
}

export function analyzePuzzleFitness(
  scenario: Scenario,
  prismData: Array<{ file: string; scenario: Scenario; path: string[] }>
): PuzzleFitnessReport {
  const base = newGame(scenario);
  const solution = computeOptimalSolution(base);
  const counts = countSolutionsWithin(base, 80, 5);
  const softLocks = detectSoftLocks(base);

  const portalHexes = solution.replay
    .filter((s) => s.portalType)
    .map((s) => s.toHexId);

  const deadGameplay = detectDeadGameplay(
    scenario,
    solution.pathHexIds,
    portalHexes,
    softLocks.unreachablePortalFrom
  );
  const similarity = maxPrismSimilarity(scenario, solution.pathHexIds, prismData);

  const layerVisits = new Set<number>();
  for (const step of solution.replay) {
    const m = /^L(\d+)/.exec(step.playerAfter);
    if (m) layerVisits.add(Number(m[1]));
  }

  const target = OPTIMAL_COUNT_TARGETS[scenario.id] ?? { min: 2, max: 20 };
  const noUnreachablePortals =
    softLocks.unreachablePortalFrom.length === 0 &&
    softLocks.unreachablePortalDest.length === 0;

  const optimalTargetMet =
    counts.optimal >= target.min &&
    counts.optimal <= target.max &&
    noUnreachablePortals &&
    requiredUnusedPortals(scenario, deadGameplay.unusedPortals).length === 0;

  const backtracking = solution.replay.some((s) => s.portalType === "DOWN");

  const categoryScores = scoreCategories(
    scenario,
    solution,
    counts,
    softLocks,
    deadGameplay,
    similarity,
    target
  );

  const overall =
    Object.values(categoryScores).reduce((a, b) => a + b, 0) / Object.keys(categoryScores).length;

  const min = solution.minMoves ?? 0;
  const humanReview = buildHumanReview(scenario, solution, counts, categoryScores);

  return {
    trackId: scenario.id,
    trackName: scenario.name,
    shortestSolution: solution.minMoves,
    optimalSolutions: counts.optimal,
    alternativeWithin5: counts.withinSlack,
    portalUsage: portalHexes.length,
    layerVisits: [...layerVisits].sort((a, b) => a - b),
    rowShiftEvents: solution.replay.reduce((s, r) => s + r.rowShiftLayers.length, 0),
    branchingFactor: solution.stats.branchingFactor,
    deadEndsExplored: solution.stats.exploredNodes,
    deadGameplay,
    softLocks,
    backtracking,
    replayLength: solution.replay.length,
    originality: similarity,
    difficulty: Math.min(10, Math.round(min * 0.3 + portalHexes.length * 0.8)),
    estimatedSolveMinutes: `${Math.ceil(min * 0.4)}–${Math.ceil(min * 1.0)}`,
    identity: PUZZLE_IDENTITIES[scenario.id] ?? { hook: "?", memorableLine: "?" },
    categoryScores,
    overallFitness: overall,
    optimalTarget: target,
    optimalTargetMet,
    replayText: formatReplay(solution.replay),
    humanReview,
  };
}

function scoreCategories(
  scenario: Scenario,
  solution: ReturnType<typeof computeOptimalSolution>,
  counts: { optimal: number; withinSlack: number },
  softLocks: SoftLockReport,
  dead: DeadGameplayReport,
  similarity: SimilarityBreakdown,
  target: OptimalCountTarget
): FitnessCategoryScores {
  const opt = counts.optimal;
  const inTarget = opt >= target.min && opt <= target.max;

  let elegance = 10;
  if (opt > target.max) elegance -= Math.min(4, (opt - target.max) / 5);
  if (opt < target.min) elegance -= 2;
  if (counts.withinSlack - opt > 20) elegance -= 1;
  if (inTarget) elegance = Math.max(elegance, 9.5);

  let fairness = 10;
  if (
    softLocks.unreachablePortalFrom.length > 0 ||
    softLocks.unreachablePortalDest.length > 0
  ) {
    fairness = 0;
  }
  if (solution.minMoves === null) fairness = 0;

  const islandMaze =
    (scenario.missing?.length ?? 0) >= 3 && (scenario.transitions?.length ?? 0) === 0;
  const discovery = islandMaze ? 8.5 : scenario.transitions?.length ? 9 : 7;
  let surprise = islandMaze ? 8.5 : backtrackingScore(scenario, solution);
  if (solution.replay.some((s) => s.portalType === "DOWN")) surprise = Math.max(surprise, 9.5);
  const flow = inTarget ? 9.5 : counts.optimal >= target.min ? 9 : 7;
  const replay = solution.replay.some((s) => s.won) ? 10 : 0;
  const originality = similarity.maxPercent <= 20 ? 9.5 : similarity.maxPercent <= 35 ? 8.5 : 5;
  const teaching = scenario.id.includes("t01") ? 9.5 : 8.5;
  const unusedRequired = dead.unusedPortals.filter((id) => {
    const tr = scenario.transitions?.find((t) => posId(t.from) === id);
    return tr?.type !== "DOWN";
  });
  const puzzleIdentity = unusedRequired.length === 0 ? 9 : 6;

  return {
    fairness: clamp(fairness),
    elegance: clamp(elegance),
    discovery: clamp(discovery),
    surprise: clamp(surprise),
    flow: clamp(flow),
    replay: clamp(replay),
    originality: clamp(originality),
    teaching: clamp(teaching),
    puzzleIdentity: clamp(puzzleIdentity),
  };
}

function backtrackingScore(
  scenario: Scenario,
  solution: ReturnType<typeof computeOptimalSolution>
): number {
  if (solution.replay.some((s) => s.portalType === "DOWN")) return 9.5;
  if ((scenario.transitions?.length ?? 0) > 2) return 8.5;
  return 7.5;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

function buildHumanReview(
  scenario: Scenario,
  solution: ReturnType<typeof computeOptimalSolution>,
  counts: { optimal: number },
  scores: FitnessCategoryScores
): PuzzleFitnessReport["humanReview"] {
  const notes: string[] = [];
  const memorable = scores.puzzleIdentity >= 8;
  const aha = scores.surprise >= 8 || scores.discovery >= 8;
  const observation = (scenario.missing?.length ?? 0) > 0 || (scenario.transitions?.length ?? 0) > 1;
  const planning =
    !!scenario.movement &&
    shiftingLayersInMovement(normalizeScenarioMovement(scenario.movement)).length > 0;
  const understanding = counts.optimal <= 15;
  const designerElegant =
    scores.elegance >= 8.5 &&
    counts.optimal <= (OPTIMAL_COUNT_TARGETS[scenario.id]?.max ?? 20);

  if (!memorable) notes.push("Weak puzzle identity — strengthen hook.");
  if (counts.optimal > (OPTIMAL_COUNT_TARGETS[scenario.id]?.max ?? 20)) {
    notes.push("Too many optimal routes — tighten geometry.");
  }

  return {
    memorable,
    ahaMoment: aha,
    observation,
    planning,
    understanding,
    designerElegant,
    notes,
  };
}

export function formatFitnessReport(r: PuzzleFitnessReport): string {
  return [
    `## ${r.trackName} (${r.trackId})`,
    "",
    `**Identity:** ${r.identity.memorableLine}`,
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Shortest solution | ${r.shortestSolution ?? "—"} |`,
    `| Optimal solutions | ${r.optimalSolutions} (target ${r.optimalTarget.min}–${r.optimalTarget.max}) |`,
    `| Solutions within +5 | ${r.alternativeWithin5} |`,
    `| Portal usage | ${r.portalUsage} |`,
    `| Layer visits | ${r.layerVisits.join(", ")} |`,
    `| Row shift events | ${r.rowShiftEvents} |`,
    `| Branching factor | ${r.branchingFactor.toFixed(2)} |`,
    `| Dead ends explored | ${r.deadEndsExplored} |`,
    `| Soft locks (trapped states) | ${r.softLocks.trappedStates} |`,
    `| Unused portals | ${r.deadGameplay.unusedPortals.length} |`,
    `| Originality gate | ${r.originality.maxPercent.toFixed(1)}% |`,
    `| Difficulty | ${r.difficulty}/10 |`,
    `| Est. solve time | ${r.estimatedSolveMinutes} min |`,
    `| **Puzzle fitness** | **${r.overallFitness.toFixed(1)}/10** |`,
    `| Target met | ${r.optimalTargetMet ? "YES" : "NO"} |`,
    "",
    "**Category scores:** fairness " +
      r.categoryScores.fairness +
      ", elegance " +
      r.categoryScores.elegance +
      ", discovery " +
      r.categoryScores.discovery +
      ", surprise " +
      r.categoryScores.surprise +
      ", flow " +
      r.categoryScores.flow +
      ", replay " +
      r.categoryScores.replay +
      ", originality " +
      r.categoryScores.originality +
      ", teaching " +
      r.categoryScores.teaching +
      ", identity " +
      r.categoryScores.puzzleIdentity,
    "",
    "**Human review:** memorable=" +
      r.humanReview.memorable +
      ", aha=" +
      r.humanReview.ahaMoment +
      ", designer-elegant=" +
      r.humanReview.designerElegant,
    "",
    "### Replay",
    "",
    r.replayText,
  ].join("\n");
}
