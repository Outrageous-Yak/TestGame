import type { TrackFeature } from "../types";

export function posLabel(p: { layer: number; row: number; col: number }): string {
  return `L${p.layer} R${p.row} C${p.col}`;
}

export function featureListLabel(f: TrackFeature): string {
  switch (f.kind) {
    case "start":
      return "START";
    case "goal":
      return "GOAL";
    case "portal":
      return `PORTAL ${f.direction}`;
    case "card":
      if (f.cardType === "RANDOM") return "? RANDOM";
      if (f.cardType === "HIDDEN") return `? FIXED → ${f.resolvedType ?? "?"}`;
      return `${f.cardType} CARD`;
    case "encounter":
      return "ENCOUNTER";
    case "villain":
      return "VILLAIN";
    default:
      return "FEATURE";
  }
}

export function featureConfigLabel(f: TrackFeature): string {
  switch (f.kind) {
    case "start":
      return "Player start";
    case "goal":
      return "Win condition";
    case "portal":
      return `${f.direction} → ${posLabel(f.destination)}`;
    case "card":
      if (f.cardType === "RED") {
        if (f.contentMode === "random") return "Random encounter";
        if (f.villainKey) return `Villain: ${f.villainKey}`;
        if (f.encounterId) return `Encounter: ${f.encounterId}`;
        return "Specific encounter";
      }
      if (f.cardType === "RANDOM") return "Random RED/BLUE/GREEN/BLACK";
      if (f.cardType === "HIDDEN") return `Hidden result: ${f.resolvedType ?? "?"}`;
      return f.cardType;
    case "encounter":
      return f.mode === "random" ? "Random from pool" : f.encounterId ?? "—";
    case "villain":
      return f.mode === "random" ? "Random villain" : f.villainKey ?? "—";
    default:
      return "";
  }
}
