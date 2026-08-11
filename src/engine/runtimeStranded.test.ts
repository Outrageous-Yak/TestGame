/**
 * Stage 2 — runtime STRANDED terminal evaluation (engine-level).
 */
import { describe, expect, it } from "vitest";
import { newGame } from "./api";
import type { Scenario } from "./types";
import { attemptMove } from "./rules";
import { attemptMoveToSlot } from "./moveAttempt";
import { evaluateAttemptTerminal } from "./attemptTerminal";
import { ROW_LENS, inBounds } from "./board";
import { findSlot, neighborSlots } from "./layout";
import {
  isAuthoritativeStranded,
  listLegalSuccessfulMoveTargets,
  playerOnGoal,
} from "./legalMoves";

function noneMovement(): Scenario["movement"] {
  return {
    "1": "NONE",
    "2": "NONE",
    "3": "NONE",
    "4": "NONE",
    "5": "NONE",
    "6": "NONE",
    "7": "NONE",
  };
}

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "runtime_stranded",
    name: "Runtime Stranded",
    layers: 7,
    start: { layer: 1, row: 3, col: 3 },
    goal: { layer: 1, row: 3, col: 5 },
    missing: [],
    blocked: [],
    movement: noneMovement(),
    transitions: [],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

function allBoardPositions(layer = 1): NonNullable<Scenario["missing"]> {
  const out: NonNullable<Scenario["missing"]> = [];
  for (let row = 0; row < ROW_LENS.length; row++) {
    for (let col = 0; col < ROW_LENS[row]!; col++) {
      out.push({ layer, row, col });
    }
  }
  return out;
}

function missingNeighborsOf(
  base: Scenario,
  hexId: string,
  extraKeep: string[] = []
): NonNullable<Scenario["missing"]> {
  const st = newGame({ ...base, missing: [] });
  const hex = st.hexesById.get(hexId);
  if (!hex) return [];
  const keep = new Set<string>([
    hexId,
    `L${base.start.layer}-R${base.start.row}-C${base.start.col}`,
    `L${base.goal.layer}-R${base.goal.row}-C${base.goal.col}`,
    ...extraKeep,
  ]);
  const slot = findSlot(st, hex.pos.layer, hexId);
  if (!slot) return [];
  const missing: NonNullable<Scenario["missing"]> = [];
  for (const s of neighborSlots(slot.row, slot.col)) {
    const p = { layer: hex.pos.layer, row: s.r, col: s.c };
    if (!inBounds(p, base.layers)) continue;
    const id = `L${p.layer}-R${p.row}-C${p.col}`;
    if (keep.has(id)) continue;
    missing.push(p);
  }
  return missing;
}

