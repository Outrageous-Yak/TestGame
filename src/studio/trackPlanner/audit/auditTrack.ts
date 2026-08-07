import type { PlannerTrack, TrackFeature } from "../types";
import { validateStructuralCoords } from "../serialization/scenarioBridge";
import type { PlannerWorld, PlannerScenario } from "../types";

export type AuditLevel = "approved" | "warning" | "error";

export interface AuditItem {
  featureId: string;
  featureLabel: string;
  layer: number;
  position: string;
  configuration: string;
  level: AuditLevel;
  message: string;
  notes: string;
}

function posLabel(p: { layer: number; row: number; col: number }): string {
  return `L${p.layer} R${p.row} C${p.col}`;
}

export function auditTrack(
  track: PlannerTrack,
  world?: PlannerWorld,
  scenario?: PlannerScenario,
): AuditItem[] {
  const items: AuditItem[] = [];
  const structural = validateStructuralCoords(track);

  for (const err of structural) {
    items.push({
      featureId: "structure",
      featureLabel: "Structure",
      layer: 0,
      position: "—",
      configuration: err,
      level: "error",
      message: err,
      notes: "",
    });
  }

  const allowedVillains = new Set(
    scenario?.allowedVillains?.length
      ? scenario.allowedVillains
      : world?.villainPool ?? [],
  );

  for (const f of track.features) {
    const base = featureAuditItem(f);
    items.push(base);

    if (f.kind === "card") {
      if (f.cardType === "HIDDEN" && !f.resolvedType) {
        items.push({
          ...base,
          level: "error",
          message: "Hidden card missing resolvedType",
          notes: "Assign underlying RED/BLUE/GREEN/BLACK",
        });
      }
      if (f.cardType === "RANDOM") {
        items.push({
          ...base,
          level: "warning",
          message: "Random mystery card — runtime resolves at play time",
          notes: "Solver treats as non-deterministic",
        });
      }
      if (f.cardType === "BLACK") {
        items.push({
          ...base,
          level: "warning",
          message: "BLACK card runtime effect not fully implemented",
          notes: "",
        });
      }
    }

    if (f.kind === "portal" && f.hidden) {
      items.push({
        ...base,
        level: "approved",
        message: "Hidden portal — visible in editor, concealed in play",
        notes: "HIDDEN",
      });
    }

    if (f.kind === "villain" && f.mode === "specific" && f.villainKey && !allowedVillains.has(f.villainKey)) {
      items.push({
        ...base,
        level: "error",
        message: `Villain ${f.villainKey} not in scenario/world pool`,
        notes: "",
      });
    }
  }

  return items;
}

function featureAuditItem(f: TrackFeature): AuditItem {
  switch (f.kind) {
    case "start":
      return {
        featureId: f.id,
        featureLabel: "Start",
        layer: f.position.layer,
        position: posLabel(f.position),
        configuration: "Player spawn",
        level: "approved",
        message: "Valid",
        notes: "",
      };
    case "goal":
      return {
        featureId: f.id,
        featureLabel: "Goal",
        layer: f.position.layer,
        position: posLabel(f.position),
        configuration: "Win condition",
        level: "approved",
        message: "Valid",
        notes: "",
      };
    case "portal":
      return {
        featureId: f.id,
        featureLabel: `Portal ${f.portalId}`,
        layer: f.source.layer,
        position: posLabel(f.source),
        configuration: `${f.direction} → ${posLabel(f.destination)}`,
        level: "approved",
        message: "Valid",
        notes: f.hidden ? "HIDDEN" : "",
      };
    case "card":
      return {
        featureId: f.id,
        featureLabel: `${f.cardType} Card`,
        layer: f.position.layer,
        position: posLabel(f.position),
        configuration:
          f.cardType === "HIDDEN"
            ? `Underlying: ${f.resolvedType ?? "?"}`
            : f.cardType,
        level: "approved",
        message: "Valid",
        notes: f.hidden ? "HIDDEN" : "",
      };
    case "encounter":
      return {
        featureId: f.id,
        featureLabel: "Encounter",
        layer: f.position.layer,
        position: posLabel(f.position),
        configuration: f.mode === "random" ? "Random from pool" : f.encounterId ?? "—",
        level: "approved",
        message: "Valid",
        notes: "",
      };
    case "villain":
      return {
        featureId: f.id,
        featureLabel: "Villain",
        layer: f.position.layer,
        position: posLabel(f.position),
        configuration:
          f.mode === "random" ? "Random villain" : f.villainKey ?? "—",
        level: "approved",
        message: "Valid",
        notes: "",
      };
    default:
      return {
        featureId: "unknown",
        featureLabel: "Unknown",
        layer: 0,
        position: "—",
        configuration: "",
        level: "error",
        message: "Unknown feature",
        notes: "",
      };
  }
}

export function auditSummary(items: AuditItem[]): {
  approved: number;
  warning: number;
  error: number;
} {
  let approved = 0;
  let warning = 0;
  let error = 0;
  for (const i of items) {
    if (i.level === "approved") approved += 1;
    else if (i.level === "warning") warning += 1;
    else error += 1;
  }
  return { approved, warning, error };
}
