/**
 * Stranding analysis: reachable states from which Goal is no longer reachable.
 *
 * Method:
 * 1. Forward BFS of legal successful moves (same as optimal solver).
 * 2. Reverse BFS from Goal states along recorded edges.
 * 3. Stranded = reachable − Goal-reaching.
 *
 * Assumptions (match simulator-solver.md):
 * - successful attemptMove only (wrong taps excluded)
 * - solverStateKey identity (player + active layers + row rotation)
 * - cards / encounters / visibility excluded
 */
import type { GameState } from "./types";
import { posId } from "./board";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove } from "./rules";
import {
  restoreStateLite,
  snapshotStateLite,
  type GameStateLiteDTO,
} from "./snapshot";
import { solverStateKey } from "./trackAnalysis";

export type StrandingOutcome =
  | "safe"
  | "optional_stranding"
  | "unsolvable"
  | "search_limit"
  | "structural_error";

export type HexStrandingClass = "safe" | "risky" | "stranded" | "unknown";

export type StrandingPathStep = {
  moveNumber: number;
  moveTarget: string;
  playerAfter: string;
  portalType?: "UP" | "DOWN";
};

export type StrandedStateFinding = {
  stateKey: string;
  playerHexId: string;
  layer: number;
  rowPhaseHint: string;
  activeLayers: number[];
  depth: number;
};

export type PortalStrandingWarning = {
  portalHexId: string;
  portalType: "UP" | "DOWN";
  destinationHexId: string;
  strandedPlayerHexId: string;
  strandedStateKey: string;
};

export type LayerStrandingSummary = {
  layer: number;
  strandedStateCount: number;
  riskyPositionCount: number;
  strandedPositionCount: number;
};

export type HexStrandingSummary = {
  hexId: string;
  layer: number;
  classification: HexStrandingClass;
  safeStateCount: number;
  strandedStateCount: number;
};

export type StrandingReport = {
  outcome: StrandingOutcome;
  severity: "green" | "amber" | "red" | "unknown";
  structuralMessage: string | null;
  reachableStateCount: number;
  goalReachingStateCount: number;
  safeStateCount: number;
  strandedStateCount: number;
  riskyPositionCount: number;
  startCanReachGoal: boolean;
  hasOptionalStranding: boolean;
  hasUnavoidableFailure: boolean;
  searchAborted: boolean;
  runtimeMs: number;
  exploredNodes: number;
  /** Full set of Goal-reaching state keys (for tests). */
  goalReachingKeys: string[];
  /** Full set of stranded state keys (for tests; may be large). */
  strandedKeys: string[];
  hexSummaries: HexStrandingSummary[];
  layerSummaries: LayerStrandingSummary[];
  strandedSamples: StrandedStateFinding[];
  portalWarnings: PortalStrandingWarning[];
  exampleBadPath: StrandingPathStep[];
  exampleBadPathTargets: string[];
};

type Edge = {
  toSig: string;
  moveTarget: string;
  portalType?: "UP" | "DOWN";
  portalDest?: string;
};

function goalIdFromState(state: GameState): string | null {
  for (const hex of state.hexesById.values()) {
    if (hex.kind === "GOAL") return hex.id;
  }
  const g = state.scenario.goal;
  return g ? posId(g) : null;
}

