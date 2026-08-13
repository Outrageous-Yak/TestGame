# Simulator resource safety

## Symptom (exact track)

Author imports **The Sevenfold Labyrinth** (`track_msq1mooe_erucx`) into Track Planner, opens **Simulator → Run Simulator**, and the app appears to vanish back to the **Start** screen.

This is **not** a structured `UNSOLVABLE` / `SEARCH LIMIT` / `INTERNAL ERROR` result. The Simulator must remain mounted for any authored track.

Permanent exact fixture (not production content):

`src/studio/trackPlanner/fixtures/sevenfoldLabyrinth.json`

## Diagnosis (before fix)

Measured on main `0495d7a` with the exact embedded JSON:

| Phase | Result |
|-------|--------|
| Import / `scenarioJsonToTrack` | OK |
| **`validateTrack` (hidden)** | Called `getMinMovesToGoal` (up to **400k** nodes) **and** unbounded `layersReachableFromStart` — **primary OOM / tab-kill path** |
| Solver without alt-path count (~100k) | Finds Goal in **~63k nodes / ~5–6 s** (`minMoves = 49`) if reached |
| Solver with `countAlternativePaths: true` | Completes but **~27 s / multi-GB** |
| Stranding at **400 000** nodes | Additional **heap OOM** if validation somehow survived |

Root cause:

1. **Hidden pre-search in `validateTrack`** — Simulator ran a full unbounded reachability Solver *before* `computeOptimalSolution`, which alone could OOM Sevenfold and remount the SPA (looks like Start).
2. **Double unbounded graph search** after that — `computeOptimalSolution(..., 400000)` then `analyzeStranding(..., 400000)`.
3. **Main-thread sync BFS** behind `setTimeout(0)` still freezes React once started.
4. No Cancel / concurrent-run protection / local Simulator containment.

Navigation fallbacks (`onBack` → Start) were **not** the primary trigger; **OOM / tab death during validation** was.

## After fix

- Simulator calls `validateTrack({ structuralOnly: true })` — **no pre-Solver BFS**.
- Full `validateTrack` reachability helpers are **node-capped** (default 25 000).
- Central budgets: `src/studio/trackPlanner/simulation/analysisBudget.ts`

Default Simulator budget (browser-safe):

- Solver nodes ≤ **25 000**
- Stranding nodes ≤ **8 000**
- Shared total nodes ≤ **30 000**
- Total wall clock ≤ **8 000 ms**
- Frontier ≤ **12 000**
- Alternative-path counting skipped/capped on huge searches

`runSimulator` allocates Solver first, then Stranding with **remaining** budget. If Stranding cannot run safely:

- keep `SOLVER: SOLVABLE` when proven
- show `Stranding: Unknown (analysis limit)`
- **never** claim `Stranding: None found`

Resource exhaustion → `SEARCH LIMIT` / Stranding `UNKNOWN`, never false `UNSOLVABLE` / `SAFE`.

Exact Sevenfold under defaults: structured **`SOLVER: SEARCH LIMIT`** + **`Stranding: Unknown (analysis limit)`** in ~2 s without OOM.

## Architecture

| Piece | Role |
|-------|------|
| `analysisBudget.ts` | Single source of ceilings |
| `trackAnalysis.ts` / `strandingAnalysis.ts` | Time / frontier / cancel limits |
| `runSimulator.ts` | Shared total budget policy |
| `simulatorWorker.ts` + `startSimulatorRun.ts` | Off-main-thread Worker (sync fallback in tests) |
| `SimulatorView.tsx` | Cancel, single active run, stale fingerprint/runId guards |
| `SimulatorErrorBoundary.tsx` | Local recoverable panel — no Start navigation |

Production gameplay does **not** depend on the Worker.

## Cancellation

- **Cancel** stops analysis; does not navigate; leaves Simulator mounted.
- Cancel is **not** `UNSOLVABLE`.
- Leaving Simulator / changing track cancels in-flight work; stale results are ignored.

## Stress test

`src/studio/trackPlanner/simulatorResourceSafety.test.ts` uses the exact Sevenfold JSON with `CI_STRESS_BUDGET` to prove termination + structured `SEARCH LIMIT` without solving the whole track in CI.

## Limitations

- Default budgets may return `SEARCH LIMIT` on extremely large dynamic state spaces even when a
  mathematical solution exists (The Sevenfold Labyrinth is one such authored stress case — measured
  solution needs ~63k solver nodes / multi-GB peak if uncapped).
- Worker cancel is cooperative (`isCancelled` + `worker.terminate()`); a single BFS step still runs
  to completion.
- Audit stranding uses the same Stranding node/time ceilings to avoid a second OOM path.
- Raising budgets is a deliberate product decision; do not raise them without measuring peak heap
  on Sevenfold-class tracks.
