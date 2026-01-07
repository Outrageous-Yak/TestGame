import type { Scenario, MovementPattern } from "../engine/types";

function isMoving(p: MovementPattern) { return p !== "NONE"; }

export function generateAutoNotes(s: Scenario): string[] {
  const notes: string[] = [];

  const moving: number[] = [];
  const stat: number[] = [];

  for (let layer = 1; layer <= s.layers; layer++) {
    const pat = s.movement?.[String(layer)] ?? "NONE";
    (isMoving(pat) ? moving : stat).push(layer);
  }

  if (moving.length) notes.push(`Moving layers: ${moving.join(", ")}.`);
  if (stat.length) notes.push(`Static layers: ${stat.join(", ")}.`);

  if (s.revealOnEnterGuaranteedUp) notes.push(`On first entry to a layer, at least one ▲ (UP) is revealed.`);

  const missing = (s.missing ?? []).length;
  const blocked = (s.blocked ?? []).length;
  if (missing) notes.push(`Missing hexes: ${missing}.`);
  if (blocked) notes.push(`Blocked hexes: ${blocked}.`);

  const ups = (s.transitions ?? []).filter(t => t.type === "UP").length;
  const downs = (s.transitions ?? []).filter(t => t.type === "DOWN").length;
  if (ups || downs) notes.push(`Transitions: ${ups} ▲ UP, ${downs} ▼ DOWN.`);

  return notes;
}
