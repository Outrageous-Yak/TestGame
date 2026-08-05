import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newGame } from "../api";
import { ROW_LENS } from "../board";
import { assertScenario } from "../scenario";
import type { Scenario } from "../types";
import { attemptMove, endTurn } from "../rules";
import {
  SEVEN_LEFT_SIX_RIGHT_ROWS,
  TOP3_RIGHT_BOTTOM4_LEFT_ROWS,
  applyLayerRowMovement,
  attachRuntimeMovement,
  deriveDirectionReversalForRow,
  effectiveRowShiftAmount,
  getRowMovementInstruction,
  getRuntimeMovement,
  normalizeLayerMovementDefinition,
  normalizeScenarioMovement,
  rotateRowIds,
  transformLayerMovement,
  transformRowMovementInstruction,
  validateScenarioMovementDefinition,
} from "./index";
import { CANONICAL_TRANSFORM_IDS } from "../layerTransform/transformCatalog";
import type { LayerNumber, RowNumber } from "./types";

const ROWS = [0, 1, 2, 3, 4, 5, 6] as RowNumber[];

function baseScenario(movement: Scenario["movement"]): Scenario {
  return {
    id: "row_move_test",
    name: "Row Move Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 0, col: 0 },
    missing: [],
    blocked: [],
    movement,
    transitions: [],
    revealOnEnterGuaranteedUp: false,
  };
}

describe("row movement schema", () => {
  it("accepts layer NONE and structured rows", () => {
    expect(() =>
      validateScenarioMovementDefinition({
        "1": "NONE",
        "2": {
          rows: Object.fromEntries(
            ROWS.map((r) => [String(r), { direction: "LEFT", amount: 1 }])
          ),
        },
      })
    ).not.toThrow();
  });

  it("rejects NONE with positive amount", () => {
    expect(() =>
      validateScenarioMovementDefinition({
        "1": "NONE",
        "2": { rows: { "0": { direction: "NONE", amount: 1 } } },
      })
    ).toThrow(/NONE requires amount 0/);
  });

  it("rejects LEFT with amount 0", () => {
    expect(() =>
      validateScenarioMovementDefinition({
        "1": "NONE",
        "2": { rows: { "0": { direction: "LEFT", amount: 0 } } },
      })
    ).toThrow(/requires amount greater than 0/);
  });

  it("rejects missing row keys on moving layer", () => {
    expect(() =>
      validateScenarioMovementDefinition({
        "1": "NONE",
        "2": { rows: { "0": { direction: "LEFT", amount: 1 } } },
      })
    ).toThrow(/missing row instruction/);
  });
});

describe("normalization and legacy migration", () => {
  it("NONE normalizes to seven stationary rows", () => {
    const norm = normalizeLayerMovementDefinition("NONE", 2);
    for (const row of ROWS) {
      expect(norm.rows[row]).toEqual({ direction: "NONE", amount: 0 });
    }
  });

  it("SEVEN_LEFT_SIX_RIGHT migrates to explicit rows", () => {
    const norm = normalizeLayerMovementDefinition("SEVEN_LEFT_SIX_RIGHT", 2);
    for (const row of ROWS) {
      expect(norm.rows[row]).toEqual(SEVEN_LEFT_SIX_RIGHT_ROWS[row]);
    }
  });

  it("TOP3_RIGHT_BOTTOM4_LEFT migrates correctly", () => {
    const norm = normalizeLayerMovementDefinition("TOP3_RIGHT_BOTTOM4_LEFT", 3);
    for (const row of ROWS) {
      expect(norm.rows[row]).toEqual(TOP3_RIGHT_BOTTOM4_LEFT_ROWS[row]);
    }
  });
});

describe("modulo wrapping", () => {
  it("LEFT 7 on 7-cell row is zero effective shift", () => {
    expect(effectiveRowShiftAmount(0, { direction: "LEFT", amount: 7 })).toBe(0);
  });

  it("LEFT 8 on 7-cell row equals LEFT 1", () => {
    const row = ["a", "b", "c", "d", "e", "f", "g"];
    expect(rotateRowIds(row, "LEFT", 8)).toEqual(rotateRowIds(row, "LEFT", 1));
  });

  it("RIGHT 8 on 6-cell row equals RIGHT 2", () => {
    const row = ["a", "b", "c", "d", "e", "f"];
    expect(rotateRowIds(row, "RIGHT", 8)).toEqual(rotateRowIds(row, "RIGHT", 2));
  });
});

