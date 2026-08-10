# Track Planner — Full Simulator + Solver

Read-only analysis: can Start reach Goal optimally across the full 7-layer Track?

**Not in this step:** exhaustive stranded-state analysis, Generator, draft mutation.

## Entry points

| Piece | Location |
|-------|----------|
| UI | `SimulatorView` → **Run Simulator** |
| Orchestrator | `runSimulator(track)` |
| Engine BFS | `computeOptimalSolution` |
| State key | `solverStateKey` |

## Algorithm

Uniform-cost **BFS** over successful production moves (`attemptMove` → portal + `endTurn` row movement).

- Explores **valid adjacent taps only**.
- Wrong/failed taps are **excluded** from search: in production they consume a turn without shifting rows, but they do not help shortest-path reachability and would inflate the graph.
- Iterative queue (no recursive DFS).

### Move counting

`optimalMoveCount` = number of successful player taps.

- Automatic portal teleport after landing is **not** an extra move.
- End-turn row shifts are **not** extra moves.

## Solver state key

```
p=<playerHexId>|active=<sorted active layers>|L<n>|<row0[0]>|…|L<m>|…
```

Includes:

- player logical hex
- `movementActiveLayers`
- per-row rotation proxy (first hex id in each row)

Excludes:

- turn counter (cosmetic for BFS identity)
- visibility / fog (presentation-only; does not affect `attemptMove` legality)
- cards / encounters (not checked in engine move path today)

Two states with the **same player hex** but **different row rotations** are distinct.

## Canonical optimal path

When multiple goals / parents exist at the same depth:

1. Neighbors expanded in **lexicographic hex-id order**
2. **First BFS discovery** wins (and among equal-depth goal signatures, lexicographically smaller signature preferred)

Re-runs are deterministic.

## Equal optimal paths

`alternativeOptimalCount` = total optimal paths (capped at 1000).  
`hasMultipleOptimalPaths` = count > 1.  
UI shows YES/NO; one canonical path is displayed.

## Outcomes (solver, not Audit)

| Outcome | Meaning |
|---------|---------|
| `SOLVER: SOLVABLE` | Goal reachable; min moves + path |
| `SOLVER: NO SOLUTION FOUND` | Exhaustive search finished; unreachable |
| `SOLVER: SEARCH LIMIT` | Node/turn ceiling hit before proof — **not** unsolvable |
| `SOLVER: STRUCTURAL ERROR` | Missing/invalid Start or Goal (graceful) |

Do not confuse with Track Audit GREEN/RED.

## Portals & rows

Uses production transition + `applyLayerRowMovement` via `attemptMove` / `endTurn`. Supports UP/DOWN, chained portals, Layer 1 movement, amount > 1, multiple moving rows.

## Cards / encounters

Preserved on the track; **not** part of solver state. RED encounters do not alter board reachability in the engine today.

## Visibility

Presentation-only for legality; excluded from the state key.

## Draft isolation

Simulation clones engine state only. Does not dirty/save the planner draft, progression, best scores, or campaign storage.

Stale results clear when Board/Features fingerprint changes (`trackSolverFingerprint`).

## Limits

Default: `maxTurns=80`, `maxNodes=400000`. Stats expose `visitedStates` and `runtimeMs`.

## Next step

**Stranding analysis** — reachable states from which Goal becomes impossible. Not implemented here.
