/**
 * Analyze whether tracks can get stuck on layers during play.
 * Run: npx tsx scripts/analyze-track-layer-stuck.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { assertScenario } = await import(pathToFileURL(join(root, "src/engine/scenario.ts")).href);
const { newGame } = await import(pathToFileURL(join(root, "src/engine/api.ts")).href);
const { computeMinMovesToGoal } = await import(
  pathToFileURL(join(root, "src/engine/reachabilityOptimal.ts")).href
);
const { neighborIdsSameLayer } = await import(pathToFileURL(join(root, "src/engine/neighbors.ts")).href);
const { attemptMove } = await import(pathToFileURL(join(root, "src/engine/rules.ts")).href);
const { restoreStateLite, snapshotStateLite } = await import(
  pathToFileURL(join(root, "src/engine/snapshot.ts")).href
);

const tracks = [
  [1, "t1", "scenario.json"],
  [2, "t2", "scenario2.json"],
  [3, "t3", "scenario3.json"],
  [4, "t4", "scenario4.json"],
  [5, "t5", "scenario5.json"],
  [6, "t6", "scenario5.json"],
  [7, "t7", "scenario6.json"],
  [8, "t8", "scenario7.json"],
  [9, "t9", "scenario8.json"],
  [10, "t10", "scenario9.json"],
  [11, "t11", "scenario10.json"],
  [12, "t12", "scenario11.json"],
  [13, "t13", "scenario12.json"],
  [14, "t14", "scenario13.json"],
  [15, "t15", "scenario14.json"],
  [16, "t16", "scenario15.json"],
  [17, "t17", "scenario16.json"],
  [18, "t18", "scenario17.json"],
  [19, "t19", "scenario18.json"],
  [20, "t20", "scenario19.json"],
  [21, "t21", "scenario20.json"],
  [22, "t22", "scenario21.json"],
];

const basePath = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

function playerLayer(hexId) {
  const m = /^L(\d+)-/.exec(hexId);
  return m ? Number(m[1]) : 1;
}

function signature(dto) {
  let rows = "";
  const layerEntries = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const entry of layerEntries) {
    rows += `|L${entry.layer}`;
    for (let i = 0; i < entry.rows.length; i++) {
      rows += `|${entry.rows[i].join(",")}`;
    }
  }
  return `p=${dto.playerHexId}|t=${dto.turn}${rows}`;
}

/** BFS all game states reachable within maxTurns from start */
function enumerateStates(base, maxTurns) {
  const startDto = snapshotStateLite(base);
  const seen = new Set([signature(startDto)]);
  const states = [{ dto: startDto, turns: 0 }];
  const q = [{ dto: startDto, turns: 0 }];
  let head = 0;

  while (head < q.length) {
    const { dto, turns } = q[head++];
    if (turns >= maxTurns) continue;

    const st = restoreStateLite(base, dto);
    for (const nid of neighborIdsSameLayer(st, st.playerHexId)) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, dto);
      const r = attemptMove(st2, nid);
      if (!r.ok) continue;
      const dto2 = snapshotStateLite(st2);
      const sig = signature(dto2);
      if (seen.has(sig)) continue;
      seen.add(sig);
      const t = turns + 1;
      states.push({ dto: dto2, turns: t });
      q.push({ dto: dto2, turns: t });
    }
  }
  return states;
}

function portalLayers(scenario) {
  const up = new Map();
  const down = new Map();
  for (const tr of scenario.transitions ?? []) {
    const fromL = tr.from.layer;
    const toL = tr.to.layer;
    if (tr.direction === "UP") {
      if (!up.has(fromL)) up.set(fromL, []);
      up.get(fromL).push(toL);
    } else if (tr.direction === "DOWN") {
      if (!down.has(fromL)) down.set(fromL, []);
      down.get(fromL).push(toL);
    }
  }
  return { up, down };
}

console.log("=== Track solvability & layer stuck analysis ===\n");

const summary = [];

for (const [num, tid, file] of tracks) {
  const s = JSON.parse(readFileSync(join(basePath, file), "utf8"));
  assertScenario(s);
  const st = newGame(s);
  const goalLayer = s.goal.layer;
  const minFromStart = computeMinMovesToGoal(st, 80);

  const { up, down } = portalLayers(s);
  const upLayers = [...up.keys()].sort((a, b) => a - b);
  const maxUpLayer = Math.max(...upLayers, 0);

  const states = enumerateStates(st, 55);
  const layersSeen = new Set();
  let deadCount = 0;
  const deadByLayer = new Map();

  for (const { dto, turns } of states) {
    layersSeen.add(playerLayer(dto.playerHexId));
    const stMid = restoreStateLite(st, dto);
    const minRemain = computeMinMovesToGoal(stMid, 80 - turns);
    if (minRemain === null) {
      deadCount++;
      const l = playerLayer(dto.playerHexId);
      deadByLayer.set(l, (deadByLayer.get(l) ?? 0) + 1);
    }
  }

  const layersAboveGoal = [...layersSeen].filter((l) => l > goalLayer).sort((a, b) => a - b);
  const unreachableHighLayers = [...layersSeen].filter((l) => l > maxUpLayer);

  summary.push({
    num,
    tid,
    goalLayer,
    minFromStart,
    deadCount,
    deadByLayer: Object.fromEntries(deadByLayer),
    layersSeen: [...layersSeen].sort((a, b) => a - b),
    layersAboveGoal,
    maxUpLayer,
    upPortalLayers: upLayers,
    hasDown: (s.transitions ?? []).some((t) => t.direction === "DOWN"),
  });
}

for (const row of summary) {
  console.log(
    `#${String(row.num).padStart(2)} ${row.tid} | goal L${row.goalLayer} | min ${row.minFromStart} | dead states ${row.deadCount} | layers visited ${row.layersSeen.join(",")}`
  );
  if (row.deadCount > 0) {
    console.log(`     dead by layer: ${JSON.stringify(row.deadByLayer)}`);
  }
  if (row.layersAboveGoal.length) {
    console.log(`     visited above goal layer: ${row.layersAboveGoal.join(",")} (no DOWN portals: ${!row.hasDown})`);
  }
  console.log(`     UP portals from layers: ${row.upPortalLayers.join(",")} (max climb L${row.maxUpLayer})`);
}

const anyDead = summary.filter((r) => r.deadCount > 0);
console.log("\n=== Summary ===");
console.log(`Tracks with unreachable-from states during play: ${anyDead.length}`);
if (anyDead.length) {
  for (const r of anyDead) {
    console.log(`  ${r.tid}: ${r.deadCount} dead states, layers ${JSON.stringify(r.deadByLayer)}`);
  }
}
