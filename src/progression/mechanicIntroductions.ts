import type { MechanicId } from "./types";
import type { MechanicIntroduction } from "./mechanicRegistry";

export function hasSeenMechanic(
  save: { seenMechanicIntroductions: string[] },
  id: MechanicId,
): boolean {
  return save.seenMechanicIntroductions.includes(id);
}

export function markMechanicSeen<T extends { seenMechanicIntroductions: string[] }>(
  save: T,
  id: MechanicId,
): T {
  if (save.seenMechanicIntroductions.includes(id)) return save;
  return {
    ...save,
    seenMechanicIntroductions: [...save.seenMechanicIntroductions, id],
  };
}

export function mechanicsIntroducedByTrack(
  introduces: MechanicId[] | undefined,
  registry: Record<MechanicId, MechanicIntroduction>,
): MechanicIntroduction[] {
  if (!introduces?.length) return [];
  return introduces.map((id) => registry[id]).filter(Boolean);
}
