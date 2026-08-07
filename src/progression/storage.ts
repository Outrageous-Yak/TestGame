import { emptyProgressionSave, migrateProgressionSave } from "./migration";
import type { ProgressionSaveV1 } from "./types";

export const PROGRESSION_STORAGE_KEY = "hexgame-progression-v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

export function loadProgression(storage: StorageLike | null = getStorage()): ProgressionSaveV1 {
  if (!storage) return emptyProgressionSave();
  try {
    const raw = storage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return emptyProgressionSave();
    const parsed = JSON.parse(raw) as unknown;
    return migrateProgressionSave(parsed) ?? emptyProgressionSave();
  } catch {
    if (typeof console !== "undefined") {
      console.warn("[progression] corrupt save — resetting to defaults");
    }
    return emptyProgressionSave();
  }
}

export function saveProgression(
  save: ProgressionSaveV1,
  storage: StorageLike | null = getStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* quota / private mode */
  }
}

export function resetProgression(storage: StorageLike | null = getStorage()): ProgressionSaveV1 {
  const fresh = emptyProgressionSave();
  if (storage) {
    try {
      storage.removeItem(PROGRESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return fresh;
}
