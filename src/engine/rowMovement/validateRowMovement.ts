import type {
  LayerNumber,
  LayerRowMovementDefinition,
  RowMovementDirection,
  RowMovementInstruction,
  RowNumber,
  ScenarioMovementDefinition,
} from "./types";
import { LAYER_NUMBERS, MAX_AUTHORED_ROW_MOVEMENT_AMOUNT, ROW_NUMBERS } from "./types";

const VALID_DIRECTIONS = new Set<RowMovementDirection>(["LEFT", "RIGHT", "NONE"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateInstruction(
  instruction: unknown,
  layer: LayerNumber,
  row: RowNumber
): RowMovementInstruction {
  if (!isPlainObject(instruction)) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: instruction must be an object.`);
  }

  const keys = Object.keys(instruction);
  if (keys.some((k) => k !== "direction" && k !== "amount")) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: unexpected properties.`);
  }

  if (!("direction" in instruction)) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: missing direction.`);
  }
  if (!("amount" in instruction)) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: missing amount.`);
  }

  const direction = instruction.direction;
  const amount = instruction.amount;

  if (typeof direction !== "string" || !VALID_DIRECTIONS.has(direction as RowMovementDirection)) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: invalid direction ${String(direction)}.`);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: amount must be a finite integer.`);
  }
  if (amount < 0) {
    throw new Error(`Invalid movement for layer ${layer}, row ${row}: amount cannot be negative.`);
  }
  if (amount > MAX_AUTHORED_ROW_MOVEMENT_AMOUNT) {
    throw new Error(
      `Invalid movement for layer ${layer}, row ${row}: amount exceeds maximum ${MAX_AUTHORED_ROW_MOVEMENT_AMOUNT}.`
    );
  }

  const dir = direction as RowMovementDirection;
  if (dir === "NONE") {
    if (amount !== 0) {
      throw new Error(`Invalid movement for layer ${layer}, row ${row}: NONE requires amount 0.`);
    }
  } else if (amount <= 0) {
    throw new Error(
      `Invalid movement for layer ${layer}, row ${row}: direction ${dir} requires amount greater than 0.`
    );
  }

  return { direction: dir, amount };
}

function validateStructuredLayer(
  def: LayerRowMovementDefinition,
  layer: LayerNumber
): void {
  if (!isPlainObject(def.rows)) {
    throw new Error(`Invalid movement for layer ${layer}: rows must be an object.`);
  }

  const keys = Object.keys(def.rows);
  const expected = new Set(ROW_NUMBERS.map(String));
  for (const key of keys) {
    if (!expected.has(key)) {
      throw new Error(`Invalid movement for layer ${layer}: unknown row key "${key}".`);
    }
  }
  for (const row of ROW_NUMBERS) {
    const key = String(row);
    if (!(key in def.rows)) {
      throw new Error(`Invalid movement for layer ${layer}, row ${row}: missing row instruction.`);
    }
    validateInstruction(def.rows[key], layer, row);
  }
}

/**
 * Validates authored movement JSON (after legacy string presets are still allowed here —
 * they are migrated before structured validation when loading files).
 */
export function validateScenarioMovementDefinition(
  movement: ScenarioMovementDefinition,
  layers: number = 7
): void {
  for (const [key, value] of Object.entries(movement)) {
    const layer = Number(key);
    if (!Number.isFinite(layer) || layer < 1 || layer > layers) {
      throw new Error(`Invalid movement layer key: ${key}`);
    }

    if (value === "NONE") continue;

    if (typeof value === "string") {
      if (value !== "SEVEN_LEFT_SIX_RIGHT" && value !== "TOP3_RIGHT_BOTTOM4_LEFT") {
        throw new Error(`Invalid movement pattern on layer ${layer}: ${value}`);
      }
      continue;
    }

    validateStructuredLayer(value, layer as LayerNumber);
  }
}

export function layerHasMovement(
  rows: Record<RowNumber, RowMovementInstruction>
): boolean {
  return ROW_NUMBERS.some((row) => rows[row].direction !== "NONE");
}

export function shiftingLayersInMovement(
  normalized: Record<LayerNumber, { rows: Record<RowNumber, RowMovementInstruction> }>
): LayerNumber[] {
  const out: LayerNumber[] = [];
  for (const layer of LAYER_NUMBERS) {
    if (layerHasMovement(normalized[layer].rows)) out.push(layer);
  }
  return out;
}
