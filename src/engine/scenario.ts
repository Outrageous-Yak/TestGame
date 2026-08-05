// src/engine/scenario.ts
import type { Scenario, Pos, Transition } from "./types";
import { ROW_LENS, posId } from "./board";
import { attachRuntimeMovement } from "./rowMovement/attachRuntimeMovement";
import { validateScenarioMovementDefinition } from "./rowMovement/validateRowMovement";
import type { ScenarioMovementDefinition } from "./rowMovement/types";

/* =========================================================
   Bounds (v0.1: 7 layers, ROW_LENS.length rows)
========================================================= */

const EXPECTED_LAYERS = 7;

function inBounds(p: Pos, layers: number = EXPECTED_LAYERS): boolean {
  if (p.layer < 1 || p.layer > layers) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  const len = ROW_LENS[p.row];
  return p.col >= 0 && p.col < len;
}

function assertInBounds(p: Pos, label: string, layers: number = EXPECTED_LAYERS) {
  if (!inBounds(p, layers)) {
    throw new Error(`${label} out of bounds: ${JSON.stringify(p)}`);
  }
}

/* =========================================================
   Scenario validation
========================================================= */

export function assertScenario(s: Scenario) {
  if (!s || typeof s !== "object") throw new Error("Scenario is missing/invalid");
  if (!s.id || !s.name) throw new Error("Scenario needs id and name");
  if (s.layers !== EXPECTED_LAYERS) throw new Error(`v0.1 expects layers=${EXPECTED_LAYERS}`);
  if (!s.start || !s.goal) throw new Error("Scenario missing start/goal");

  // Normalize optional fields (mutates scenario for convenience)
  s.missing = s.missing ?? [];
  s.blocked = s.blocked ?? [];
  s.transitions = s.transitions ?? [];
  s.movement = s.movement ?? {};
  if (typeof s.revealOnEnterGuaranteedUp !== "boolean") s.revealOnEnterGuaranteedUp = true;

  // Core bounds
  assertInBounds(s.start, "start", s.layers);
  assertInBounds(s.goal, "goal", s.layers);

  // Normalize & validate all coords
  for (const p of s.missing) assertInBounds(p, "missing", s.layers);
  for (const p of s.blocked) assertInBounds(p, "blocked", s.layers);

  // Build fast lookup sets
  const missingSet = new Set(s.missing.map(posId));
  const blockedSet = new Set(s.blocked.map(posId));

  const startId = posId(s.start);
  const goalId = posId(s.goal);

  if (missingSet.has(startId) || blockedSet.has(startId)) {
    throw new Error("Start cannot be missing/blocked");
  }
  if (missingSet.has(goalId) || blockedSet.has(goalId)) {
    throw new Error("Goal cannot be missing/blocked");
  }

  // Transitions
  const fromSeen = new Set<string>();
  const upCountByLayer = new Map<number, number>();

  for (const t of s.transitions) {
    validateTransition(t, s.layers);

    const fromK = posId(t.from);
    if (fromSeen.has(fromK)) throw new Error(`Multiple transitions from same hex: ${fromK}`);
    fromSeen.add(fromK);

    if (missingSet.has(fromK) || blockedSet.has(fromK)) {
      throw new Error(`Transition FROM missing/blocked: ${fromK}`);
    }

    const toK = posId(t.to);
    if (missingSet.has(toK) || blockedSet.has(toK)) {
      throw new Error(`Transition TO missing/blocked: ${toK}`);
    }

    if (t.type === "UP") {
      upCountByLayer.set(t.from.layer, (upCountByLayer.get(t.from.layer) ?? 0) + 1);
    }
  }

  // Movement — validate authored JSON (legacy presets still accepted at load)
  validateScenarioMovementDefinition((s.movement ?? {}) as ScenarioMovementDefinition, s.layers);

  attachRuntimeMovement(s);

  // Guaranteed UP reveal requires at least one usable UP transition per layer
  if (s.revealOnEnterGuaranteedUp) {
    for (let layer = 1; layer <= s.layers; layer++) {
      const n = upCountByLayer.get(layer) ?? 0;
      if (n === 0) {
        throw new Error(
          `revealOnEnterGuaranteedUp is true, but Layer ${layer} has no usable UP transitions.`
        );
      }
    }
  }
}

/* =========================================================
   Helpers
========================================================= */

function validateTransition(t: Transition, layers: number) {
  if (!t) throw new Error("Transition missing");
  if (t.type !== "UP" && t.type !== "DOWN") throw new Error(`Invalid transition type: ${String(t.type)}`);
  if (!t.from || !t.to) throw new Error("Transition missing from/to");

  assertInBounds(t.from, "Transition FROM", layers);
  assertInBounds(t.to, "Transition TO", layers);
}