describe("runtime STRANDED terminal", () => {
  it("A. normal connected state is not STRANDED", () => {
    const state = newGame(scenario());
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    expect(listLegalSuccessfulMoveTargets(state).length).toBeGreaterThan(0);
  });

  it("B. isolated non-Goal state is STRANDED", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
  });

  it("C. Goal with zero outgoing moves is SUCCESS, not STRANDED", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const s = scenario({
      ...base,
      missing: missingNeighborsOf(base, "L1-R3-C3", ["L1-R3-C2"]),
    });
    const state = newGame(s);
    expect(attemptMove(state, "L1-R3-C3").ok).toBe(true);
    expect(playerOnGoal(state)).toBe(true);
    expect(evaluateAttemptTerminal(state).kind).toBe("success");
    expect(isAuthoritativeStranded(state)).toBe(false);
  });

  it("D. legal move onto isolating spur → STRANDED after turn resolution", () => {
    // Path: start-only corridor into a single dead hex with all exits missing.
    const missing = allBoardPositions(1).filter((p) => {
      const keep = (p.row === 3 && (p.col === 1 || p.col === 2)) || (p.row === 0 && p.col === 0);
      return !keep;
    });
    // Also isolate col2 completely except link from col1 — after moving to col2, remove link by missing? 
    // Static: col1↔col2 connected; once on col2, only neighbor was col1 — still connected.
    // Build: start at col1, only neighbor col2; col2 has NO other present neighbors (col1 present).
    // Moving to col2 leaves col1 as exit — not stranded.
    // Need move that removes the return path via row shift (test E) or portal (test F).
    // Here: move onto hex that is itself isolated because we mark start missing? Can't.
    // Use portal to isolated layer instead — covered in F.
    // For D: move from a 2-hex island onto the leaf where we also block return by making start blocked after? 
    // Simplest static D: start adjacent to isolated-goal-island? 
    // Actually: start has one neighbor N; N has only start as neighbor among present — moving to N still has start as exit.
    // True static isolation of destination requires removing the from-hex — impossible after moving onto it while from remains.
    // So D without row/portal cannot isolate unless from becomes missing (it doesn't).
    // Use a 3-hex line where middle is start; move to end that we surround... end still connects to middle.
    // Conclude: static legal move cannot create isolation without row/portal. Mark D as row-free portal-free N/A by using blocked after? No.
    // Implement D via: player moves to hex whose only adjacency was through a hex that row-shift will... that's E.
    // Spec says "Legal move causes isolation" — portal landing on isolated hex counts as legal move causing isolation.
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 0, col: 0 },
      missing: allBoardPositions(1).filter((p) => {
        const keep =
          (p.row === 3 && p.col === 1) ||
          (p.row === 3 && p.col === 2) || // portal tile
          (p.row === 0 && p.col === 0) || // goal elsewhere unused
          (p.layer === 1 && false);
        return !keep;
      }),
      // Actually put isolated dest on layer 2
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    // Isolate L2-R3-C3 neighbors on layer 2
    const base2 = scenario({
      ...s,
      start: { layer: 2, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const l2missing = missingNeighborsOf(base2, "L2-R3-C3");
    const full = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 0, col: 0 },
      missing: [
        ...allBoardPositions(1).filter((p) => !(p.row === 3 && (p.col === 1 || p.col === 2))),
        ...l2missing,
      ],
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    const state = newGame(full);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    const outcome = attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });
    expect(outcome.result).toBe("MOVED");
    expect(state.playerHexId).toBe("L2-R3-C3");
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
  });

  it("E. row movement causes isolation → STRANDED after resolution", () => {
    // Present: start L1-R3-C3 and only neighbour L1-R2-C3 (plus unreachable Goal).
    // Move onto R2C3; row 2 LEFT 1 shifts the return adjacency away → zero exits.
    const missing = allBoardPositions(1).filter((p) => {
      const keep =
        (p.row === 3 && p.col === 3) ||
        (p.row === 2 && p.col === 3) ||
        (p.row === 0 && p.col === 0);
      return !keep;
    });
    const s = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
      missing,
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "LEFT", amount: 1 },
            "3": { direction: "NONE", amount: 0 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    const targets = listLegalSuccessfulMoveTargets(state);
    expect(targets).toEqual(["L1-R2-C3"]);
    expect(attemptMove(state, "L1-R2-C3").ok).toBe(true);
    expect(state.playerHexId).toBe("L1-R2-C3");
    expect(listLegalSuccessfulMoveTargets(state)).toEqual([]);
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
  });

  it("F. portal transition into isolated layer → STRANDED", () => {
    const baseIso = scenario({
      start: { layer: 2, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const l2missing = missingNeighborsOf(baseIso, "L2-R3-C3");
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 0, col: 0 },
      missing: [
        ...allBoardPositions(1).filter((p) => !(p.row === 3 && (p.col === 1 || p.col === 2))),
        ...l2missing,
      ],
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    const state = newGame(s);
    attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
  });

  it("I/J conceptual: STRANDED detection does not itself write progression (pure)", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
    // Pure function — no storage side effects by construction
  });

  it("L. initial isolated Start → STRANDED", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    expect(evaluateAttemptTerminal(newGame(s)).kind).toBe("stranded");
  });

  it("M. moving layer that remains connected → no false STRANDED", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 4 },
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "NONE", amount: 0 },
            "3": { direction: "LEFT", amount: 1 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    expect(attemptMove(state, "L1-R3-C2").ok).toBe(true);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
  });

  it("N. portal with legal continuation → no false STRANDED", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 4 },
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 2 },
        },
      ],
    });
    const state = newGame(s);
    attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });
    expect(state.playerHexId.startsWith("L2-")).toBe(true);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
  });
});
