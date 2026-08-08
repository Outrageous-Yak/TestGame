import type { PlannerTrack, TrackFeature } from "../types";
import { ROW_LENS, posId } from "../../../engine/board";
import { validateStructuralCoords } from "../serialization/scenarioBridge";
import type { PlannerWorld, PlannerScenario } from "../types";
import { duplicateSlotKeys, featureOccupancyPos, posSlotKey } from "../features/featureOccupancy";
import {
  CARD_RUNTIME_SUPPORT,
  HIDDEN_CARD_RUNTIME,
  HIDDEN_PORTAL_RUNTIME,
} from "../features/runtimeSupport";
import { validateVisibilityOverlay } from "../visibility/visibilityValidation";
import { visibilityStateLabel } from "../visibility/visibilityRuntimeMapping";
import { featureConfigLabel, featureListLabel, posLabel } from "../features/featureLabels";

/** GREEN = structurally valid, AMBER = warning, RED = must fix */
export type AuditSeverity = "green" | "amber" | "red";

/** Row level — maps to severity for legacy consumers */
export type AuditLevel = "approved" | "warning" | "error";

export type AuditCategory =
  | "board"
  | "start_goal"
  | "portals"
  | "cards"
  | "encounters"
  | "runtime"
  | "visibility";

export interface AuditItem {
  featureId: string;
  featureLabel: string;
  layer: number;
  position: string;
  configuration: string;
  level: AuditLevel;
  severity: AuditSeverity;
  category: AuditCategory;
  message: string;
  notes: string;
}

export type TrackStructuralStatus = "green" | "amber" | "red";

function levelToSeverity(level: AuditLevel): AuditSeverity {
  if (level === "approved") return "green";
  if (level === "warning") return "amber";
  return "red";
}

function isMissing(track: PlannerTrack, p: { layer: number; row: number; col: number }): boolean {
  const layer = track.layers.find((l) => l.layer === p.layer);
  if (!layer) return true;
  return layer.missing.some((m) => m.row === p.row && m.col === p.col);
}

function inBounds(p: { layer: number; row: number; col: number }): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  return p.col >= 0 && p.col < ROW_LENS[p.row];
}

function mk(
  partial: Omit<AuditItem, "severity" | "level"> & { level: AuditLevel },
): AuditItem {
  return { ...partial, severity: levelToSeverity(partial.level) };
}

export function auditTrack(
  track: PlannerTrack,
  world?: PlannerWorld,
  scenario?: PlannerScenario,
): AuditItem[] {
  const items: AuditItem[] = [];
  const structural = validateStructuralCoords(track);
  const allowedVillains = new Set(
    scenario?.allowedVillains?.length ? scenario.allowedVillains : world?.villainPool ?? [],
  );
  const allowedEncounters = new Set(
    scenario?.allowedEncounters?.length ? scenario.allowedEncounters : world?.encounterPool ?? [],
  );
  const slotDupes = duplicateSlotKeys(track);

  const starts = track.features.filter((f) => f.kind === "start");
  const goals = track.features.filter((f) => f.kind === "goal");

  for (const err of structural) {
    const category: AuditCategory =
      err.includes("Start") || err.includes("Goal") ? "start_goal" : "board";
    items.push(
      mk({
        featureId: "structure",
        featureLabel: "Structure",
        layer: 0,
        position: "—",
        configuration: err,
        level: "error",
        category,
        message: err,
        notes: "",
      }),
    );
  }

  if (starts.length === 1 && goals.length === 1) {
    const s = starts[0].position;
    const g = goals[0].position;
    if (posId(s) === posId(g)) {
      items.push(
        mk({
          featureId: "start_goal_same",
          featureLabel: "Start / Goal",
          layer: s.layer,
          position: posLabel(s),
          configuration: "Same hex",
          level: "error",
          category: "start_goal",
          message: "Start and Goal occupy the same hex",
          notes: "",
        }),
      );
    }
  }

  for (const f of track.features) {
    items.push(...auditFeature(track, f, slotDupes, allowedVillains, allowedEncounters));
  }

  items.push(...auditVisibility(track));

  return items;
}

