import type {
  LayerNumber,
  LayerRowMovementDefinition,
  NormalizedLayerMovement,
  RowMovementInstruction,
  RowNumber,
} from "./types";
import { ROW_NUMBERS, STATIONARY_ROW } from "./types";

/** Canonical row instructions equivalent to legacy `SEVEN_LEFT_SIX_RIGHT`. */
export const SEVEN_LEFT_SIX_RIGHT_ROWS: Record<RowNumber, RowMovementInstruction> = {
  0: { direction: "LEFT", amount: 1 },
  1: { direction: "RIGHT", amount: 1 },
  2: { direction: "LEFT", amount: 1 },
  3: { direction: "RIGHT", amount: 1 },
  4: { direction: "LEFT", amount: 1 },
  5: { direction: "RIGHT", amount: 1 },
  6: { direction: "LEFT", amount: 1 },
};

/** Canonical row instructions equivalent to legacy `TOP3_RIGHT_BOTTOM4_LEFT`. */
export const TOP3_RIGHT_BOTTOM4_LEFT_ROWS: Record<RowNumber, RowMovementInstruction> = {
  0: { direction: "RIGHT", amount: 1 },
  1: { direction: "RIGHT", amount: 1 },
  2: { direction: "RIGHT", amount: 1 },
  3: { direction: "LEFT", amount: 1 },
  4: { direction: "LEFT", amount: 1 },
  5: { direction: "LEFT", amount: 1 },
  6: { direction: "LEFT", amount: 1 },
};

function cloneRows(
  rows: Record<RowNumber, RowMovementInstruction>
): Record<RowNumber, RowMovementInstruction> {
  const out = {} as Record<RowNumber, RowMovementInstruction>;
  for (const row of ROW_NUMBERS) {
    out[row] = { ...rows[row] };
  }
  return out;
}

function stationaryLayer(): NormalizedLayerMovement {
  const rows = {} as Record<RowNumber, RowMovementInstruction>;
  for (const row of ROW_NUMBERS) {
    rows[row] = { ...STATIONARY_ROW };
  }
  return { rows };
}

/**
 * Migrates a single layer's authored movement (legacy preset or structured) to normalized form.
 * @deprecated Use only at load/validation time — not in gameplay.
 */
export function normalizeLayerMovementDefinition(
  source: unknown,
  layer: LayerNumber
): NormalizedLayerMovement {
  if (source === "NONE" || source == null || source === undefined) {
    return stationaryLayer();
  }

  if (typeof source === "string") {
    if (source === "SEVEN_LEFT_SIX_RIGHT") {
      return { rows: cloneRows(SEVEN_LEFT_SIX_RIGHT_ROWS) };
    }
    if (source === "TOP3_RIGHT_BOTTOM4_LEFT") {
      return { rows: cloneRows(TOP3_RIGHT_BOTTOM4_LEFT_ROWS) };
    }
    throw new Error(
      `Invalid movement for layer ${layer}: unknown legacy preset "${source}".`
    );
  }

  if (typeof source === "object" && source !== null && "rows" in source) {
    const def = source as LayerRowMovementDefinition;
    const rows = {} as Record<RowNumber, RowMovementInstruction>;
    for (const row of ROW_NUMBERS) {
      const key = String(row);
      const raw = def.rows[key];
      if (!raw) {
        throw new Error(`Invalid movement for layer ${layer}, row ${row}: missing row instruction.`);
      }
      rows[row] = { direction: raw.direction, amount: raw.amount };
    }
    return { rows };
  }

  throw new Error(`Invalid movement for layer ${layer}: unrecognized definition.`);
}
