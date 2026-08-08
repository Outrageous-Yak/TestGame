import type { WorldEntry } from "../../ui/types";
import type { Scenario } from "../../engine/types";
import { assertScenario } from "../../engine/scenario";
import { posId, ROW_LENS } from "../../engine/board";
import { normalizeScenarioMovement } from "../../engine/rowMovement";
import type { ScenarioMovementDefinition } from "../../engine/rowMovement/types";
import type {
  PlannerDraftBundle,
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
  TrackFeature,
  LayerBoardAuthored,
  PortalFeature,
  CardFeature,
  TrackCatalogStatus,
} from "./types";
import { CARD_COLOR_TO_RUNTIME, createEmptyTrack, emptyLayerBoard } from "./types";
import { parseCardTriggersFromScenario, parseVillainsFromScenario } from "../../ui/game/helpers";
import type { CardKey } from "../../ui/types";
import { boardDraftKey, catalogEntryKey } from "./catalogKeys";

const RUNTIME_TO_CARD: Record<CardKey, CardFeature["cardType"]> = {
  cosmic: "RED",
  terrain: "BLUE",
  risk: "GREEN",
  shadow: "BLACK",
};

export function seedBundleFromWorlds(worlds: WorldEntry[]): PlannerDraftBundle {
  const worldsOut: PlannerWorld[] = [];
  const scenariosOut: PlannerScenario[] = [];
  const tracksOut: PlannerTrack[] = [];

  for (const w of worlds) {
    const scenarioIds: string[] = [];
    for (const sc of w.scenarios) {
      scenarioIds.push(sc.id);
      const trackIds: string[] = [];
      for (const tr of sc.tracks ?? [{ id: sc.id, name: sc.name, scenarioJson: sc.scenarioJson }]) {
        trackIds.push(tr.id);
      }
      scenariosOut.push({
        scenarioId: sc.id,
        worldId: w.id,
        name: sc.name,
        description: sc.desc,
        trackOrder: trackIds,
        allowedEncounters: [],
        allowedVillains: ["bad1", "bad2", "bad3", "bad4"],
        builtIn: true,
      });
      for (const tr of sc.tracks ?? [{ id: sc.id, name: sc.name, scenarioJson: sc.scenarioJson }]) {
        tracksOut.push({
          trackId: tr.id,
          scenarioId: sc.id,
          worldId: w.id,
          name: tr.name,
          layers: [],
          features: [],
          visibility: [{ id: "vis_default", state: "REGULAR", coverage: "FULL_BOARD", positions: [] }],
          builtIn: true,
          sourceScenarioJson: tr.scenarioJson,
          progression: tr.progression,
          catalogStatus: "production",
        });
      }
    }
    worldsOut.push({
      worldId: w.id,
      name: w.name,
      description: w.desc,
      encounterPool: [],
      villainPool: ["bad1", "bad2", "bad3", "bad4"],
      scenarioIds,
      builtIn: true,
    });
  }

  return {
    version: 1,
    worlds: worldsOut,
    scenarios: scenariosOut,
    tracks: tracksOut,
    updatedAt: new Date().toISOString(),
  };
}

export async function hydrateTrackFromJson(
  track: PlannerTrack,
  fetchJson: (path: string) => Promise<unknown>,
): Promise<PlannerTrack> {
  if (!track.sourceScenarioJson) return track;
  const raw = await fetchJson(track.sourceScenarioJson);
  return scenarioJsonToTrack(track, raw);
}

