import { readFileSync } from "fs";
import { join } from "path";

// Dynamic import of compiled engine - use vitest path
const root = join(import.meta.dirname, "..");

async function main() {
  const { newGame } = await import(join(root, "src/engine/api.ts"));
  const { computeOptimalSolution, formatReplay } = await import(join(root, "src/engine/trackAnalysis.ts"));
  const { countSolutionsWithin, detectSoftLocks, detectDeadGameplay } = await import(join(root, "src/engine/puzzleFitness.ts"));
  const { posId } = await import(join(root, "src/engine/board.ts"));

  const id = process.argv[2] || "track01.json";
  const path = join(root, "public/worlds/forgotten_citadel/scenarios", id);
  const scenario = JSON.parse(readFileSync(path, "utf8"));
  const base = newGame(scenario);
  const sol = computeOptimalSolution(base);
  const counts = countSolutionsWithin(base, 80, 5);
  const soft = detectSoftLocks(base);
  const portals = sol.replay.filter((s) => s.portalType).map((s) => s.toHexId);
  const dead = detectDeadGameplay(scenario, sol.pathHexIds, portals);

  console.log("ID:", scenario.id);
  console.log("minMoves:", sol.minMoves, "optimal:", counts.optimal);
  console.log("Unreachable portal from:", soft.unreachablePortalFrom);
  console.log("Unreachable portal dest:", soft.unreachablePortalDest);
  console.log("Unused portals:", dead.unusedPortals);
  console.log("\n--- REPLAY ---\n");
  console.log(formatReplay(sol.replay));
  console.log("\n--- TRANSITIONS ---");
  for (const t of scenario.transitions ?? []) {
    console.log(t.type, posId(t.from), "->", posId(t.to));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