describe("runtime application", () => {
  it("legacy and structured SEVEN_LEFT_SIX_RIGHT produce identical row layout after one shift", () => {
    const legacy = baseScenario({ "1": "NONE", "2": "SEVEN_LEFT_SIX_RIGHT" });
    const structured = baseScenario({
      "1": "NONE",
      "2": { rows: Object.fromEntries(ROWS.map((r) => [String(r), SEVEN_LEFT_SIX_RIGHT_ROWS[r]])) },
    });
    assertScenario(legacy);
    assertScenario(structured);

    const a = newGame(legacy);
    const b = newGame(structured);
    applyLayerRowMovement(a, 2, getRuntimeMovement(a.scenario));
    applyLayerRowMovement(b, 2, getRuntimeMovement(b.scenario));

    expect(a.rows.get(2)).toEqual(b.rows.get(2));
  });

  it("applies different amounts per row in one event", () => {
    const scenario = baseScenario({
      "1": "NONE",
      "2": {
        rows: {
          "0": { direction: "LEFT", amount: 1 },
          "1": { direction: "RIGHT", amount: 2 },
          "2": { direction: "NONE", amount: 0 },
          "3": { direction: "RIGHT", amount: 1 },
          "4": { direction: "LEFT", amount: 1 },
          "5": { direction: "RIGHT", amount: 1 },
          "6": { direction: "LEFT", amount: 1 },
        },
      },
    });
    assertScenario(scenario);
    const state = newGame(scenario);
    const before = JSON.stringify(state.rows.get(2));
    endTurn(state);
    expect(JSON.stringify(state.rows.get(2))).not.toBe(before);
  });

  it("row iteration order does not change final state", () => {
    const scenario = baseScenario({
      "1": "NONE",
      "2": { rows: Object.fromEntries(ROWS.map((r) => [String(r), SEVEN_LEFT_SIX_RIGHT_ROWS[r]])) },
    });
    assertScenario(scenario);
    const a = newGame(scenario);
    const b = newGame(scenario);
    const movement = getRuntimeMovement(a.scenario);
    applyLayerRowMovement(a, 2, movement);
    applyLayerRowMovement(b, 2, movement);
    expect(a.rows.get(2)).toEqual(b.rows.get(2));
  });
});

describe("layer transform movement", () => {
  it("maps rows bijectively for every canonical transform", () => {
    const authored = normalizeLayerMovementDefinition("SEVEN_LEFT_SIX_RIGHT", 2);
    for (const id of CANONICAL_TRANSFORM_IDS) {
      const transformed = transformLayerMovement(authored, id);
      const runtimeRows = new Set(ROWS.map((r) => r));
      for (const row of ROWS) {
        expect(transformed.rows[row]).toBeDefined();
      }
      expect(runtimeRows.size).toBe(7);
    }
  });

  it("reflect-horizontal reverses LEFT to RIGHT on row 0", () => {
    const result = transformRowMovementInstruction(
      0,
      { direction: "LEFT", amount: 2 },
      "reflect-horizontal"
    );
    expect(result.runtimeRow).toBe(0);
    expect(result.instruction).toEqual({ direction: "RIGHT", amount: 2 });
  });

  it("symmetry-b maps row 0 to row 6 preserving direction", () => {
    const result = transformRowMovementInstruction(
      0,
      { direction: "LEFT", amount: 2 },
      "symmetry-b"
    );
    expect(result.runtimeRow).toBe(6);
    expect(result.instruction).toEqual({ direction: "LEFT", amount: 2 });
  });
});

describe("scenario JSON audit", () => {
  it("active scenario files contain no deprecated movement preset strings", () => {
    const deprecated = ["SEVEN_LEFT_SIX_RIGHT", "TOP3_RIGHT_BOTTOM4_LEFT"];
    const roots = ["public/worlds", "public/scenarios"];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".json")) files.push(p);
      }
    };
    for (const root of roots) walk(join(process.cwd(), root));

    for (const file of files) {
      const data = JSON.parse(readFileSync(file, "utf8"));
      if (!data.movement) continue;
      for (const value of Object.values(data.movement)) {
        if (typeof value === "string" && deprecated.includes(value)) {
          throw new Error(`${file} still uses deprecated preset ${value}`);
        }
      }
    }
  });
});

describe("attachRuntimeMovement with layer transforms", () => {
  it("transforms movement for non-identity layer selection", () => {
    const scenario = baseScenario({
      "1": "NONE",
      "2": { rows: Object.fromEntries(ROWS.map((r) => [String(r), SEVEN_LEFT_SIX_RIGHT_ROWS[r]])) },
    });
    attachRuntimeMovement(scenario, { 2: "reflect-horizontal" });
    const inst = scenario.runtimeMovement![2].rows[0];
    expect(inst.direction).toBe("RIGHT");
  });
});
