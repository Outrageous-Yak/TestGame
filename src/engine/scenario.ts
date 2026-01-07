import type { Scenario, Pos, Transition } from "./types";
import { ROW_LENS, posId } from "./board";

function inBounds(p: Pos): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row > 6) return false;
  const len = ROW_LENS[p.row];
  return p.col >= 0 && p.col < len;
}

export function assertScenario(s: Scenario) {
  if (!s.id || !s.name) throw new Error("Scenario needs id and name");
  if (s.layers !== 7) throw new Error("v0.1 expects layers=7");
  if (!s.start || !s.goal) throw new Error("Scenario missing start/goal");

  s.missing = s.missing ?? [];
  s.blocked = s.blocked ?? [];
  s.transitions = s.transitions ?? [];
  s.movement = s.movement ?? {};
  if (typeof s.revealOnEnterGuaranteedUp !== "boolean") s.revealOnEnterGuaranteedUp = true;

  if (!inBounds(s.start)) throw new Error(`start out of bounds: ${JSON.stringify(s.start)}`);
  if (!inBounds(s.goal)) throw new Error(`goal out of bounds: ${JSON.stringify(s.goal)}`);

  const missingSet = new Set(s.missing.map(posId));
  const blockedSet = new Set(s.blocked.map(posId));

  if (missingSet.has(posId(s.start)) || blockedSet.has(posId(s.start))) throw new Error("Start cannot be missing/blocked");
  if (missingSet.has(posId(s.goal)) || blockedSet.has(posId(s.goal))) throw new Error("Goal cannot be missing/blocked");

  for (const p of s.missing) if (!inBounds(p)) throw new Error(`Missing out of bounds: ${JSON.stringify(p)}`);
  for (const p of s.blocked) if (!inBounds(p)) throw new Error(`Blocked out of bounds: ${JSON.stringify(p)}`);

  // transitions
  const fromSeen = new Set<string>();
  const upCountByLayer = new Map<number, number>();

  for (const t of s.transitions) {
    validateTransition(t);
    const fromK = posId(t.from);
    if (fromSeen.has(fromK)) throw new Error(`Multiple transitions from same hex: ${fromK}`);
    fromSeen.add(fromK);

    if (missingSet.has(fromK) || blockedSet.has(fromK)) throw new Error(`Transition FROM missing/blocked: ${fromK}`);
    const toK = posId(t.to);
    if (missingSet.has(toK) || blockedSet.has(toK)) throw new Error(`Transition TO missing/blocked: ${toK}`);

    if (t.type === "UP") upCountByLayer.set(t.from.layer, (upCountByLayer.get(t.from.layer) ?? 0) + 1);
  }

  // movement patterns
  const allowed = new Set(["NONE", "SEVEN_LEFT_SIX_RIGHT", "TOP3_RIGHT_BOTTOM4_LEFT"]);
  for (const [k, v] of Object.entries(s.movement)) {
    const layer = Number(k);
    if (!Number.isFinite(layer) || layer < 1 || layer > 7) throw new Error(`Invalid movement layer key: ${k}`);
    if (!allowed.has(v)) throw new Error(`Invalid movement pattern on layer ${layer}: ${v}`);
  }
  if (s.movement["1"] && s.movement["1"] !== "NONE") throw new Error("v0.1: Layer 1 must be NONE/static");

  if (s.revealOnEnterGuaranteedUp) {
    for (let layer = 1; layer <= 7; layer++) {
      const n = upCountByLayer.get(layer) ?? 0;
      if (n === 0) throw new Error(`revealOnEnterGuaranteedUp is true, but Layer ${layer} has no usable UP transitions.`);
    }
  }
}

function validateTransition(t: Transition) {
  if (t.type !== "UP" && t.type !== "DOWN") throw new Error(`Invalid transition type: ${t.type}`);
  if (!t.from || !t.to) throw new Error("Transition missing from/to");
  if (!inBounds(t.from)) throw new Error(`Transition FROM out of bounds: ${JSON.stringify(t.from)}`);
  if (!inBounds(t.to)) throw new Error(`Transition TO out of bounds: ${JSON.stringify(t.to)}`);
}