function auditVisibility(track: PlannerTrack): AuditItem[] {
  const items: AuditItem[] = [];
  const overlays = track.visibility.length ? track.visibility : [];

  if (!overlays.length) {
    items.push(
      mk({
        featureId: "visibility_default",
        featureLabel: "Visibility",
        layer: 0,
        position: "—",
        configuration: "REGULAR",
        level: "approved",
        category: "visibility",
        message: "Regular visibility — no special overlay",
        notes: "",
      }),
    );
    return items;
  }

  overlays.forEach((overlay, index) => {
    const checks = validateVisibilityOverlay(track, overlay, index, overlays.length);
    const primaryLevel: AuditLevel =
      checks.some((c) => c.severity === "red")
        ? "error"
        : checks.some((c) => c.severity === "amber")
          ? "warning"
          : "approved";

    items.push(
      mk({
        featureId: overlay.id,
        featureLabel: `Visibility — ${visibilityStateLabel(overlay.state)}`,
        layer: 0,
        position: overlay.coverage === "CUSTOM" ? `${overlay.positions.length} mask hexes` : "Full board",
        configuration: overlaySummaryForAudit(overlay),
        level: primaryLevel,
        category: "visibility",
        message:
          checks.find((c) => c.severity === "red")?.message ??
          checks.find((c) => c.severity === "amber")?.message ??
          "Visibility configuration structurally valid",
        notes: checks.map((c) => c.notes).filter(Boolean).join("; "),
      }),
    );

    for (const check of checks) {
      if (check.severity === "green") continue;
      const level: AuditLevel = check.severity === "red" ? "error" : "warning";
      items.push(
        mk({
          featureId: `${overlay.id}_${check.message.slice(0, 12)}`,
          featureLabel: visibilityStateLabel(overlay.state),
          layer: 0,
          position: "—",
          configuration: overlaySummaryForAudit(overlay),
          level,
          category: check.severity === "red" ? "visibility" : "runtime",
          message: check.message,
          notes: check.notes ?? "",
        }),
      );
    }
  });

  return items;
}

function overlaySummaryForAudit(overlay: import("../types").VisibilityOverlay): string {
  const parts = [overlay.coverage];
  if (overlay.lanternRadius != null) parts.push(`radius ${overlay.lanternRadius}`);
  if (overlay.memoryRevealSec != null) parts.push(`${overlay.memoryRevealSec}s`);
  return parts.join(" · ");
}

function auditFeature(
  track: PlannerTrack,
  f: TrackFeature,
  slotDupes: Map<string, TrackFeature[]>,
  allowedVillains: Set<string>,
  allowedEncounters: Set<string>,
): AuditItem[] {
  const items: AuditItem[] = [];
  const base = featureAuditItem(f);
  const slot = featureOccupancyPos(f);
  const dupeCount = slot ? (slotDupes.get(posSlotKey(slot))?.length ?? 0) : 0;

  if (dupeCount > 1) {
    items.push(
      mk({
        ...base,
        level: "error",
        message: `Duplicate hex occupancy (${dupeCount} features on this hex)`,
        notes: base.notes,
      }),
    );
  } else {
    items.push(base);
  }

  if (slot && isMissing(track, slot)) {
    items.push(
      mk({
        ...base,
        level: "error",
        category: base.category,
        message: `${base.featureLabel} is on a missing hex`,
        notes: "Restore hex in Board view or move feature",
      }),
    );
  }

  if (f.kind === "portal") {
    items.push(...auditPortal(track, f, base));
  }

  if (f.kind === "card") {
    items.push(...auditCard(f, base, allowedVillains, allowedEncounters));
  }

  if (f.kind === "villain") {
    if (f.mode === "specific" && f.villainKey && !allowedVillains.has(f.villainKey)) {
      items.push(
        mk({
          ...base,
          level: "error",
          category: "encounters",
          message: `Villain ${f.villainKey} not in scenario/world pool`,
          notes: "",
        }),
      );
    }
  }

  if (f.kind === "encounter") {
    if (f.mode === "specific" && f.encounterId && !allowedEncounters.has(f.encounterId)) {
      items.push(
        mk({
          ...base,
          level: "error",
          category: "encounters",
          message: `Encounter ${f.encounterId} not in scenario/world pool`,
          notes: "",
        }),
      );
    }
  }

  return items;
}

function auditPortal(
  track: PlannerTrack,
  f: Extract<TrackFeature, { kind: "portal" }>,
  base: AuditItem,
): AuditItem[] {
  const items: AuditItem[] = [];
  const dest = f.destination;
  const src = f.source;

  if (!inBounds(dest)) {
    items.push(
      mk({
        ...base,
        level: "error",
        category: "portals",
        message: "Portal destination out of bounds",
        notes: posLabel(dest),
      }),
    );
  } else if (isMissing(track, dest)) {
    items.push(
      mk({
        ...base,
        level: "error",
        category: "portals",
        message: "Portal destination is on a missing hex",
        notes: posLabel(dest),
      }),
    );
  }

  if (posId(src) === posId(dest)) {
    items.push(
      mk({
        ...base,
        level: "warning",
        category: "portals",
        message: "Portal source and destination are the same hex",
        notes: "",
      }),
    );
  }

  if (f.direction === "UP" && dest.layer <= src.layer) {
    items.push(
      mk({
        ...base,
        level: "warning",
        category: "portals",
        message: "UP portal destination layer should be above source",
        notes: `${posLabel(src)} → ${posLabel(dest)}`,
      }),
    );
  }

  if (f.direction === "DOWN" && dest.layer >= src.layer) {
    items.push(
      mk({
        ...base,
        level: "warning",
        category: "portals",
        message: "DOWN portal destination layer should be below source",
        notes: `${posLabel(src)} → ${posLabel(dest)}`,
      }),
    );
  }

  if (f.hidden) {
    items.push(
      mk({
        ...base,
        level: HIDDEN_PORTAL_RUNTIME.runtime ? "approved" : "warning",
        category: "runtime",
        message: HIDDEN_PORTAL_RUNTIME.runtime
          ? "Hidden portal — concealed in play"
          : "Hidden portal — authoring supported, runtime deferred",
        notes: "HIDDEN",
      }),
    );
  }

  return items;
}

