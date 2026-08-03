import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  loadSprites,
  saveSprites,
  loadActiveSpriteId,
  saveActiveSpriteId,
  upsertSprite,
  deleteSprite,
  duplicateSprite,
  renameSprite,
  resolveActiveSprite,
  safeActiveIdAfterDelete,
} from "../spriteStorage";
import { createBlankSprite } from "../spriteConstants";

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
    const sprites = loadSprites();
    expect(sprites.length).toBeGreaterThanOrEqual(2);
    expect(sprites.some((s) => s.id === "template-blue-elf")).toBe(true);
  });

  it("persists and reloads sprites", () => {
    const custom = createBlankSprite("Hero");
    saveSprites([custom]);
    const loaded = loadSprites();
    expect(loaded.some((s) => s.name === "Hero")).toBe(true);
  });

  it("upsertSprite updates existing entry", () => {
    const s = createBlankSprite("A");
    const list = upsertSprite([], s);
    const updated = { ...s, name: "B" };
    const next = upsertSprite(list, updated);
    expect(next.find((x) => x.id === s.id)?.name).toBe("B");
  });

  it("deleteSprite refuses builtin sprites", () => {
    const sprites = loadSprites();
    const builtin = sprites.find((s) => s.builtin)!;
    const next = deleteSprite(sprites, builtin.id);
    expect(next.length).toBe(sprites.length);
  });

  it("duplicateSprite creates editable copy", () => {
    const sprites = loadSprites();
    const builtin = sprites.find((s) => s.builtin)!;
    const copy = duplicateSprite(builtin);
    expect(copy.builtin).toBe(false);
    expect(copy.id).not.toBe(builtin.id);
  });

  it("renameSprite changes name", () => {
    const s = createBlankSprite("Old");
    const next = renameSprite([s], s.id, "New");
    expect(next[0].name).toBe("New");
  });

  it("active sprite id round-trips", () => {
    const s = createBlankSprite();
    saveActiveSpriteId(s.id);
    expect(loadActiveSpriteId()).toBe(s.id);
    saveActiveSpriteId(null);
    expect(loadActiveSpriteId()).toBeNull();
  });

  it("resolveActiveSprite returns null for missing id", () => {
    expect(resolveActiveSprite([], "missing")).toBeNull();
  });

  it("safeActiveIdAfterDelete clears deleted active", () => {
    expect(safeActiveIdAfterDelete("a", "a")).toBeNull();
    expect(safeActiveIdAfterDelete("b", "a")).toBe("b");
  });
});
