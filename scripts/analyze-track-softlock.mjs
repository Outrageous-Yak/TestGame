/**
 * Fast soft-lock analysis: portal layer traps + optional dead-state sampling.
 * Run: npx tsx scripts/analyze-track-softlock.mjs
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
  [1, "t1", "scenario.json", "Track 1"],
  [2, "t2", "scenario2.json", "Track 2"],
  [3, "t3", "scenario3.json", "Track 3"],
  [4, "t4", "scenario4.json", "Track 4"],
  [5, "t5", "scenario5.json", "Track 5"],
  [6, "t6", "scenario5.json", "Track 6"],
  [7, "t7", "scenario6.json", "Track 7"],
  [8, "t8", "scenario7.json", "Track 8"],
  [9, "t9", "scenario8.json", "Track 9"],
  [10, "t10", "scenario9.json", "Track 10"],
  [11, "t11", "scenario10.json", "Track 11"],
  [12, "t12", "scenario11.json", "Track 12"],
  [13, "t13", "scenario12.json", "Brain Melter I"],
  [14, "t14", "scenario13.json", "Brain Melter II"],
  [15, "t15", "scenario14.json", "Brain Melter III"],
  [16, "t16", "scenario15.json", "Brain Melter IV"],
  [17, "t17", "scenario16.json", "Brain Melter V"],
  [18, "t18", "scenario17.json", "Brain Melter VI"],
  [19, "t19", "scenario18.json", "Brain Melter VII"],
  [20, "t20", "scenario19.json", "Brain Melter VIII"],
  [21, "t21", "scenario20.json", "Brain Melter IX"],
  [22, "t22", "scenario21.json", "Brain Melter X"],
];

const basePath = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

function playerLayer(hexId) {
  const m = /^L(\d+)-/.exec(hexId);
  return m ? Number(m[1]) : 1;
}

function signature(dto) {
  let rows = "";
  for (const entry of dto.rows.slice().sort((a, b) => a.layer - b.layer)) {
    rows += `|L${entry.layer}`;
    for (const row of entry.rows) rows += `|${row.join(",")}`;
  }
  return `p=${dto.playerHexId}|t=${dto.turn}${rows}`;
}

/** Layers you can reach from start using only portal UP chains */
function portalClimbLayers(scenario) {
  const ups = (scenario.transitions ?? []).filter((t) => t.type === "UP" || t.direction === "UP");
  const reachable = new Set([scenario.start.layer]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of ups) {
      if (reachable.has(t.from.layer) && !reachable.has(t.to.layer)) {
        reachable.add(t.to.layer);
        changed = true;
      }
    }
  }
  return [...reachable].sort((a, b) => a - b);
}

/** Can any DOWN (or layered portal graph) return from `layer` to `goalLayer`? */
function canReturnToGoalLayer(scenario, goalLayer) {
  const transitions = scenario.transitions ?? [];
  const layers = scenario.layers ?? 7;
  const adj = new Map();
  for (let l = 1; l <= layers; l++) adj.set(l, new Set());

  for (const t of transitions) {
    const fromL = t.from.layer;
    const toL = t.to.layer;
    if (!adj.has(fromL)) adj.set(fromL, new Set());
    adj.get(fromL).add(toL);
  }

  // From every layer > goalLayer, is goalLayer reachable via portal graph?
  const aboveGoal = [];
  for (let l = goalLayer + 1; l <= layers; l++) {
    const seen = new Set([l]);
    const q = [l];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      for (const next of adj.get(cur) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        q.push(next);
      }
    }
    if (!seen.has(goalLayer)) aboveGoal.push(l);
  }
  return aboveGoal;
}

/** BFS: which player layers are reachable within maxTurns */
function reachableLayers(base, maxTurns) {
  const startDto = snapshotStateLite(base);
  const q = [{ dto: startDto, turns: 0 }];
  const seen = new Set([signature(startDto)]);
  const layers = new Set([playerLayer(startDto.playerHexId)]);
  let head = 0;

  while (head < q.length) {
    const { dto, turns } = q[head++];
    layers.add(playerLayer(dto.playerHexId));
    if (turns >= maxTurns) continue;
    const cur = restoreStateLite(base, dto);
    for (const nid of neighborIdsSameLayer(cur, cur.playerHexId)) {
      const nh = cur.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, dto);
      if (!attemptMove(st2, nid).ok) continue;
      const dto2 = snapshotStateLite(st2);
      const sig = signature(dto2);
      if (seen.has(sig)) continue;
      seen.add(sig);
      q.push({ dto: dto2, turns: turns + 1 });
    }
  }
  return [...layers].sort((a, b) => a - b);
}

