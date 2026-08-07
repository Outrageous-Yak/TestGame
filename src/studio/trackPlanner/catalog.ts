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
} from "./types";
import { CARD_COLOR_TO_RUNTIME, createEmptyTrack, emptyLayerBoard } from "./types";
import { parseCardTriggersFromScenario, parseVillainsFromScenario } from "../../ui/game/helpers";
import type { CardKey } from "../../ui/types";

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
          layers: Array.from({ length: 7 }, (_, i) => emptyLayerBoard(i + 1)),
          features: [],
          visibility: [{ id: "vis_default", state: "REGULAR", coverage: "FULL_BOARD", positions: [] }],
          builtIn: true,
          sourceScenarioJson: tr.scenarioJson,
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
  const missingByLayer = new Map<number, Set<string>>();
  for (const p of s.missing ?? []) {
    const set = missingByLayer.get(p.layer) ?? new Set();
    set.add(posId(p));
    missingByLayer.set(p.layer, set);
  }

  const movement = normalizeScenarioMovement((s.movement ?? {}) as ScenarioMovementDefinition);
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
  };
}

export function mergeBundles(builtIn: PlannerDraftBundle, drafts: PlannerDraftBundle): PlannerDraftBundle {
  const worldMap = new Map<string, PlannerWorld>();
  for (const w of builtIn.worlds) worldMap.set(w.worldId, w);
  for (const w of drafts.worlds) worldMap.set(w.worldId, w);

  const scenarioMap = new Map<string, PlannerScenario>();
  for (const s of builtIn.scenarios) scenarioMap.set(s.scenarioId, s);
  for (const s of drafts.scenarios) scenarioMap.set(s.scenarioId, s);

  const trackMap = new Map<string, PlannerTrack>();
  for (const t of builtIn.tracks) trackMap.set(t.trackId, t);
  for (const t of drafts.tracks) trackMap.set(t.trackId, t);

  return {
    version: 1,
    worlds: [...worldMap.values()],
    scenarios: [...scenarioMap.values()],
    tracks: [...trackMap.values()],
    updatedAt: drafts.updatedAt,
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
