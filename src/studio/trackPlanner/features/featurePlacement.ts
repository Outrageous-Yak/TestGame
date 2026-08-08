import { newId } from "../catalog";
import type { CardColor, PlannerTrack, Pos, PortalFeature, TrackFeature } from "../types";
import type { VillainKey } from "../../../ui/types";
import type { PlacementKind } from "./featureCompatibility";
import { placementKindToFeatureKind } from "./featureCompatibility";

export function removeFeaturesAt(track: PlannerTrack, pos: Pos): PlannerTrack {
  const key = `L${pos.layer}-R${pos.row}-C${pos.col}`;
  return {
    ...track,
    features: track.features.filter((f) => {
      const p =
        f.kind === "portal"
          ? f.source
          : "position" in f
            ? f.position
            : null;
      if (!p) return true;
      const fk = `L${p.layer}-R${p.row}-C${p.col}`;
      return fk !== key;
    }),
  };
}

export function removeFeatureById(track: PlannerTrack, id: string): PlannerTrack {
  return { ...track, features: track.features.filter((f) => f.id !== id) };
}

export function moveUniqueFeature(
  track: PlannerTrack,
  kind: "start" | "goal",
  pos: Pos,
): PlannerTrack {
  const without = track.features.filter((f) => f.kind !== kind);
  return {
    ...track,
    features: [...without, { kind, id: newId(kind), position: { ...pos } }],
  };
}

export function createFeatureAt(
  track: PlannerTrack,
  kind: PlacementKind,
  pos: Pos,
  opts?: {
    cardType?: CardColor;
    portalDirection?: "UP" | "DOWN";
    villainPool?: VillainKey[];
    encounterPool?: string[];
  },
): PlannerTrack {
  const featureKind = placementKindToFeatureKind(kind);
  let features = [...track.features];

  if (featureKind === "start" || featureKind === "goal") {
    features = features.filter((f) => f.kind !== featureKind);
    features.push({
      kind: featureKind,
      id: newId(featureKind),
      position: { ...pos },
    });
    return { ...track, features };
  }

  if (featureKind === "portal") {
    const direction = kind === "portal_down" ? "DOWN" : "UP";
    const layerDelta = direction === "UP" ? 1 : -1;
    const destLayer = Math.min(7, Math.max(1, pos.layer + layerDelta));
    const portal: PortalFeature = {
      kind: "portal",
      id: newId("portal"),
      portalId: `portal_${features.filter((f) => f.kind === "portal").length + 1}`,
      source: { ...pos },
      direction,
      destination: { layer: destLayer, row: pos.row, col: pos.col },
      hidden: false,
    };
    features.push(portal);
    return { ...track, features };
  }

  if (featureKind === "card") {
    const cardType = opts?.cardType ?? "RED";
    const card: TrackFeature = {
      kind: "card",
      id: newId("card"),
      position: { ...pos },
      cardType,
      hidden: false,
      ...(cardType === "RED"
        ? { contentMode: "random" as const }
        : cardType === "HIDDEN"
          ? { resolvedType: "RED" as const }
          : {}),
    };
    features.push(card);
    return { ...track, features };
  }

  if (featureKind === "encounter") {
    features.push({
      kind: "encounter",
      id: newId("encounter"),
      position: { ...pos },
      mode: "random",
      encounterId: opts?.encounterPool?.[0],
    });
    return { ...track, features };
  }

  if (featureKind === "villain") {
    features.push({
      kind: "villain",
      id: newId("villain"),
      position: { ...pos },
      mode: "random",
      villainKey: opts?.villainPool?.[0],
    });
    return { ...track, features };
  }

  return track;
}

export function updateFeatureInTrack(
  track: PlannerTrack,
  id: string,
  patch: Partial<TrackFeature>,
): PlannerTrack {
  return {
    ...track,
    features: track.features.map((f) => (f.id === id ? ({ ...f, ...patch } as TrackFeature) : f)),
  };
}