/** Sample dead states on goal layer or below (maze traps) */
function sampleBelowGoalDead(base, goalLayer, maxTurns, limit = 5) {
  const startDto = snapshotStateLite(base);
  const q = [{ dto: startDto, turns: 0 }];
  const seen = new Set([signature(startDto)]);
  const dead = [];
  let head = 0;

  while (head < q.length && dead.length < limit) {
    const { dto, turns } = q[head++];
    const pl = playerLayer(dto.playerHexId);
    if (pl <= goalLayer && turns < maxTurns) {
      const mid = restoreStateLite(base, dto);
      const min = computeMinMovesToGoal(mid, maxTurns - turns);
      if (min === null) dead.push({ hex: dto.playerHexId, layer: pl, turn: dto.turn });
    }
    if (turns >= maxTurns) continue;
    const cur = restoreStateLite(base, dto);
    for (const nid of neighborIdsSameLayer(cur, cur.playerHexId)) {
      const nh = cur.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, dto);
      if (!attemptMove(st2, nid).ok) continue;
      const dto2 = snapshotStateLite(st2);
      const sig = signature(dto2);
      if (seen.has(sig)) continue;
      seen.add(sig);
      q.push({ dto: dto2, turns: turns + 1 });
    }
  }
  return dead;
}

console.log("Track soft-lock analysis\n");

const results = [];

for (const [num, tid, file, name] of tracks) {
  const s = JSON.parse(readFileSync(join(basePath, file), "utf8"));
  assertScenario(s);
  const st = newGame(s);
  const goalLayer = s.goal.layer;
  const goalId = `L${s.goal.layer}-R${s.goal.row}-C${s.goal.col}`;
  const minStart = computeMinMovesToGoal(st, 80);
  const maxTurns = num >= 13 ? 50 : 35;

  const climbLayers = portalClimbLayers(s);
  const maxClimb = Math.max(...climbLayers);
  const noReturnLayers = canReturnToGoalLayer(s, goalLayer);
  const visitLayers = reachableLayers(st, maxTurns);
  const trappedAbove = visitLayers.filter((l) => l > goalLayer && noReturnLayers.includes(l));

  const aboveGoalReachable = visitLayers.filter((l) => l > goalLayer);
  const belowDead = sampleBelowGoalDead(st, goalLayer, maxTurns, 3);

  const aboveTrap = trappedAbove.length > 0;
  const belowTrap = belowDead.length > 0;
  const hasSoftLock = aboveTrap || belowTrap;

  results.push({
    num,
    tid,
    name,
    goalLayer,
    goalId,
    minStart,
    maxClimb,
    climbLayers,
    noReturnLayers,
    visitLayers,
    trappedAbove,
    aboveGoalReachable,
    belowDead,
    aboveTrap,
    belowTrap,
    hasSoftLock,
  });
}

const aboveTrapTracks = results.filter((r) => r.aboveTrap);
const belowOnly = results.filter((r) => !r.aboveTrap && r.belowTrap);
const clean = results.filter((r) => !r.hasSoftLock);

console.log("=== ABOVE-GOAL LAYER TRAP (like Track 1 — portal up past goal, cannot return) ===\n");
if (aboveTrapTracks.length === 0) {
  console.log("  None\n");
} else {
  for (const r of aboveTrapTracks) {
    console.log(`#${String(r.num).padStart(2)} ${r.tid} — ${r.name}`);
    console.log(`     Goal: ${r.goalId} (L${r.goalLayer}) | min from start: ${r.minStart}`);
    console.log(`     Portal climb reaches layers: L${r.climbLayers.join(", L")}`);
    console.log(`     Layers above goal with NO return path: L${r.noReturnLayers.join(", L")}`);
    console.log(`     Reachable trapped layers (play): L${r.trappedAbove.join(", L")}`);
    console.log();
  }
}

console.log("=== OTHER DEAD STATES (on/below goal layer — maze/shift traps, sampled) ===\n");
if (belowOnly.length === 0) {
  console.log("  None sampled within search depth\n");
} else {
  for (const r of belowOnly) {
    console.log(`#${String(r.num).padStart(2)} ${r.tid} — ${r.name}`);
    console.log(`     Goal L${r.goalLayer} | samples: ${r.belowDead.map((d) => d.hex + "@t" + d.turn).join(", ")}`);
  }
  console.log();
}

console.log("=== NO SOFT-LOCK FOUND (within search) ===\n");
for (const r of clean) {
  console.log(`  #${String(r.num).padStart(2)} ${r.tid} — ${r.name} (goal L${r.goalLayer})`);
}

console.log("\n=== SUMMARY TABLE ===");
console.log("Track | Name | GoalL | Above-goal trap? | Other dead samples");
for (const r of results) {
  console.log(
    `${String(r.num).padStart(2)} ${r.tid.padEnd(4)} | ${r.name.slice(0, 18).padEnd(18)} | L${r.goalLayer} | ${r.aboveTrap ? "YES L" + r.trappedAbove.join(",L") : "no"} | ${r.belowTrap ? r.belowDead.length : "0"}`
  );
}
