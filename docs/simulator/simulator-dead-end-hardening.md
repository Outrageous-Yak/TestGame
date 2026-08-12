# Stage 1B — Simulator dead-end hardening

Builds on `docs/simulator/simulator-dead-end-diagnosis.md`.

## Fixes

1. **`analysisSafe` on lite restores** (`snapshot.ts` / `GameState`)
   - `restoreStateLite` marks branches `analysisSafe: true`.
   - `revealHex` no-ops when `analysisSafe`, so shared hex maps cannot cross-contaminate BFS branches.

2. **Legal-move helper** (`src/engine/legalMoves.ts`)
   - `listLegalSuccessfulMoveTargets` / `hasLegalSuccessfulMove` / `playerOnGoal` / `isAuthoritativeStranded`
   - Probes via `attemptMove` on lite restores — same rules as Solver / runtime.

3. **Simulator outcome**
   - New `internal_error` distinct from `unsolvable` / `search_limit` / `structural_error`.
   - Unexpected throws in `computeOptimalSolution` are caught in `runSimulator` and surfaced safely.
   - UI label: `SOLVER: INTERNAL ERROR`.

## Semantics preserved

| Case | Behaviour |
|------|-----------|
| Zero-outgoing leaf | Exhaustive → unsolvable (not a crash) |
| Search ceiling | `search_limit` (not unsolvable) |
| Goal with 0 exits | SUCCESS / solvable |
| Dead-end branch + alternate | Still finds Goal |
| Optimality | Static 2-move fixture unchanged |

## Tests

- `src/engine/simulatorDeadEnd.hardening.test.ts`
- Existing `simulatorSolver.test.ts` / diagnosis suite

## Explicitly deferred (Step 3)

Aligning Stranding Analysis / Audit labels with **runtime STRANDED** wording is not part of 1B.
