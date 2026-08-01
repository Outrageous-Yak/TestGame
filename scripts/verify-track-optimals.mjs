/**
 * Verify UI-accurate minimum moves for every Prism Path track.
 * Run: node scripts/verify-track-optimals.mjs
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const { assertScenario } = await import(pathToFileURL(join(root, "src/engine/scenario.ts")).href);
const { newGame, getReachability } = await import(pathToFileURL(join(root, "src/engine/api.ts")).href);
const { computeMinMovesToGoal } = await import(pathToFileURL(join(root, "src/engine/reachabilityOptimal.ts")).href);
const { computeReachabilityWithShifts } = await import(pathToFileURL(join(root, "src/engine/reachabilityTime.ts")).href);

const tracks = [
  [1, "t1", "scenario.json"],
  [2, "t2", "scenario2.json"],
  [3, "t3", "scenario3.json"],
  [4, "t4", "scenario4.json"],
  [5, "t5", "scenario4.json"],
  [6, "t6", "scenario5.json"],
  [7, "t7", "scenario6.json"],
  [8, "t8", "scenario7.json"],
  [9, "t9", "scenario8.json"],
  [10, "t10", "scenario9.json"],
  [11, "t11", "scenario10.json"],
  [12, "t12", "scenario11.json"],
];

const basePath = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

console.log("Track | UI optimal | Old static | Engine-shift | Goal");
console.log("------|------------|------------|--------------|-----");

for (const [num, tid, file] of tracks) {
  const s = JSON.parse(readFileSync(join(basePath, file), "utf8"));
  assertScenario(s);
  const st = newGame(s);
  const lm0 = Object.fromEntries([...Array(s.layers)].map((_, i) => [i + 1, 0]));
  const goalId = `L${s.goal.layer}-R${s.goal.row}-C${s.goal.col}`;
  const uiOpt = computeMinMovesToGoal(st, lm0);
  const oldOpt = getReachability(st)[goalId]?.distance ?? null;
  const engOpt = computeReachabilityWithShifts(st, 80).minTurns;
  console.log(
    String(num).padStart(5),
    "|",
    String(uiOpt ?? "-").padStart(10),
    "|",
    String(oldOpt ?? "-").padStart(10),
    "|",
    String(engOpt ?? "-").padStart(12),
    "|",
    goalId
  );
}
