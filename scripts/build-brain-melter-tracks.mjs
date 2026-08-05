/**
 * Build and verify 10 Brain Melter tracks (scenario12–scenario21 → tracks 13–22).
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

const { assertScenario } = await import(pathToFileURL(join(root, "src/engine/scenario.ts")).href);
const { newGame } = await import(pathToFileURL(join(root, "src/engine/api.ts")).href);
const { computeMinMovesToGoal } = await import(
  pathToFileURL(join(root, "src/engine/reachabilityOptimal.ts")).href
);

const ROW_LENS = [7, 6, 7, 6, 7, 6, 7];

function cellKey(p) {
  return `${p.layer}-${p.row}-${p.col}`;
}

function allCells(layers = 7) {
  const out = [];
  for (let layer = 1; layer <= layers; layer++) {
    for (let row = 0; row < ROW_LENS.length; row++) {
      for (let col = 0; col < ROW_LENS[row]; col++) {
        out.push({ layer, row, col });
      }
    }
  }
  return out;
}

function missingFromPassable(passable, layers = 7) {
  const keep = new Set(passable.map(cellKey));
  return allCells(layers).filter((c) => !keep.has(cellKey(c)));
}

function openLayers(from, to = 7) {
  const out = [];
  for (let layer = from; layer <= to; layer++) {
    out.push(...allCells(7).filter((c) => c.layer === layer));
  }
  return out;
}

/** Proven hard L1 shell from Track 12. */
function track12L1Passable() {
  const missing = [
    { layer: 1, row: 5, col: 1 },
    { layer: 1, row: 5, col: 2 },
    { layer: 1, row: 5, col: 3 },
    { layer: 1, row: 5, col: 4 },
    { layer: 1, row: 5, col: 5 },
    { layer: 1, row: 3, col: 0 },
    { layer: 1, row: 3, col: 1 },
    { layer: 1, row: 3, col: 2 },
    { layer: 1, row: 3, col: 3 },
    { layer: 1, row: 3, col: 4 },
    { layer: 1, row: 1, col: 1 },
    { layer: 1, row: 1, col: 2 },
    { layer: 1, row: 1, col: 3 },
    { layer: 1, row: 1, col: 4 },
    { layer: 1, row: 1, col: 5 },
  ];
  const miss = new Set(missing.map((m) => cellKey(m)));
  return allCells(1).filter((c) => c.layer === 1 && !miss.has(cellKey(c)));
}

function rightEdgePortals(upToLayer) {
  const tr = [];
  for (let l = 1; l < upToLayer; l++) {
    tr.push({
      type: "UP",
      from: { layer: l, row: 0, col: 6 },
      to: { layer: l + 1, row: 6, col: 6 },
    });
  }
  return tr;
}

function row3Portals(upToLayer) {
  const tr = [];
  for (let l = 1; l < upToLayer; l++) {
    tr.push({
      type: "UP",
      from: { layer: l, row: 3, col: 5 },
      to: { layer: l + 1, row: 2, col: 2 },
    });
  }
  return tr;
}

function mk(def) {
  return {
    id: def.id,
    name: def.name,
    layers: 7,
    objective: "Reach the goal hex.",
    description: def.description,
    notes: def.notes,
    villains: { requiredRoll: 6, triggers: def.villains ?? [] },
    cardTriggers: def.cardTriggers ?? [],
    start: def.start,
    goal: def.goal,
    missing: missingFromPassable(def.passable, 7),
    blocked: [],
    movement: def.movement,
    transitions: def.transitions,
    revealOnEnterGuaranteedUp: false,
  };
}

const SEVEN_LEFT_SIX_RIGHT_ROWS = {
  0: { direction: "LEFT", amount: 1 },
  1: { direction: "RIGHT", amount: 1 },
  2: { direction: "LEFT", amount: 1 },
  3: { direction: "RIGHT", amount: 1 },
  4: { direction: "LEFT", amount: 1 },
  5: { direction: "RIGHT", amount: 1 },
  6: { direction: "LEFT", amount: 1 },
};

