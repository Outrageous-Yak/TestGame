import type { ProgressionSaveV1 } from "./types";

export const PROGRESSION_STORAGE_KEY = "hexgame-progression";

export function createDefaultProgression(): ProgressionSaveV1 {
  return {
    version: 1,
    completedTracks: {},
    seenMechanicIntroductions: [],
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeProgressionSave(raw: unknown): ProgressionSaveV1 {
  const base = createDefaultProgression();
  if (!isRecord(raw)) return base;

  const version = raw.version;
  if (version !== 1) return base;

  const completedTracks: ProgressionSaveV1["completedTracks"] = {};
  if (isRecord(raw.completedTracks)) {
    for (const [key, value] of Object.entries(raw.completedTracks)) {
      if (!isRecord(value)) continue;
      const count = Number(value.completionCount);
      const firstCompletedAt = value.firstCompletedAt;
      if (!Number.isFinite(count) || count < 1) continue;
      if (typeof firstCompletedAt !== "string" || !firstCompletedAt) continue;
      completedTracks[key] = {
        completionCount: Math.floor(count),
        firstCompletedAt,
      };
    }
  }

  const seenMechanicIntroductions: string[] = [];
  if (Array.isArray(raw.seenMechanicIntroductions)) {
    for (const id of raw.seenMechanicIntroductions) {
      if (typeof id === "string" && id) seenMechanicIntroductions.push(id);
    }
  }

  return {
    version: 1,
    completedTracks,
    seenMechanicIntroductions,
  };
}

export function loadProgression(): ProgressionSaveV1 {
  if (typeof localStorage === "undefined") return createDefaultProgression();
  try {
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return createDefaultProgression();
    return normalizeProgressionSave(JSON.parse(raw));
  } catch {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[progression] corrupt save — resetting to defaults");
    }
    return createDefaultProgression();
  }
}

export function saveProgression(progress: ProgressionSaveV1): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // quota / private mode
  }
}

export function resetProgression(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PROGRESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
