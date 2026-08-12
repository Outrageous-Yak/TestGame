# Stage 1A — Simulator dead-end diagnosis

Base main: `c924e0434df2f13fbd498ea5a3904149a86ef235`

## Symptom (reported)

On a difficult 7-layer puzzle, manual play reached states where:

- the player occupied a **present** hex;
- row movement / isolation left **zero legal successful destinations**;
- the Simulator was reported to **crash** or fail to understand the state.

Product insight: **valid player state ≠ at least one legal outgoing move**.

## Authoritative architecture (current)

| Concern | Authority |
|---------|-----------|
| Move + portal + endTurn | `attemptMove` / `attemptMoveToSlot` (`rules.ts`, `moveAttempt.ts`) |
| Neighbours | `neighborIdsSameLayer` (`neighbors.ts`) + `neighborSlots` (`layout.ts`) |
| Row shift | `endTurn` → `applyLayerRowMovement` |
| BFS solver | `computeOptimalSolution` + `solverStateKey` (`trackAnalysis.ts`) |
| Lite clone | `snapshotStateLite` / `restoreStateLite` (`snapshot.ts`) |
| Simulator UI | `runSimulator` + `SimulatorView` |
| Stranding analysis | `analyzeStranding` (`strandingAnalysis.ts`) — design tool, not player terminal |

## Reproduction (this branch)

Synthetic fixtures in `src/engine/simulatorDeadEnd.diagnosis.test.ts`:

| Case | Result on current main |
|------|------------------------|
| Isolated present start (0 successful moves) | **No throw**; `minMoves === null`; exhaustive |
| Disconnected start/goal islands | **No throw**; unsolvable |
| Thin corridor + row LEFT | **No throw**; solver/stranding tolerate |
| Goal with 0 outgoing after arrival | **Solvable** (Goal priority) |
| Dead-end spur + alternate path | Still finds Goal |
| `maxNodes = 1` | `searchAborted` (not conflated as silent crash) |
| Unreachable portal | **No throw** |
| Shared `hexesById` via lite restore | Confirmed: `revealHex` mutates shared hex objects |
| Runtime vs solver keys on short moving-row path | **Parity PASS** |
| All Forgotten Citadel production JSON tracks | **No throw** via `hardTrackProbe.test.ts` |

**Exact exception crash on current main:** **NOT reproduced** (engine returns structured unsolvable / search_limit).

## Root-cause classification

1. **Zero-outgoing search leaf** — Engine already treats empty successful-branch sets as BFS leaves (no assert that neighbours exist). **Not a current throw site.**
2. **Missing product semantics** — Runtime gameplay has **no STRANDED terminal**; player can remain on an isolated present hex and keep wrong-tapping. That matches the design gap Stage 2 must close.
3. **Mutation smell** — `restoreStateLite` reuses `base.hexesById` by reference; `revealHex` / guaranteed-up reveal mutate shared hexes. Does **not** currently change move legality, but is unsafe if analysis ever depends on per-branch hex flags.
4. **Historical “crash”** — Likely browser hang / older code / pathological draft UI, not a reproducible throw on merged main. Hardening still required so isolation cannot become an INTERNAL ERROR or UI blow-up.

## State key

`solverStateKey` = `playerHexId` + sorted `movementActiveLayers` + per-row first-hex rotation proxy.  
Short moving-row parity probe: **PASS**. No evidence that distinct futures collapse for the fixtures tested.

## Mutation

Rows / active layers / turn / player id are cloned per lite DTO. Hex map is **shared**. Documented; Stage 1B should isolate solver restores.

## Proposed minimal 1B fix

1. Isolate lite restores used by the solver (clone hex records OR equivalent) so branch search cannot share mutable hex flags.
2. Keep / clarify outcome semantics: solvable / unsolvable / search_limit / structural_error (+ catch unexpected → distinct internal/structural error, never silent crash).
3. Add explicit regression suite for isolation / disconnected / dead-end branch / search-limit / Goal-with-zero-exit.
4. Export a small pure helper for **legal successful destinations** (same `attemptMove` rules) for Stage 2 STRANDED — no second connectivity model.

## Gate

- Failure class reproduced: **YES**
- Exact throw on current main: **NO**
- Root cause sufficiently established for hardening: **YES**
- Safe to proceed to 1B: **YES**