function shiftLayer2Movement() {
  return {
    rows: Object.fromEntries(
      Object.entries(SEVEN_LEFT_SIX_RIGHT_ROWS).map(([k, v]) => [k, { ...v }])
    ),
  };
}

const SHIFT_L2 = {
  1: "NONE",
  2: shiftLayer2Movement(),
  3: "NONE",
  4: "NONE",
  5: "NONE",
  6: "NONE",
  7: "NONE",
};
const SHIFT_L2_L4 = { ...SHIFT_L2, 4: shiftLayer2Movement() };
const SHIFT_L2_L3_L4 = { ...SHIFT_L2, 3: shiftLayer2Movement(), 4: shiftLayer2Movement() };
const SHIFT_L2_L3_L4_L5 = { ...SHIFT_L2_L3_L4, 5: shiftLayer2Movement() };

const L1 = track12L1Passable();
const START = { layer: 1, row: 6, col: 6 };

const TRACKS = [
  {
    file: "scenario12.json",
    trackId: "t13",
    def: mk({
      id: "prism_path_bm13",
      name: "Brain Melter I — Rim Runner",
      description: "Track 12's rim maze, then cross layer 3 to the far corner.",
      notes: ["Brain Melter — harder than Track 12.", "Layer 2 shifts."],
      start: START,
      goal: { layer: 3, row: 6, col: 0 },
      passable: [...L1, ...openLayers(2, 3)],
      movement: SHIFT_L2,
      villains: [{ id: "bm13a", layer: 1, row: 4, col: 6 }],
      cardTriggers: [{ card: "terrain", layer: 1, row: 2, col: 6 }],
      transitions: rightEdgePortals(3),
    }),
  },
  {
    file: "scenario13.json",
    trackId: "t14",
    def: mk({
      id: "prism_path_bm14",
      name: "Brain Melter II — Deep Rim",
      description: "Rim crawl to layer 3's northwest summit. Layers 2 & 4 rotate.",
      notes: ["Top-right portal on layer 1.", "Layers 2 & 4 shift."],
      start: START,
      goal: { layer: 3, row: 0, col: 0 },
      passable: [...L1, ...openLayers(2, 3)],
      movement: SHIFT_L2_L4,
      villains: [
        { id: "bm14a", layer: 1, row: 2, col: 6 },
        { id: "bm14b", layer: 2, row: 4, col: 2 },
      ],
      cardTriggers: [{ card: "shadow", layer: 1, row: 0, col: 6 }],
      transitions: rightEdgePortals(3),
    }),
  },
  {
    file: "scenario14.json",
    trackId: "t15",
    def: mk({
      id: "prism_path_bm15",
      name: "Brain Melter III — Crux",
      description: "Same rim maze, goal on layer 4 southeast. Three villains.",
      notes: ["Longer than Melter I–II.", "Layers 2 & 4 shift."],
      start: START,
      goal: { layer: 4, row: 6, col: 6 },
      passable: [...L1, ...openLayers(2, 4)],
      movement: SHIFT_L2_L4,
      villains: [
        { id: "bm15a", layer: 1, row: 0, col: 4 },
        { id: "bm15b", layer: 2, row: 6, col: 3 },
        { id: "bm15c", layer: 3, row: 1, col: 5 },
      ],
      transitions: rightEdgePortals(4),
    }),
  },
  {
    file: "scenario15.json",
    trackId: "t16",
    def: mk({
      id: "prism_path_bm16",
      name: "Brain Melter IV — Crucible",
      description: "Rim maze to layer 4 northwest. Rotating layers 2 & 4.",
      notes: ["Corner-to-corner after the portal lift.", "Layers 2 & 4 shift."],
      start: START,
      goal: { layer: 4, row: 0, col: 0 },
      passable: [...L1, ...openLayers(2, 4)],
      movement: SHIFT_L2_L4,
      villains: [
        { id: "bm16a", layer: 1, row: 0, col: 4 },
        { id: "bm16b", layer: 2, row: 3, col: 1 },
        { id: "bm16c", layer: 3, row: 5, col: 5 },
      ],
      transitions: rightEdgePortals(4),
    }),
  },
  {
    file: "scenario16.json",
    trackId: "t17",
    def: mk({
      id: "prism_path_bm17",
      name: "Brain Melter V — Furnace",
      description: "Climb to layer 5 southeast. Four villain gates.",
      notes: ["Full rim crawl then five-layer traverse.", "Layers 2 & 4 shift."],
      start: START,
      goal: { layer: 5, row: 6, col: 6 },
      passable: [...L1, ...openLayers(2, 5)],
      movement: SHIFT_L2_L4,
      villains: [
        { id: "bm17a", layer: 1, row: 4, col: 6 },
        { id: "bm17b", layer: 2, row: 1, col: 3 },
        { id: "bm17c", layer: 3, row: 4, col: 0 },
        { id: "bm17d", layer: 4, row: 2, col: 5 },
      ],
      transitions: rightEdgePortals(5),
    }),
  },
  {
    file: "scenario17.json",
    trackId: "t18",
    def: mk({
      id: "prism_path_bm18",
      name: "Brain Melter VI — Eclipse",
      description: "Layer 5 northwest goal. Layers 2, 3 & 4 all rotate.",
      notes: ["Longest rim crawl in the mid tier.", "Layers 2–4 shift."],
      start: START,
      goal: { layer: 5, row: 0, col: 0 },
      passable: [...L1, ...openLayers(2, 5)],
      movement: SHIFT_L2_L3_L4,
      villains: [
        { id: "bm18a", layer: 1, row: 4, col: 6 },
        { id: "bm18b", layer: 2, row: 6, col: 2 },
        { id: "bm18c", layer: 3, row: 1, col: 4 },
        { id: "bm18d", layer: 4, row: 5, col: 1 },
      ],
      transitions: rightEdgePortals(5),
    }),
  },
  {
    file: "scenario18.json",
    trackId: "t19",
    def: mk({
      id: "prism_path_bm19",
      name: "Brain Melter VII — Abyss",
      description: "Push to layer 6 northeast. Five villains, four shifting layers.",
      notes: ["Survive the full portal ladder.", "Layers 2–5 shift."],
      start: START,
      goal: { layer: 6, row: 0, col: 6 },
      passable: [...L1, ...openLayers(2, 6)],
      movement: SHIFT_L2_L3_L4_L5,
      villains: [
        { id: "bm19a", layer: 1, row: 2, col: 6 },
        { id: "bm19b", layer: 2, row: 4, col: 0 },
        { id: "bm19c", layer: 3, row: 2, col: 5 },
        { id: "bm19d", layer: 4, row: 5, col: 3 },
        { id: "bm19e", layer: 5, row: 1, col: 2 },
      ],
      cardTriggers: [
        { card: "terrain", layer: 1, row: 0, col: 6 },
        { card: "shadow", layer: 4, row: 3, col: 3 },
      ],
      transitions: rightEdgePortals(6),
    }),
  },
  {
    file: "scenario19.json",
    trackId: "t20",
    def: mk({
      id: "prism_path_bm20",
      name: "Brain Melter VIII — Nightfall",
      description: "Layer 6 southwest goal after the rim crawl.",
      notes: ["Right-edge portal chain to the deep layer.", "Layers 2–5 shift."],
      start: START,
      goal: { layer: 6, row: 6, col: 0 },
      passable: [...L1, ...openLayers(2, 6)],
      movement: SHIFT_L2_L3_L4_L5,
      villains: [
        { id: "bm20a", layer: 1, row: 0, col: 6 },
        { id: "bm20b", layer: 2, row: 3, col: 5 },
        { id: "bm20c", layer: 3, row: 6, col: 4 },
        { id: "bm20d", layer: 4, row: 2, col: 1 },
        { id: "bm20e", layer: 5, row: 4, col: 5 },
      ],
      transitions: rightEdgePortals(6),
    }),
  },
  {
    file: "scenario20.json",
    trackId: "t21",
    def: mk({
      id: "prism_path_bm21",
      name: "Brain Melter IX — Night Ladder",
      description: "Layer 6 southeast summit. Six villains on the ladder.",
      notes: ["Right-edge portal chain to the top.", "Layers 2–5 shift."],
      start: START,
      goal: { layer: 6, row: 6, col: 6 },
      passable: [...L1, ...openLayers(2, 6)],
      movement: SHIFT_L2_L3_L4_L5,
      villains: [
        { id: "bm21a", layer: 1, row: 2, col: 6 },
        { id: "bm21b", layer: 2, row: 5, col: 6 },
        { id: "bm21c", layer: 3, row: 1, col: 1 },
        { id: "bm21d", layer: 4, row: 4, col: 4 },
        { id: "bm21e", layer: 5, row: 0, col: 5 },
        { id: "bm21f", layer: 5, row: 3, col: 2 },
      ],
      cardTriggers: [{ card: "shadow", layer: 1, row: 6, col: 6 }],
      transitions: rightEdgePortals(6),
    }),
  },
  {
    file: "scenario21.json",
    trackId: "t22",
    def: mk({
      id: "prism_path_bm22",
      name: "Brain Melter X — Meltdown",
      description: "Seven-layer summit at the southeast peak. Six villains, four shifting layers, final exam.",
      notes: ["The ultimate Brain Melter.", "Layers 2–5 shift."],
      start: START,
      goal: { layer: 7, row: 6, col: 6 },
      passable: [...L1, ...openLayers(2, 7)],
      movement: SHIFT_L2_L3_L4_L5,
      villains: [
        { id: "bm22a", layer: 1, row: 2, col: 6 },
        { id: "bm22b", layer: 2, row: 5, col: 6 },
        { id: "bm22c", layer: 3, row: 1, col: 1 },
        { id: "bm22d", layer: 4, row: 4, col: 4 },
        { id: "bm22e", layer: 5, row: 0, col: 5 },
        { id: "bm22f", layer: 6, row: 3, col: 2 },
      ],
      cardTriggers: [
        { card: "terrain", layer: 1, row: 6, col: 6 },
        { card: "shadow", layer: 1, row: 0, col: 6 },
        { card: "cosmic", layer: 5, row: 3, col: 3 },
      ],
      transitions: rightEdgePortals(7),
    }),
  },
];

