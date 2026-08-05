/**
 * Track validation for scenario JSON boards.
 * Schema checks, reachability, uniqueness vs reference packs, optional intended-solution checks.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { Pos, Scenario } from "./types";
import { ROW_LENS, posId } from "./board";
import { assertScenario } from "./scenario";
import { newGame, getMinMovesToGoal } from "./api";
import { restoreStateLite, snapshotStateLite } from "./snapshot";
import { attemptMove } from "./rules";
import { neighborIdsSameLayer } from "./neighbors";

export type TrackValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type TrackValidationReport = {
  id: string;
  file?: string;
  valid: boolean;
  issues: TrackValidationIssue[];
  minMovesToGoal: number | null;
  intendedMoves: number | null;
  shortcutDetected: boolean;
  layersReachable: number[];
  layersUnreachable: number[];
  geometryFingerprint: string;
};

export type ValidateTrackOptions = {
  file?: string;
  intendedSolutionHexIds?: string[];
  referenceFingerprints?: Set<string>;
  maxTurns?: number;
};

function inBounds(p: Pos, layers: number): boolean {
  if (p.layer < 1 || p.layer > layers) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  const len = ROW_LENS[p.row];
  return p.col >= 0 && p.col < len;
}

/** Stable fingerprint of board geometry (excludes id/name/description metadata). */
export function geometryFingerprint(s: Scenario): string {
  const payload = {
    start: s.start,
    goal: s.goal,
    missing: (s.missing ?? []).map(posId).sort(),
    blocked: (s.blocked ?? []).map(posId).sort(),
    movement: s.movement ?? {},
    transitions: (s.transitions ?? []).map((t) => ({
      type: t.type,
      from: posId(t.from),
      to: posId(t.to),
    })),
    villains: (s as any).villains ?? null,
    cardTriggers: ((s as any).cardTriggers ?? []).map((c: any) => ({
      card: c.card,
      layer: c.layer,
      row: c.row,
      col: c.col,
    })),
    revealOnEnterGuaranteedUp: s.revealOnEnterGuaranteedUp ?? true,
  };
  return JSON.stringify(payload);
}

function validateCoords(s: Scenario, issues: TrackValidationIssue[]) {
  const missingSeen = new Set<string>();
  const blockedSeen = new Set<string>();
  const fromSeen = new Set<string>();

  const boundsCheck = (p: Pos, label: string) => {
    if (!inBounds(p, s.layers)) {
      issues.push({
        code: "OUT_OF_BOUNDS",
        message: `${label} out of bounds: ${posId(p)}`,
        severity: "error",
      });
    }
  };

  boundsCheck(s.start, "start");
  boundsCheck(s.goal, "goal");

  for (const p of s.missing ?? []) {
    boundsCheck(p, "missing");
    const id = posId(p);
    if (missingSeen.has(id)) {
      issues.push({
        code: "DUPLICATE_COORD",
        message: `Duplicate missing hex: ${id}`,
        severity: "error",
      });
    }
    missingSeen.add(id);
  }

  for (const p of s.blocked ?? []) {
    boundsCheck(p, "blocked");
    const id = posId(p);
    if (blockedSeen.has(id)) {
      issues.push({
        code: "DUPLICATE_COORD",
        message: `Duplicate blocked hex: ${id}`,
        severity: "error",
      });
    }
    blockedSeen.add(id);
  }

  for (const t of s.transitions ?? []) {
    boundsCheck(t.from, "transition.from");
    boundsCheck(t.to, "transition.to");
    const fromId = posId(t.from);
    if (fromSeen.has(fromId)) {
      issues.push({
        code: "DUPLICATE_TRANSITION_FROM",
        message: `Multiple transitions from same hex: ${fromId}`,
        severity: "error",
      });
    }
    fromSeen.add(fromId);
  }

  const villains = (s as any).villains;
  if (villains?.triggers) {
    for (const tr of villains.triggers) {
      if (tr.col !== undefined) {
        boundsCheck({ layer: tr.layer, row: tr.row, col: tr.col }, "villain.trigger");
      } else if (
        tr.layer < 1 ||
        tr.layer > s.layers ||
        tr.row < 0 ||
        tr.row >= ROW_LENS.length
      ) {
        issues.push({
          code: "VILLAIN_TRIGGER_INVALID",
          message: `Invalid villain trigger: layer ${tr.layer} row ${tr.row}`,
          severity: "error",
        });
      }
    }
  }

  for (const c of (s as any).cardTriggers ?? []) {
    boundsCheck({ layer: c.layer, row: c.row, col: c.col }, "cardTrigger");
  }
}

function layersReachableFromStart(s: Scenario, maxTurns = 60): { reachable: number[]; unreachable: number[] } {
  const base = newGame(s);
  const startDto = snapshotStateLite(base);
  const seen = new Set<string>();
  const layers = new Set<number>();

  type Node = { dto: typeof startDto };
  const q: Node[] = [{ dto: startDto }];
  seen.add(signatureLite(startDto));

  const startHex = base.hexesById.get(base.playerHexId);
  if (startHex) layers.add(startHex.pos.layer);

  let head = 0;
  while (head < q.length) {
    const node = q[head++];
    const st = restoreStateLite(base, node.dto);
    const ph = st.hexesById.get(st.playerHexId);
    if (ph) layers.add(ph.pos.layer);
    if (st.turn >= maxTurns) continue;

    const neighbors = neighborIdsSameLayer(st, st.playerHexId);
    for (const nid of neighbors) {
      const st2 = restoreStateLite(base, node.dto);
      const result = attemptMove(st2, nid);
      if (!result.ok && result.reason !== "BLOCKED") continue;

      const dto = snapshotStateLite(st2);
      const sig = signatureLite(dto);
      if (seen.has(sig)) continue;
      seen.add(sig);
      q.push({ dto });
    }
  }

  const reachable = [...layers].sort((a, b) => a - b);
  const unreachable: number[] = [];
  for (let l = 1; l <= s.layers; l++) {
    if (!layers.has(l)) unreachable.push(l);
  }
  return { reachable, unreachable };
}