function sortedNeighborIds(state: GameState, playerHexId: string): string[] {
  return neighborIdsSameLayer(state, playerHexId)
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function layerFromHexId(hexId: string): number {
  const m = /^L(\d+)/.exec(hexId);
  return m ? Number(m[1]) : 0;
}

function rowPhaseHint(dto: GameStateLiteDTO, layer: number): string {
  const entry = dto.rows.find((r) => r.layer === layer);
  if (!entry) return "";
  return entry.rows.map((row) => row[0] ?? "").join(",");
}

function emptyReport(
  partial: Partial<StrandingReport> & Pick<StrandingReport, "outcome" | "severity">
): StrandingReport {
  return {
    structuralMessage: null,
    reachableStateCount: 0,
    goalReachingStateCount: 0,
    safeStateCount: 0,
    strandedStateCount: 0,
    riskyPositionCount: 0,
    startCanReachGoal: false,
    hasOptionalStranding: false,
    hasUnavoidableFailure: false,
    searchAborted: false,
    runtimeMs: 0,
    exploredNodes: 0,
    goalReachingKeys: [],
    strandedKeys: [],
    hexSummaries: [],
    layerSummaries: [],
    strandedSamples: [],
    portalWarnings: [],
    exampleBadPath: [],
    exampleBadPathTargets: [],
    ...partial,
  };
}

export function analyzeStranding(
  base: GameState,
  maxTurns = 80,
  maxNodes = 400000
): StrandingReport {
  const t0 = performance.now();
  const goalId = goalIdFromState(base);
  if (!goalId) {
    return emptyReport({
      outcome: "structural_error",
      severity: "red",
      structuralMessage: "Goal missing from game state",
      runtimeMs: performance.now() - t0,
    });
  }

  const startHex = base.hexesById.get(base.playerHexId);
  if (!startHex || startHex.missing || startHex.blocked) {
    return emptyReport({
      outcome: "structural_error",
      severity: "red",
      structuralMessage: "Start is missing or blocked",
      runtimeMs: performance.now() - t0,
    });
  }

  const startDto = snapshotStateLite(base);
  const startSig = solverStateKey(startDto);

  const dtoBySig = new Map<string, GameStateLiteDTO>();
  const edges = new Map<string, Edge[]>();
  const parent = new Map<
    string,
    { parentSig: string; moveTarget: string; portalType?: "UP" | "DOWN" }
  >();
  const depth = new Map<string, number>();

  dtoBySig.set(startSig, startDto);
  edges.set(startSig, []);
  depth.set(startSig, 0);

  type QNode = { sig: string; turns: number };
  const q: QNode[] = [{ sig: startSig, turns: 0 }];
  let head = 0;
  let explored = 0;
  let hitNodeLimit = false;
  let hitTurnLimit = false;

  while (head < q.length) {
    if (explored >= maxNodes) {
      hitNodeLimit = true;
      break;
    }

    const node = q[head++];
    explored++;

    if (node.turns >= maxTurns) {
      hitTurnLimit = true;
      continue;
    }

    const dto = dtoBySig.get(node.sig);
    if (!dto) continue;

    // Completed puzzle — do not expand further from Goal.
    if (dto.playerHexId === goalId) continue;

    const st = restoreStateLite(base, dto);
    const neighbors = sortedNeighborIds(st, st.playerHexId);
    const out: Edge[] = [];

    for (const nid of neighbors) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;

      const st2 = restoreStateLite(base, dto);
      const result = attemptMove(st2, nid);
      if (!result.ok) continue;

      const dto2 = snapshotStateLite(st2);
      const sig2 = solverStateKey(dto2);
      const tr = st.transitionsByFromId.get(nid);
      const portalType =
        result.triggeredTransition && tr ? (tr.type as "UP" | "DOWN") : undefined;
      const portalDest =
        result.triggeredTransition && tr ? posId(tr.to) : undefined;

      out.push({ toSig: sig2, moveTarget: nid, portalType, portalDest });

      if (!dtoBySig.has(sig2)) {
        dtoBySig.set(sig2, dto2);
        edges.set(sig2, []);
        depth.set(sig2, node.turns + 1);
        parent.set(sig2, { parentSig: node.sig, moveTarget: nid, portalType });
        q.push({ sig: sig2, turns: node.turns + 1 });
      }
    }

    edges.set(node.sig, out);
  }

  const searchAborted = hitNodeLimit || hitTurnLimit;

  const preds = new Map<string, string[]>();
  for (const [from, outs] of edges) {
    for (const e of outs) {
      const list = preds.get(e.toSig) ?? [];
      list.push(from);
      preds.set(e.toSig, list);
    }
  }

  const goalStates: string[] = [];
  for (const [sig, dto] of dtoBySig) {
    if (dto.playerHexId === goalId) goalStates.push(sig);
  }

  const canReachGoal = new Set<string>();
  const rq = [...goalStates];
  for (const g of goalStates) canReachGoal.add(g);
  let rh = 0;
  while (rh < rq.length) {
    const cur = rq[rh++];
    for (const p of preds.get(cur) ?? []) {
      if (canReachGoal.has(p)) continue;
      canReachGoal.add(p);
      rq.push(p);
    }
  }

  const reachable = [...dtoBySig.keys()];
  const strandedKeys = reachable.filter((s) => !canReachGoal.has(s));
  const startCanReachGoal = canReachGoal.has(startSig);

  const byHex = new Map<string, { safe: number; stranded: number; layer: number }>();
  for (const sig of reachable) {
    const dto = dtoBySig.get(sig)!;
    const hex = dto.playerHexId;
    const bucket = byHex.get(hex) ?? {
      safe: 0,
      stranded: 0,
      layer: layerFromHexId(hex),
    };
    if (canReachGoal.has(sig)) bucket.safe++;
    else bucket.stranded++;
    byHex.set(hex, bucket);
  }

  const hexSummaries: HexStrandingSummary[] = [];
  for (const [hexId, b] of [...byHex.entries()].sort((a, c) => a[0].localeCompare(c[0]))) {
    let classification: HexStrandingClass;
    if (searchAborted) {
      if (b.safe > 0 && b.stranded > 0) classification = "risky";
      else if (b.safe > 0) classification = "safe";
      else classification = "unknown";
    } else if (b.stranded === 0) classification = "safe";
    else if (b.safe === 0) classification = "stranded";
    else classification = "risky";

    hexSummaries.push({
      hexId,
      layer: b.layer,
      classification,
      safeStateCount: b.safe,
      strandedStateCount: b.stranded,
    });
  }
  const riskyPositionCount = hexSummaries.filter((h) => h.classification === "risky").length;

  const layerMap = new Map<number, LayerStrandingSummary>();
  for (const h of hexSummaries) {
    const L = layerMap.get(h.layer) ?? {
      layer: h.layer,
      strandedStateCount: 0,
      riskyPositionCount: 0,
      strandedPositionCount: 0,
    };
    L.strandedStateCount += h.strandedStateCount;
    if (h.classification === "risky") L.riskyPositionCount++;
    if (h.classification === "stranded") L.strandedPositionCount++;
    layerMap.set(h.layer, L);
  }
  const layerSummaries = [...layerMap.values()]
    .filter((L) => L.strandedStateCount > 0 || L.riskyPositionCount > 0 || L.strandedPositionCount > 0)
    .sort((a, b) => a.layer - b.layer);

  const strandedSamples: StrandedStateFinding[] = strandedKeys
    .slice()
    .sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || a.localeCompare(b))
    .slice(0, 12)
    .map((sig) => {
      const dto = dtoBySig.get(sig)!;
      const layer = layerFromHexId(dto.playerHexId);
      return {
        stateKey: sig,
        playerHexId: dto.playerHexId,
        layer,
        rowPhaseHint: rowPhaseHint(dto, layer),
        activeLayers: [...(dto.movementActiveLayers ?? [])].sort((a, b) => a - b),
        depth: depth.get(sig) ?? 0,
      };
    });

  const portalWarnings: PortalStrandingWarning[] = [];
  const portalSeen = new Set<string>();
  for (const [, outs] of edges) {
    for (const e of outs) {
      if (!e.portalType || !e.portalDest) continue;
      if (canReachGoal.has(e.toSig)) continue;
      const destDto = dtoBySig.get(e.toSig);
      if (!destDto) continue;
      const k = `${e.portalType}:${e.moveTarget}->${e.portalDest}`;
      if (portalSeen.has(k)) continue;
      portalSeen.add(k);
      portalWarnings.push({
        portalHexId: e.moveTarget,
        portalType: e.portalType,
        destinationHexId: e.portalDest,
        strandedPlayerHexId: destDto.playerHexId,
        strandedStateKey: e.toSig,
      });
    }
  }

  let exampleBadPathTargets: string[] = [];
  let exampleBadPath: StrandingPathStep[] = [];
  if (strandedSamples.length > 0) {
    const target = strandedSamples[0].stateKey;
    const targets: string[] = [];
    let cur: string | undefined = target;
    while (cur && cur !== startSig) {
      const p = parent.get(cur);
      if (!p) break;
      targets.unshift(p.moveTarget);
      cur = p.parentSig;
    }
    exampleBadPathTargets = targets;

    let turnState = restoreStateLite(base, snapshotStateLite(base));
    for (let i = 0; i < targets.length; i++) {
      const nid = targets[i];
      const tr = turnState.transitionsByFromId.get(nid);
      const result = attemptMove(turnState, nid);
      exampleBadPath.push({
        moveNumber: i + 1,
        moveTarget: nid,
        playerAfter: turnState.playerHexId,
        portalType:
          result.ok && result.triggeredTransition && tr
            ? (tr.type as "UP" | "DOWN")
            : undefined,
      });
      if (!result.ok) break;
    }
  }

  let outcome: StrandingOutcome;
  let severity: StrandingReport["severity"];
  if (searchAborted) {
    outcome = "search_limit";
    severity = "unknown";
  } else if (!startCanReachGoal) {
    outcome = "unsolvable";
    severity = "red";
  } else if (strandedKeys.length > 0) {
    outcome = "optional_stranding";
    severity = "amber";
  } else {
    outcome = "safe";
    severity = "green";
  }

  return {
    outcome,
    severity,
    structuralMessage: null,
    reachableStateCount: reachable.length,
    goalReachingStateCount: canReachGoal.size,
    safeStateCount: canReachGoal.size,
    strandedStateCount: strandedKeys.length,
    riskyPositionCount,
    startCanReachGoal,
    hasOptionalStranding: startCanReachGoal && strandedKeys.length > 0 && !searchAborted,
    hasUnavoidableFailure: !startCanReachGoal && !searchAborted,
    searchAborted,
    runtimeMs: performance.now() - t0,
    exploredNodes: explored,
    goalReachingKeys: [...canReachGoal],
    strandedKeys,
    hexSummaries,
    layerSummaries,
    strandedSamples,
    portalWarnings: portalWarnings.slice(0, 20),
    exampleBadPath,
    exampleBadPathTargets,
  };
}