console.log("Building Brain Melter tracks...\n");
const MIN_TARGET = 31;
const results = [];
let failed = false;

for (const { file, trackId, def } of TRACKS) {
  try {
    assertScenario(JSON.parse(JSON.stringify(def)));
    const st = newGame(def);
    const lm0 = Object.fromEntries([...Array(7)].map((_, i) => [i + 1, 0]));
    const min = computeMinMovesToGoal(st, lm0, 200);

    const goalId = `L${def.goal.layer}-R${def.goal.row}-C${def.goal.col}`;
    if (min === null || min < MIN_TARGET) {
      failed = true;
      console.log(`${trackId} | ${file} | FAIL | min=${min ?? "null"} (need >=${MIN_TARGET})`);
      continue;
    }

    writeFileSync(join(outDir, file), JSON.stringify(def, null, 2) + "\n");
    results.push({ trackId, file, min, goalId, name: def.name });
    console.log(`${trackId} | ${file} | OK | min=${min} | ${goalId}`);
  } catch (err) {
    failed = true;
    console.log(`${trackId} | ${file} | ERROR: ${err.message}`);
  }
}

if (failed) process.exit(1);

writeFileSync(join(root, "scripts/brain-melter-results.json"), JSON.stringify(results, null, 2) + "\n");
console.log("\nAll 10 written. Optimal range:", results[0].min, "–", results[results.length - 1].min);
