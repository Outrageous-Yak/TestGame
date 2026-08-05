#!/usr/bin/env node
/**
 * Migrates scenario JSON movement presets to structured per-row definitions.
 * Run once: node scripts/migrate-movement-json.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SEVEN_LEFT_SIX_RIGHT = {
  rows: {
    "0": { direction: "LEFT", amount: 1 },
    "1": { direction: "RIGHT", amount: 1 },
    "2": { direction: "LEFT", amount: 1 },
    "3": { direction: "RIGHT", amount: 1 },
    "4": { direction: "LEFT", amount: 1 },
    "5": { direction: "RIGHT", amount: 1 },
    "6": { direction: "LEFT", amount: 1 },
  },
};

const TOP3_RIGHT_BOTTOM4_LEFT = {
  rows: {
    "0": { direction: "RIGHT", amount: 1 },
    "1": { direction: "RIGHT", amount: 1 },
    "2": { direction: "RIGHT", amount: 1 },
    "3": { direction: "LEFT", amount: 1 },
    "4": { direction: "LEFT", amount: 1 },
    "5": { direction: "LEFT", amount: 1 },
    "6": { direction: "LEFT", amount: 1 },
  },
};

const PRESET_MAP = {
  SEVEN_LEFT_SIX_RIGHT: SEVEN_LEFT_SIX_RIGHT,
  TOP3_RIGHT_BOTTOM4_LEFT: TOP3_RIGHT_BOTTOM4_LEFT,
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".json")) out.push(p);
  }
  return out;
}

function migrateMovement(movement) {
  if (!movement || typeof movement !== "object") return { changed: false, movement };
  let changed = false;
  const next = { ...movement };
  for (const [layer, value] of Object.entries(movement)) {
    if (typeof value === "string" && value in PRESET_MAP) {
      next[layer] = PRESET_MAP[value];
      changed = true;
    }
  }
  return { changed, movement: next };
}

const roots = ["public/worlds", "public/scenarios"];
const files = roots.flatMap((r) => walk(r));
let migrated = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  if (!data.movement) continue;
  const { changed, movement } = migrateMovement(data.movement);
  if (!changed) continue;
  data.movement = movement;
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  migrated++;
  console.log("migrated", file);
}

console.log(`Done. Migrated ${migrated} files.`);