function auditCard(
  f: Extract<TrackFeature, { kind: "card" }>,
  base: AuditItem,
  allowedVillains: Set<string>,
  allowedEncounters: Set<string>,
): AuditItem[] {
  const items: AuditItem[] = [];
  const support = CARD_RUNTIME_SUPPORT[f.cardType];

  if (f.cardType === "HIDDEN" && !f.resolvedType) {
    items.push(
      mk({
        ...base,
        level: "error",
        category: "cards",
        message: "Predetermined ? card missing hidden result",
        notes: "Choose RED/BLUE/GREEN/BLACK",
      }),
    );
  }

  if (f.cardType === "RANDOM") {
    items.push(
      mk({
        ...base,
        level: support.runtime ? "approved" : "warning",
        category: "runtime",
        message: support.runtime
          ? "? RANDOM resolves at play time"
          : "? RANDOM — authoring supported, runtime resolution deferred",
        notes: "RANDOM",
      }),
    );
  }

  if (f.cardType === "RED") {
    if (f.contentMode === "specific") {
      if (f.villainKey && !allowedVillains.has(f.villainKey)) {
        items.push(
          mk({
            ...base,
            level: "error",
            category: "encounters",
            message: `Red card villain ${f.villainKey} not in pool`,
            notes: "",
          }),
        );
      }
      if (f.encounterId && !allowedEncounters.has(f.encounterId)) {
        items.push(
          mk({
            ...base,
            level: "error",
            category: "encounters",
            message: `Red card encounter ${f.encounterId} not in pool`,
            notes: "",
          }),
        );
      }
    }
  }

  if (f.cardType === "BLUE" || f.cardType === "GREEN" || f.cardType === "BLACK") {
    if (!support.runtime) {
      items.push(
        mk({
          ...base,
          level: "warning",
          category: "runtime",
          message: `${f.cardType} card — metadata only, no gameplay effect yet`,
          notes: support.note ?? "",
        }),
      );
    }
  }

  if (f.hidden) {
    items.push(
      mk({
        ...base,
        level: HIDDEN_CARD_RUNTIME.runtime ? "approved" : "warning",
        category: "runtime",
        message: HIDDEN_CARD_RUNTIME.runtime
          ? "Hidden card metadata"
          : "Hidden card — authoring supported, runtime concealment deferred",
        notes: "HIDDEN",
      }),
    );
  }

  return items;
}

function featureAuditItem(f: TrackFeature): AuditItem {
  const pos =
    f.kind === "portal"
      ? f.source
      : "position" in f
        ? f.position
        : { layer: 0, row: 0, col: 0 };

  const category: AuditCategory =
    f.kind === "start" || f.kind === "goal"
      ? "start_goal"
      : f.kind === "portal"
        ? "portals"
        : f.kind === "card"
          ? "cards"
          : f.kind === "encounter" || f.kind === "villain"
            ? "encounters"
            : "board";

  return mk({
    featureId: f.id,
    featureLabel: featureListLabel(f),
    layer: pos.layer,
    position: posLabel(pos),
    configuration: featureConfigLabel(f),
    level: "approved",
    category,
    message: "Valid",
    notes:
      f.kind === "card" && f.hidden
        ? "HIDDEN"
        : f.kind === "portal" && f.hidden
          ? "HIDDEN"
          : "",
  });
}

export function auditSummary(items: AuditItem[]): {
  approved: number;
  warning: number;
  error: number;
  green: number;
  amber: number;
  red: number;
} {
  let approved = 0;
  let warning = 0;
  let error = 0;
  for (const i of items) {
    if (i.level === "approved") approved += 1;
    else if (i.level === "warning") warning += 1;
    else error += 1;
  }
  return { approved, warning, error, green: approved, amber: warning, red: error };
}

export function trackStructuralStatus(items: AuditItem[]): TrackStructuralStatus {
  if (items.some((i) => i.severity === "red")) return "red";
  if (items.some((i) => i.severity === "amber")) return "amber";
  return "green";
}
