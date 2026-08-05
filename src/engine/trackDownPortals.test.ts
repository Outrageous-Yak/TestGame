import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { GameState, Pos, Scenario, Transition } from "./types";
import { assertScenario } from "./scenario";
import { newGame, tryMove } from "./api";
import { posId } from "./board";
import { neighborIdsSameLayer } from "./neighbors";
import { neighborSlots } from "./layout";
import { attemptMove } from "./rules";
import { restoreStateLite, snapshotStateLite } from "./snapshot";

const SCENARIO_DIR = join(process.cwd(), "public/worlds/rainbow_realm/scenarios/prism_path");

const AFFECTED_TRACKS = [
  { tid: "t1", file: "scenario.json", downDest: { layer: 2, row: 1, col: 3 } },
  { tid: "t2", file: "scenario2.json", downDest: { layer: 2, row: 0, col: 1 } },
  { tid: "t9", file: "scenario8.json", downDest: { layer: 2, row: 0, col: 1 } },
  { tid: "t10", file: "scenario9.json", downDest: { layer: 2, row: 0, col: 1 } },
  { tid: "t11", file: "scenario10.json", downDest: { layer: 2, row: 0, col: 1 } },
  { tid: "t12", file: "scenario11.json", downDest: { layer: 2, row: 0, col: 1 } },
] as const;

const STUCK_LAYERS = [3, 4, 5] as const;

function loadScenario(file: string): Scenario {
  const s = JSON.parse(readFileSync(join(SCENARIO_DIR, file), "utf8")) as Scenario;
  assertScenario(s);
  return s;
}

