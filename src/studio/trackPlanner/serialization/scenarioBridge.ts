import type { Scenario, Pos, Transition } from "../../../engine/types";
import type { VillainsSpec } from "../../../engine/types";
import { ROW_LENS } from "../../../engine/board";
import type { ScenarioMovementDefinition } from "../../../engine/rowMovement/types";
import { assertScenario } from "../../../engine/scenario";
import type { PlannerTrack, TrackFeature, CardFeature } from "../types";
import { CARD_COLOR_TO_RUNTIME } from "../types";
import type { CardTrigger } from "../../../ui/types";

function isMissing(track: PlannerTrack, p: Pos): boolean {
  const layer = track.layers.find((l) => l.layer === p.layer);
  if (!layer) return true;
  return layer.missing.some((m) => m.row === p.row && m.col === p.col);
}

function buildMovement(track: PlannerTrack): ScenarioMovementDefinition {
  const movement: ScenarioMovementDefinition = {};
  for (const layer of track.layers) {
    const rows: Record<string, { direction: "LEFT" | "RIGHT" | "NONE"; amount: number }> = {};
    let any = false;
    for (const [rowKey, inst] of Object.entries(layer.rowMovement)) {
      rows[rowKey] = { direction: inst.direction, amount: inst.amount };
      if (inst.direction !== "NONE" && inst.amount > 0) any = true;
    }
    movement[String(layer.layer)] = any ? { rows } : "NONE";
  }
  return movement;
}

function cardToRuntimeTrigger(card: CardFeature): CardTrigger | null {
  if (card.cardType === "RANDOM") return null;
  const resolved =
    card.cardType === "HIDDEN" ? card.resolvedType : card.cardType;
  if (!resolved || resolved === "RANDOM" || resolved === "HIDDEN") return null;
  const runtime = CARD_COLOR_TO_RUNTIME[resolved];
  return {
    card: runtime,
    layer: card.position.layer,
    row: card.position.row,
    col: card.position.col,
  };
}

function buildVillains(track: PlannerTrack): VillainsSpec | undefined {
  const triggers: VillainsSpec["triggers"] = [];

  for (const f of track.features) {
    if (f.kind === "villain") {
      triggers.push({
        id:
          f.mode === "specific" && f.villainKey
            ? f.villainKey
            : f.villainKey ?? `villain_${f.id}`,
        layer: f.position.layer,
        row: f.position.row,
        col: f.position.col,
      });
    } else if (f.kind === "encounter") {
      triggers.push({
        id: f.mode === "specific" && f.encounterId ? f.encounterId : "bad1",
        layer: f.position.layer,
        row: f.position.row,
        col: f.position.col,
      });
    }
  }

  if (triggers.length === 0) return undefined;
  return { requiredRoll: 6, triggers };
}

export type RuntimeScenarioDocument = Scenario & {
  cardTriggers?: CardTrigger[];
  /** Planner metadata — ignored by game loader. */
  _plannerMeta?: {
    visibilityOverlays: PlannerTrack["visibility"];
    featureIds: string[];
  };
};

export function authoredTrackToScenario(track: PlannerTrack): RuntimeScenarioDocument {
  const start = track.features.find((f) => f.kind === "start");
  const goal = track.features.find((f) => f.kind === "goal");
  if (!start || !goal) {
    throw new Error("Track requires Start and Goal features");
  }

  const missing: Pos[] = [];
  for (const layer of track.layers) {
    for (const p of layer.missing) {
      missing.push({ ...p });
    }
  }

  const transitions: Transition[] = track.features
    .filter((f): f is Extract<TrackFeature, { kind: "portal" }> => f.kind === "portal")
    .map((p) => ({
      type: p.direction,
      from: { ...p.source },
      to: { ...p.destination },
    }));

  const cardTriggers: CardTrigger[] = [];
  for (const f of track.features) {
    if (f.kind !== "card") continue;
    const trig = cardToRuntimeTrigger(f);
    if (trig) cardTriggers.push(trig);
  }

  const villains = buildVillains(track);

  const upLayers = new Set(
    transitions.filter((t) => t.type === "UP").map((t) => t.from.layer),
  );
  const revealOnEnterGuaranteedUp =
    transitions.length > 0 && [1, 2, 3, 4, 5, 6, 7].every((layer) => upLayers.has(layer));

  const scenario: RuntimeScenarioDocument = {
    id: track.trackId,
    name: track.name,
    layers: 7,
    start: { ...start.position },
    goal: { ...goal.position },
    missing,
    blocked: [],
    movement: buildMovement(track),
    transitions,
    revealOnEnterGuaranteedUp,
    ...(cardTriggers.length ? { cardTriggers } : {}),
    ...(villains ? { villains } : {}),
    _plannerMeta: {
      visibilityOverlays: track.visibility,
      featureIds: track.features.map((f) => f.id),
    },
  };

  assertScenario(scenario);
  return scenario;
}

export function validateStructuralCoords(track: PlannerTrack): string[] {
  const errors: string[] = [];
  const inBounds = (p: Pos) => {
    if (p.layer < 1 || p.layer > 7) return false;
    if (p.row < 0 || p.row >= ROW_LENS.length) return false;
    return p.col >= 0 && p.col < ROW_LENS[p.row];
  };

  for (const f of track.features) {
    const p =
      f.kind === "portal"
        ? f.source
        : f.kind === "start" || f.kind === "goal" || f.kind === "card" || f.kind === "encounter" || f.kind === "villain"
          ? f.position
          : null;
    if (p && !inBounds(p)) errors.push(`${f.id}: position out of bounds`);
    if (p && isMissing(track, p)) errors.push(`${f.id}: on missing hex`);
    if (f.kind === "portal") {
      if (!inBounds(f.destination)) errors.push(`${f.id}: portal destination out of bounds`);
      if (isMissing(track, f.destination)) errors.push(`${f.id}: portal destination on missing hex`);
    }
  }

  const starts = track.features.filter((f) => f.kind === "start");
  if (starts.length === 0) errors.push("Missing Start");
  if (starts.length > 1) errors.push("Multiple Start features");

  const goals = track.features.filter((f) => f.kind === "goal");
  if (goals.length === 0) errors.push("Missing Goal");

  return errors;
}

export function serializeScenarioExport(track: PlannerTrack): string {
  const doc = authoredTrackToScenario(track);
  const { _plannerMeta, runtimeMovement, ...runtime } = doc as Scenario & {
    _plannerMeta?: unknown;
    runtimeMovement?: unknown;
  };
  void _plannerMeta;
  void runtimeMovement;
  return JSON.stringify(runtime, null, 2);
}