export function scenarioJsonToTrack(base: PlannerTrack, raw: unknown): PlannerTrack {
  const s = raw as Scenario;
  assertScenario(s);

  const meta = (raw as { _plannerMeta?: { authoredFeatures?: TrackFeature[]; progression?: PlannerTrack["progression"] } })
    ._plannerMeta;
  if (meta?.authoredFeatures?.length) {
    const missingByLayer = buildMissingLayers(s);
    const movement = normalizeScenarioMovement((s.movement ?? {}) as ScenarioMovementDefinition);
    const layers = buildLayersFromScenario(missingByLayer, movement);
    return {
      ...base,
      name: s.name || base.name,
      layers,
      features: meta.authoredFeatures.map((f) => ({ ...f })),
      sourceScenarioJson: base.sourceScenarioJson,
      progression: meta.progression ?? base.progression,
    };
  }

  const missingByLayer = buildMissingLayers(s);
  const movement = normalizeScenarioMovement((s.movement ?? {}) as ScenarioMovementDefinition);
  const layers = buildLayersFromScenario(missingByLayer, movement);

  const features: TrackFeature[] = [
    { kind: "start", id: "start_1", position: { ...s.start } },
    { kind: "goal", id: "goal_1", position: { ...s.goal } },
  ];

  let portalIdx = 0;
  for (const t of s.transitions ?? []) {
    portalIdx += 1;
    const pf: PortalFeature = {
      kind: "portal",
      id: `portal_${portalIdx}`,
      portalId: `portal_${portalIdx}`,
      source: { ...t.from },
      direction: t.type,
      destination: { ...t.to },
      hidden: false,
    };
    features.push(pf);
  }

  const cards = parseCardTriggersFromScenario(raw);
  cards.forEach((c, i) => {
    features.push({
      kind: "card",
      id: `card_${i + 1}`,
      position: { layer: c.layer, row: c.row, col: c.col },
      cardType: RUNTIME_TO_CARD[c.card],
      contentMode: "specific",
    });
  });

  const villains = parseVillainsFromScenario(raw);
  villains.forEach((v, i) => {
    features.push({
      kind: "villain",
      id: `villain_${i + 1}`,
      position: { layer: v.layer, row: v.row, col: 0 },
      mode: "specific",
      villainKey: v.key,
    });
  });

  return {
    ...base,
    name: s.name || base.name,
    layers,
    features,
    sourceScenarioJson: base.sourceScenarioJson,
    progression:
      base.progression ??
      (raw as { _plannerMeta?: { progression?: PlannerTrack["progression"] } })._plannerMeta?.progression,
  };
}

function buildMissingLayers(s: Scenario): Map<number, Set<string>> {
  const missingByLayer = new Map<number, Set<string>>();
  for (const p of s.missing ?? []) {
    const set = missingByLayer.get(p.layer) ?? new Set();
    set.add(posId(p));
    missingByLayer.set(p.layer, set);
  }
  return missingByLayer;
}

function buildLayersFromScenario(
  missingByLayer: Map<number, Set<string>>,
  movement: ReturnType<typeof normalizeScenarioMovement>,
): LayerBoardAuthored[] {
  const layers: LayerBoardAuthored[] = [];
  for (let layer = 1; layer <= 7; layer++) {
    const lb = emptyLayerBoard(layer);
    const miss = missingByLayer.get(layer);
    if (miss) {
      for (const id of miss) {
        const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
        if (m) lb.missing.push({ layer: +m[1], row: +m[2], col: +m[3] });
      }
    }
    const lm = movement[layer as 1 | 2 | 3 | 4 | 5 | 6 | 7];
    if (lm) {
      for (let r = 0; r < ROW_LENS.length; r++) {
        const inst = lm.rows[r as 0 | 1 | 2 | 3 | 4 | 5 | 6];
        lb.rowMovement[String(r)] = { direction: inst.direction, amount: inst.amount };
      }
    }
    layers.push(lb);
  }
  return layers;
}

function overlayDraftOntoCatalogEntry(production: PlannerTrack, draft: PlannerTrack): PlannerTrack {
  return {
    ...draft,
    scenarioId: production.scenarioId,
    name: draft.name || production.name,
    sourceScenarioJson: production.sourceScenarioJson ?? draft.sourceScenarioJson,
    progression: draft.progression ?? production.progression,
    builtIn: false,
    catalogStatus: "modified_draft",
  };
}