function posKey(p: Pos): string {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

function upTriggerOnLayer(transitions: Transition[], layer: number): Transition | undefined {
  return transitions.find((t) => t.type === "UP" && t.from.layer === layer);
}

function downOnLayer(transitions: Transition[], layer: number): Transition | undefined {
  return transitions.find((t) => t.type === "DOWN" && t.from.layer === layer);
}

function upArrivalOnLayer(transitions: Transition[], layer: number): Pos | undefined {
  const up = transitions.find((t) => t.type === "UP" && t.to.layer === layer);
  return up?.to;
}

function isGoalNeighbor(scenario: Scenario, dest: Pos): boolean {
  const missing = new Set((scenario.missing ?? []).map(posId));
  const blocked = new Set((scenario.blocked ?? []).map(posId));
  const destId = posId(dest);
  if (missing.has(destId) || blocked.has(destId)) return false;

  const slots = neighborSlots(scenario.goal.row, scenario.goal.col);
  return slots.some((s) => s.r === dest.row && s.c === dest.col);
}

function stateSignature(dto: ReturnType<typeof snapshotStateLite>): string {
  let rows = "";
  for (const entry of dto.rows.slice().sort((a, b) => a.layer - b.layer)) {
    rows += `|L${entry.layer}`;
    for (const row of entry.rows) rows += `|${row.join(",")}`;
  }
  return `${dto.playerHexId}|t=${dto.turn}${rows}`;
}

/** BFS until player is on `targetHex` or any hex on `targetLayer` when targetHex omitted. */
function reachHex(
  base: GameState,
  opts: { targetHex?: string; targetLayer?: number; maxTurns?: number }
): ReturnType<typeof snapshotStateLite> | null {
  const { targetHex, targetLayer, maxTurns = 40 } = opts;
  const startDto = snapshotStateLite(base);
  const q = [{ dto: startDto, turns: 0 }];
  const seen = new Set([stateSignature(startDto)]);
  let head = 0;

  while (head < q.length) {
    const { dto, turns } = q[head++];
    if (targetHex && dto.playerHexId === targetHex) return dto;
    if (!targetHex && targetLayer && dto.playerHexId.startsWith(`L${targetLayer}-`)) return dto;

    if (turns >= maxTurns) continue;

    const cur = restoreStateLite(base, dto);
    for (const nid of neighborIdsSameLayer(cur, cur.playerHexId)) {
      const nh = cur.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;
      const st2 = restoreStateLite(base, dto);
      if (!attemptMove(st2, nid).ok) continue;
      const dto2 = snapshotStateLite(st2);
      const sig = stateSignature(dto2);
      if (seen.has(sig)) continue;
      seen.add(sig);
      q.push({ dto: dto2, turns: turns + 1 });
    }
  }
  return null;
}

function activatePortalFrom(state: GameState, portalHex: string): ReturnType<typeof tryMove> {
  let st = state;
  if (st.playerHexId === portalHex) {
    const neighbors = neighborIdsSameLayer(st, st.playerHexId).filter((n) => n !== portalHex);
    expect(neighbors.length).toBeGreaterThan(0);
    const leave = tryMove(st, neighbors[0]!);
    expect(leave.ok).toBe(true);
    if (!leave.ok) return leave;
    st = leave.state;
  }
  return tryMove(st, portalHex);
}

describe("trap track DOWN portal layout", () => {
  for (const track of AFFECTED_TRACKS) {
    describe(track.tid, () => {
      const scenario = () => loadScenario(track.file);

      it("has unique portal FROM hex per transition", () => {
        const s = scenario();
        const fromIds = s.transitions.map((t) => posId(t.from));
        expect(new Set(fromIds).size).toBe(fromIds.length);
      });

      for (const layer of STUCK_LAYERS) {
        it(`L${layer}: DOWN portal layout is valid and distinct from UP trigger`, () => {
          const s = scenario();
          const up = upTriggerOnLayer(s.transitions, layer);
          const down = downOnLayer(s.transitions, layer);
          const arrival = upArrivalOnLayer(s.transitions, layer);

          expect(down, `L${layer} missing DOWN portal`).toBeDefined();
          if (!down) return;

          expect(down.to.layer).toBe(2);
          expect(posId(down.to)).toBe(posId(track.downDest));
          expect(isGoalNeighbor(s, down.to)).toBe(true);

          if (up) {
            expect(posId(up.from)).not.toBe(posId(down.from));
          }

          if (layer === 5) {
            expect(up, "L5 should not have an UP trigger on the same layer").toBeUndefined();
          } else {
            expect(up, `L${layer} should have UP trigger`).toBeDefined();
            if (up) {
              expect(posId(up.from)).not.toBe(posId(down.from));
            }
          }

          if (arrival && track.tid !== "t12") {
            expect(posId(arrival)).toBe(posId(down.from));
          }
        });
      }
    });
  }
});

describe("trap track DOWN portal escape (all affected tracks)", () => {
  for (const track of AFFECTED_TRACKS) {
    describe(track.tid, () => {
      const scenario = () => loadScenario(track.file);

      it("reach L5, use DOWN portal, land one move from goal, then win", () => {
        const s = scenario();
        const base = newGame(s);
        const downL5 = downOnLayer(s.transitions, 5);
        expect(downL5).toBeDefined();
        if (!downL5) return;

        const onL5 = reachHex(base, { targetLayer: 5 });
        expect(onL5, "should reach L5 during play").not.toBeNull();
        if (!onL5) return;

        const st = restoreStateLite(base, onL5);
        const portalHex = posId(downL5.from);
        const downRes = activatePortalFrom(st, portalHex);

        expect(downRes.ok).toBe(true);
        if (!downRes.ok) return;

        expect(downRes.state.playerHexId).toBe(posId(track.downDest));
        expect(isGoalNeighbor(s, track.downDest)).toBe(true);
        expect(downRes.won).toBe(false);

        const goalId = posId(s.goal);
        const neighbors = neighborIdsSameLayer(downRes.state, downRes.state.playerHexId);
        expect(neighbors, "DOWN landing must be one legal move from goal after L2 shift").toContain(goalId);

        const winRes = tryMove(downRes.state, goalId);
        expect(winRes.ok).toBe(true);
        if (!winRes.ok) return;
        expect(winRes.won).toBe(true);
      });

      for (const layer of STUCK_LAYERS) {
        it(`L${layer}: layer and DOWN portal are reachable; DOWN escape eventually wins`, () => {
          const s = scenario();
          const base = newGame(s);
          const down = downOnLayer(s.transitions, layer);
          expect(down).toBeDefined();
          if (!down) return;

          const portalHex = posId(down.from);
          const onPortal =
            reachHex(base, { targetHex: portalHex, maxTurns: 45 }) ??
            reachHex(base, { targetLayer: layer, maxTurns: 45 });

          expect(onPortal, `should reach L${layer} DOWN portal ${portalHex}`).not.toBeNull();
          if (!onPortal) return;

          const st = restoreStateLite(base, onPortal);
          const downRes = activatePortalFrom(st, portalHex);
          expect(downRes.ok).toBe(true);
          if (!downRes.ok) return;

          expect(downRes.state.playerHexId).toBe(posId(track.downDest));
          expect(isGoalNeighbor(s, track.downDest)).toBe(true);

          const won = reachHex(downRes.state, { targetHex: posId(s.goal), maxTurns: 6 });
          expect(won, "goal must be reachable within a few moves after DOWN escape").not.toBeNull();
        });
      }
    });
  }
});
