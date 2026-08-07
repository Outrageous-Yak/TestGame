import type { ProgressionSaveV1 } from "./types";

export const PROGRESSION_SAVE_VERSION = 1 as const;

export function emptyProgressionSave(): ProgressionSaveV1 {
  return {
    version: PROGRESSION_SAVE_VERSION,
    completedTracks: {},
    seenMechanicIntroductions: [],
  };
}

/** Normalize unknown persisted JSON into ProgressionSaveV1 or null if unusable. */
export function migrateProgressionSave(raw: unknown): ProgressionSaveV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const version = obj.version;
  if (version !== 1) return null;

  const completedTracks: ProgressionSaveV1["completedTracks"] = {};
  if (obj.completedTracks && typeof obj.completedTracks === "object") {
    for (const [key, val] of Object.entries(obj.completedTracks as Record<string, unknown>)) {
      if (!val || typeof val !== "object") continue;
      const rec = val as Record<string, unknown>;
      if (rec.completed !== true) continue;
      completedTracks[key] = {
        completed: true,
        completionCount:
          typeof rec.completionCount === "number" && Number.isFinite(rec.completionCount)
            ? Math.max(1, Math.floor(rec.completionCount))
            : undefined,
        firstCompletedAt:
          typeof rec.firstCompletedAt === "string" ? rec.firstCompletedAt : undefined,
      };
    }
  }

  const seenMechanicIntroductions: string[] = [];
  if (Array.isArray(obj.seenMechanicIntroductions)) {
    for (const id of obj.seenMechanicIntroductions) {
      if (typeof id === "string" && id.length > 0) seenMechanicIntroductions.push(id);
    }
  }

  return {
    version: 1,
    completedTracks,
    seenMechanicIntroductions,
  };
}
