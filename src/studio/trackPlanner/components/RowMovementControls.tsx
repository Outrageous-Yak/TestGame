import React from "react";
import type { RowMovementAuthored } from "../types";
import { normalizeRowMovement } from "../state/authoringState";

type RowMovementControlsProps = {
  layer: number;
  rowMovement: Record<string, RowMovementAuthored>;
  onChange: (row: number, inst: RowMovementAuthored) => void;
};

export function RowMovementControls({ layer, rowMovement, onChange }: RowMovementControlsProps) {
  const update = (row: number, patch: Partial<RowMovementAuthored>) => {
    const prev = rowMovement[String(row)] ?? { direction: "NONE", amount: 0 };
    let next: RowMovementAuthored = { ...prev, ...patch };
    if (patch.direction && patch.direction !== "NONE" && prev.direction === "NONE") {
      next.amount = prev.amount > 0 ? prev.amount : 1;
    }
    onChange(row, normalizeRowMovement(next));
  };

  return (
    <div className="tp-rowMovementPanel">
      <div className="tp-rowMovementTitle">Layer {layer} row movement</div>
      {Array.from({ length: 7 }, (_, row) => {
        const inst = rowMovement[String(row)] ?? { direction: "NONE", amount: 0 };
        return (
          <div key={row} className="tp-rowControl">
            <span className="tp-rowLabel">Row {row}</span>
            <button
              type="button"
              className="btn tp-miniBtn"
              onClick={() => update(row, { amount: Math.max(0, inst.amount - 1) })}
              aria-label={`Decrease row ${row} amount`}
            >
              −
            </button>
            <select
              className="tp-select"
              value={inst.direction}
              onChange={(e) =>
                update(row, {
                  direction: e.target.value as RowMovementAuthored["direction"],
                })
              }
            >
              <option value="NONE">NONE</option>
              <option value="LEFT">LEFT</option>
              <option value="RIGHT">RIGHT</option>
            </select>
            <button
              type="button"
              className="btn tp-miniBtn"
              onClick={() => update(row, { amount: inst.amount + 1 })}
              aria-label={`Increase row ${row} amount`}
            >
              +
            </button>
            <span className="tp-rowAmt">{inst.amount}</span>
          </div>
        );
      })}
    </div>
  );
}