function catalogStatusForTrack(track: PlannerTrack, hasBoardDraft: boolean): TrackCatalogStatus {
  if (hasBoardDraft && track.sourceScenarioJson) return "modified_draft";
  if (!track.builtIn && track.sourceScenarioJson) return "modified_draft";
  if (!track.builtIn) return "new_draft";
  return "production";
}

/**
 * Merge production registry with local board drafts.
 * Production browse entries are preserved per (world, scenario, track).
 * Board drafts overlay by (world, track) — shared across visibility variants.
 */
export function buildPlannerCatalog(
  builtIn: PlannerDraftBundle,
  drafts: PlannerDraftBundle,
): PlannerDraftBundle {
  const draftWorldMap = new Map(drafts.worlds.map((w) => [w.worldId, w]));
  const draftScenarioMap = new Map(drafts.scenarios.map((s) => [s.scenarioId, s]));
  const draftByBoardKey = new Map<string, PlannerTrack>();
  for (const t of drafts.tracks) {
    draftByBoardKey.set(boardDraftKey(t.worldId, t.trackId), t);
  }

  const worlds: PlannerWorld[] = builtIn.worlds.map((w) => draftWorldMap.get(w.worldId) ?? w);
  for (const w of drafts.worlds) {
    if (!worlds.some((x) => x.worldId === w.worldId)) worlds.push(w);
  }

  const scenarios: PlannerScenario[] = builtIn.scenarios.map((s) => draftScenarioMap.get(s.scenarioId) ?? s);
  for (const s of drafts.scenarios) {
    if (!scenarios.some((x) => x.scenarioId === s.scenarioId)) scenarios.push(s);
  }

  const catalogTrackKeys = new Set<string>();
  const tracks: PlannerTrack[] = [];

  for (const prod of builtIn.tracks) {
    const entryKey = catalogEntryKey(prod.worldId, prod.scenarioId, prod.trackId);
    catalogTrackKeys.add(entryKey);
    const overlay = draftByBoardKey.get(boardDraftKey(prod.worldId, prod.trackId));
    if (overlay) {
      tracks.push(overlayDraftOntoCatalogEntry(prod, overlay));
    } else {
      tracks.push({ ...prod, catalogStatus: "production" });
    }
  }

  for (const draft of drafts.tracks) {
    const matchesBuiltIn = builtIn.tracks.some(
      (p) => p.worldId === draft.worldId && p.trackId === draft.trackId,
    );
    if (matchesBuiltIn) continue;

    const entryKey = catalogEntryKey(draft.worldId, draft.scenarioId, draft.trackId);
    if (catalogTrackKeys.has(entryKey)) continue;
    catalogTrackKeys.add(entryKey);
    tracks.push({
      ...draft,
      catalogStatus: catalogStatusForTrack(draft, true),
    });
  }

  return {
    version: 1,
    worlds,
    scenarios,
    tracks,
    updatedAt: drafts.updatedAt || builtIn.updatedAt,
  };
}

/** @deprecated Use buildPlannerCatalog */
export function mergeBundles(builtIn: PlannerDraftBundle, drafts: PlannerDraftBundle): PlannerDraftBundle {
  return buildPlannerCatalog(builtIn, drafts);
}

export function resolveBoardDraft(
  catalogEntry: PlannerTrack,
  drafts: PlannerDraftBundle,
): PlannerTrack | null {
  return (
    drafts.tracks.find((t) => boardDraftKey(t.worldId, t.trackId) === boardDraftKey(catalogEntry.worldId, catalogEntry.trackId)) ??
    null
  );
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function catalogLabel(status: TrackCatalogStatus | undefined): string {
  switch (status) {
    case "modified_draft":
      return "Modified Draft";
    case "new_draft":
      return "New Draft";
    default:
      return "Production";
  }
}
