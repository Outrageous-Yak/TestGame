/**
 * Print portal layout verification report for trap tracks.
 * Run: npx tsx scripts/verify-down-portal-layout.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

const { assertScenario } = await import(pathToFileURL(join(root, "src/engine/scenario.ts")).href);
const { neighborSlots } = await import(pathToFileURL(join(root, "src/engine/layout.ts")).href);
const { posId } = await import(pathToFileURL(join(root, "src/engine/board.ts")).href);
const { newGame } = await import(pathToFileURL(join(root, "src/engine/api.ts")).href);
const { attemptMove } = await import(pathToFileURL(join(root, "src/engine/rules.ts")).href);
const { neighborIdsSameLayer } = await import(pathToFileURL(join(root, "src/engine/neighbors.ts")).href);
const { restoreStateLite, snapshotStateLite } = await import(
  pathToFileURL(join(root, "src/engine/snapshot.ts")).href
);

const TRACKS = [
  ["t1", "scenario.json"],
  ["t2", "scenario2.json"],
  ["t9", "scenario8.json"],
  ["t10", "scenario9.json"],
  ["t11", "scenario10.json"],
  ["t12", "scenario11.json"],
];

function pk(p) {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

function isGoalNeighbor(s, dest) {
  const missing = new Set((s.missing ?? []).map(posId));
  const blocked = new Set((s.blocked ?? []).map(posId));
  const id = posId(dest);
  if (missing.has(id) || blocked.has(id)) return false;
  return neighborSlots(s.goal.row, s.goal.col).some((sl) => sl.r === dest.row && sl.c === dest.col);
}

function reachLayer(base, layer, maxTurns = 45) {
  const sig = (dto) => {
    let rows = "";
    for (const e of dto.rows.sort((a, b) => a.layer - b.layer)) {
      rows += `|L${e.layer}`;
      for (const r of e.rows) rows += `|${r.join(",")}`;
    }
    return dto.playerHexId + "|t=" + dto.turn + rows;
  };
  const q = [{ dto: snapshotStateLite(base), t: 0 }];
  const seen = new Set([sig(q[0].dto)]);
  let h = 0;
  while (h < q.length) {
    const { dto, t } = q[h++];
    if (Number(/^L(\d+)/.exec(dto.playerHexId)[1]) === layer) return true;
    if (t >= maxTurns) continue;
    const cur = restoreStateLite(base, dto);
    for (const nid of neighborIdsSameLayer(cur, cur.playerHexId)) {
      const nh = cur.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, dto);
      if (!attemptMove(st2, nid).ok) continue;
      const dto2 = snapshotStateLite(st2);
      const s2 = sig(dto2);
      if (seen.has(s2)) continue;
      seen.add(s2);
      q.push({ dto: dto2, t: t + 1 });
    }
  }
  return false;
}

for (const [tid, file] of TRACKS) {
  const s = JSON.parse(readFileSync(join(dir, file), "utf8"));
  assertScenario(s);
  const fromCount = new Map();
  for (const t of s.transitions) {
    const k = pk(t.from);
    fromCount.set(k, (fromCount.get(k) ?? 0) + 1);
  }
  const dupes = [...fromCount.entries()].filter(([, n]) => n > 1);

  console.log(`\n=== ${tid} (${file}) ===`);
  console.log(`Goal: ${pk(s.goal)}`);
  console.log(`Duplicate portal FROM hexes: ${dupes.length ? dupes.map(([k, n]) => `${k}×${n}`).join(", ") : "none"}`);

  for (const layer of [3, 4, 5]) {
    const upTrig = s.transitions.find((t) => t.type === "UP" && t.from.layer === layer);
    const upLand = s.transitions.find((t) => t.type === "UP" && t.to.layer === layer);
    const down = s.transitions.find((t) => t.type === "DOWN" && t.from.layer === layer);
    console.log(`\n  Layer ${layer}:`);
    console.log(`    UP trigger (climb higher FROM this layer): ${upTrig ? pk(upTrig.from) + " → " + pk(upTrig.to) : "none"}`);
    console.log(`    UP arrival (enter this layer from below): ${upLand ? pk(upLand.from) + " → " + pk(upLand.to) : "n/a"}`);
    console.log(`    DOWN portal FROM: ${down ? pk(down.from) : "MISSING"}`);
    console.log(`    DOWN destination: ${down ? pk(down.to) : "—"}`);
    console.log(`    DOWN dest is goal neighbor: ${down ? isGoalNeighbor(s, down.to) : false}`);
    console.log(`    DOWN overwrote UP trigger: ${upTrig && down ? pk(upTrig.from) === pk(down.from) : false}`);
    console.log(`    DOWN same tile as UP trigger: ${upTrig && down ? pk(upTrig.from) === pk(down.from) : false}`);
    console.log(`    DOWN same tile as UP arrival: ${upLand && down ? pk(upLand.to) === pk(down.from) : "n/a"}`);
    console.log(`    Layer reachable in play: ${reachLayer(newGame(s), layer)}`);
  }
}
