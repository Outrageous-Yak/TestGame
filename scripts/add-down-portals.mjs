/**
 * Compute and verify DOWN portal placements for trap tracks.
 * Run: npx tsx scripts/add-down-portals.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const base = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

const { assertScenario } = await import(pathToFileURL(join(root, "src/engine/scenario.ts")).href);
const { newGame } = await import(pathToFileURL(join(root, "src/engine/api.ts")).href);
const { computeMinMovesToGoal } = await import(
  pathToFileURL(join(root, "src/engine/reachabilityOptimal.ts")).href
);
const { neighborIdsSameLayer } = await import(pathToFileURL(join(root, "src/engine/neighbors.ts")).href);
const { attemptMove } = await import(pathToFileURL(join(root, "src/engine/rules.ts")).href);
const { neighborSlots } = await import(pathToFileURL(join(root, "src/engine/layout.ts")).href);
const { posId } = await import(pathToFileURL(join(root, "src/engine/board.ts")).href);

const TRACKS = [
  { tid: "t1", file: "scenario.json", pattern: "standard" },
  { tid: "t2", file: "scenario2.json", pattern: "standard" },
  { tid: "t9", file: "scenario8.json", pattern: "standard" },
  { tid: "t10", file: "scenario9.json", pattern: "standard" },
  { tid: "t11", file: "scenario10.json", pattern: "standard" },
  { tid: "t12", file: "scenario11.json", pattern: "corner" },
];

function goalNeighborTo(s) {
  const g = s.goal;
  const missing = new Set((s.missing ?? []).map(posId));
  const blocked = new Set((s.blocked ?? []).map(posId));
  const slots = neighborSlots(g.row, g.col);
  for (const { r, c } of slots) {
    const p = { layer: g.layer, row: r, col: c };
    const id = posId(p);
    if (!missing.has(id) && !blocked.has(id)) return p;
  }
  throw new Error(`No valid neighbor for goal ${JSON.stringify(g)}`);
}

function downFromForLayer(pattern, layer) {
  if (pattern === "corner") return { layer, row: 6, col: 6 };
  return { layer, row: 2, col: 2 };
}

for (const track of TRACKS) {
  const path = join(base, track.file);
  const s = JSON.parse(readFileSync(path, "utf8"));
  const to = goalNeighborTo(s);
  const downs = [3, 4, 5].map((layer) => ({
    type: "DOWN",
    from: downFromForLayer(track.pattern, layer),
    to,
  }));
  console.log(track.tid, downs);
  for (const d of downs) {
    assertScenario({ ...s, transitions: [...s.transitions, ...downs] });
  }
}