function signatureLite(dto: ReturnType<typeof snapshotStateLite>): string {
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

function simulateIntendedSolution(
  s: Scenario,
  hexIds: string[]
): { ok: boolean; moves: number; error?: string; won: boolean } {
  const st = newGame(s);
  let moves = 0;

  for (const targetId of hexIds) {
    const result = attemptMove(st, targetId);
    if (!result.ok) {
      return { ok: false, moves, error: `Move to ${targetId} failed: ${result.reason}`, won: false };
    }
    moves++;
    if (result.won) return { ok: true, moves, won: true };
  }

  const player = st.hexesById.get(st.playerHexId);
  const won = player?.kind === "GOAL";
  return { ok: won, moves, won, error: won ? undefined : "Intended path did not reach goal" };
}

export function validateTrack(scenario: Scenario, opts: ValidateTrackOptions = {}): TrackValidationReport {
  const issues: TrackValidationIssue[] = [];
  const maxTurns = opts.maxTurns ?? 80;

  try {
    assertScenario(scenario);
  } catch (e) {
    issues.push({
      code: "SCHEMA",
      message: e instanceof Error ? e.message : String(e),
      severity: "error",
    });
    return {
      id: scenario.id ?? "unknown",
      file: opts.file,
      valid: false,
      issues,
      minMovesToGoal: null,
      intendedMoves: null,
      shortcutDetected: false,
      layersReachable: [],
      layersUnreachable: [],
      geometryFingerprint: geometryFingerprint(scenario),
    };
  }

  validateCoords(scenario, issues);

  const fp = geometryFingerprint(scenario);
  if (opts.referenceFingerprints?.has(fp)) {
    issues.push({
      code: "DUPLICATE_GEOMETRY",
      message: "Board geometry matches a reference track (not original)",
      severity: "error",
    });
  }

  let minMoves: number | null = null;
  let intendedMoves: number | null = null;
  let shortcutDetected = false;

  try {
    const st = newGame(scenario);
    minMoves = getMinMovesToGoal(st, maxTurns);
    if (minMoves === null) {
      issues.push({
        code: "UNSOLVABLE",
        message: "Goal is not reachable within search limit",
        severity: "error",
      });
    }
  } catch (e) {
    issues.push({
      code: "SOLVER_ERROR",
      message: e instanceof Error ? e.message : String(e),
      severity: "error",
    });
  }

  const { reachable, unreachable } = layersReachableFromStart(scenario, maxTurns);
  for (const l of unreachable) {
    // Layers with only missing hexes (L6/L7 empty in some tracks) are OK if unused
    const hasPlayable = scenario.layers >= l;
    if (hasPlayable) {
      const layerHasHex = ROW_LENS.some((_, row) => {
        const len = ROW_LENS[row];
        for (let col = 0; col < len; col++) {
          const id = posId({ layer: l, row, col });
          const missing = (scenario.missing ?? []).some((p) => posId(p) === id);
          if (!missing) return true;
        }
        return false;
      });
      if (layerHasHex) {
        issues.push({
          code: "LAYER_UNREACHABLE",
          message: `Layer ${l} has playable hexes but is unreachable from start`,
          severity: "warning",
        });
      }
    }
  }

  if (opts.intendedSolutionHexIds?.length) {
    const sim = simulateIntendedSolution(scenario, opts.intendedSolutionHexIds);
    intendedMoves = sim.moves;
    if (!sim.ok) {
      issues.push({
        code: "INTENDED_SOLUTION_INVALID",
        message: sim.error ?? "Intended solution failed",
        severity: "error",
      });
    }
    if (minMoves !== null && sim.won && sim.moves > minMoves) {
      shortcutDetected = true;
      issues.push({
        code: "SHORTCUT_EXISTS",
        message: `Shorter solution exists: optimal ${minMoves} vs intended ${sim.moves}`,
        severity: "error",
      });
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    id: scenario.id,
    file: opts.file,
    valid: !hasErrors,
    issues,
    minMovesToGoal: minMoves,
    intendedMoves,
    shortcutDetected,
    layersReachable: reachable,
    layersUnreachable: unreachable,
    geometryFingerprint: fp,
  };
}

/** Load fingerprints from all scenario*.json files in a directory. */
export function fingerprintsFromDirectory(dir: string): Set<string> {
  const fps = new Set<string>();
  if (!existsSync(dir)) return fps;

  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, name), "utf8")) as Scenario;
    fps.add(geometryFingerprint(raw));
  }
  return fps;
}

export function validateTrackFile(
  filePath: string,
  opts: Omit<ValidateTrackOptions, "file"> = {}
): TrackValidationReport {
  const scenario = JSON.parse(readFileSync(filePath, "utf8")) as Scenario;
  return validateTrack(scenario, { ...opts, file: filePath });
}
