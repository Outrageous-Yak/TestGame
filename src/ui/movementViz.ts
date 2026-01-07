import type { MovementPattern } from "../engine/types";

export function getPatternForLayer(movement: Record<string, MovementPattern>, layer: number): MovementPattern {
  return movement[String(layer)] ?? "NONE";
}

export function patternLabel(p: MovementPattern): string {
  if (p === "NONE") return "Static";
  if (p === "SEVEN_LEFT_SIX_RIGHT") return "7-left / 6-right";
  if (p === "TOP3_RIGHT_BOTTOM4_LEFT") return "Top3-right / Bottom4-left";
  return p;
}
