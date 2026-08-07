import { describe, expect, it, beforeEach, vi } from "vitest";
import { bestScoreKey, getBestScore, saveBestScore } from "../ui/bestScore";
import { PROGRESSION_STORAGE_KEY, loadProgression, saveProgression } from "./storage";
import { recordTrackCompletion } from "./progression";

const store: Record<string, string> = {};

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  });
});

describe("best score compatibility", () => {
  it("does not remove existing best scores when progression is saved", () => {
    localStorage.setItem(bestScoreKey("citadel_path", "fc_t01"), "12");
    let progress = loadProgression();
    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    saveProgression(progress);
    expect(getBestScore("citadel_path", "fc_t01")).toBe(12);
  });

  it("best score keys remain scenarioEntry-specific", () => {
    localStorage.setItem(bestScoreKey("citadel_path", "fc_t01"), "12");
    saveBestScore("citadel_partly_cloudy", 8, "fc_t01");
    expect(getBestScore("citadel_path", "fc_t01")).toBe(12);
    expect(getBestScore("citadel_partly_cloudy", "fc_t01")).toBe(8);
    expect(localStorage.getItem(PROGRESSION_STORAGE_KEY)).toBeNull();
  });
});
