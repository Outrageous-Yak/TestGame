import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadCharacters,
  saveCharacters,
  loadActiveSpriteId,
  saveActiveSpriteId,
  upsertCharacter,
  deleteCharacter,
  duplicateCharacter,
  renameCharacter,
  resolveActiveCharacter,
  safeActiveIdAfterDelete,
} from "../spriteStorage";
import { createBlankSprite } from "../spriteConstants";
import { createSheetFromConversion } from "../spriteValidation";
import { isSpriteSheet } from "../spriteTypes";

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

describe("spriteStorage", () => {
  it("seeds starter templates on first load", () => {
    const chars = loadCharacters();
    expect(chars.length).toBeGreaterThanOrEqual(2);
  });

  it("persists v1 and v2 characters", () => {
    const v1 = createBlankSprite("Hero");
    const v2 = createSheetFromConversion("Walk", v1.palette, v1.pixels, "walk");
    saveCharacters([v1, v2]);
    const loaded = loadCharacters();
    expect(loaded.some((c) => c.name === "Hero")).toBe(true);
    expect(loaded.some((c) => isSpriteSheet(c) && c.name === "Walk")).toBe(true);
  });

  it("upsertCharacter updates existing entry", () => {
    const s = createBlankSprite("A");
    const list = upsertCharacter([], s);
    const updated = { ...s, name: "B" };
    const next = upsertCharacter(list, updated);
    expect(next.find((x) => x.id === s.id)?.name).toBe("B");
  });

  it("deleteCharacter refuses builtin", () => {
    const chars = loadCharacters();
    const builtin = chars.find((s) => s.builtin)!;
    expect(deleteCharacter(chars, builtin.id).length).toBe(chars.length);
  });

  it("duplicateCharacter copies sheets", () => {
    const v1 = createBlankSprite();
    const sheet = createSheetFromConversion("S", v1.palette, v1.pixels, "idle");
    const copy = duplicateCharacter(sheet);
    expect(isSpriteSheet(copy)).toBe(true);
    expect(copy.id).not.toBe(sheet.id);
  });

  it("active sprite id round-trips", () => {
    const s = createBlankSprite();
    saveActiveSpriteId(s.id);
    expect(loadActiveSpriteId()).toBe(s.id);
    saveActiveSpriteId(null);
    expect(loadActiveSpriteId()).toBeNull();
  });

  it("resolveActiveCharacter returns null for missing id", () => {
    expect(resolveActiveCharacter([], "missing")).toBeNull();
  });

  it("safeActiveIdAfterDelete clears deleted active", () => {
    expect(safeActiveIdAfterDelete("a", "a")).toBeNull();
    expect(safeActiveIdAfterDelete("b", "a")).toBe("b");
  });

  it("renameCharacter changes name", () => {
    const s = createBlankSprite("Old");
    const next = renameCharacter([s], s.id, "New");
    expect(next[0].name).toBe("New");
  });
});
