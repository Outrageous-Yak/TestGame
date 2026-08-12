# Step 3 — Solver / Stranding Analysis / Audit alignment

Base main after PR #99: `f13bc2105dc1840c4d0736c7a6acbe00a4658f21`

## Authoritative runtime STRANDED (reused, not reimplemented)

After a **fully resolved** turn (successful `attemptMove` including portal + `endTurn`), or after initial settle:

1. If `playerOnGoal` → **SUCCESS** (Goal Complete)
2. Else if zero **legal successful** destinations (`listLegalSuccessfulMoveTargets`) → **STRANDED**
3. Else → play continues

Helpers: `legalMoves.ts`, `evaluateAttemptTerminal` (`attemptTerminal.ts`).

Wrong taps are **excluded** from analysis graphs.

## Three distinct concepts

| Concept | Meaning |
|---------|---------|
| **Runtime STRANDED state** | Non-Goal + zero legal successful exits **now** |
| **Stranding-possible track** | Solvable + at least one reachable runtime STRANDED state |
| **Unsolvable track** | No Start→Goal route under successful-move model |

Goal-unreachable states that still have legal moves are **doomed live** — not runtime STRANDED.

## Solver alignment

- **Goal** → terminal success branch (no expansion)
- **Runtime STRANDED** → terminal failed branch (no expansion)
- **LIVE** → expand successful legal moves only
- No WAIT / PASS / wrong-tap / rewind escapes
- Stranded branches do not contribute to `minMoves`, optimal path, or solution replay
- Shorter route into STRANDED never beats longer Goal route

## Stranding Analysis

Forward BFS + `classifyAuthoritativeState` (`goal` | `stranded` | `live`).

- `strandedKeys` = runtime-authoritative STRANDED states only
- Reverse Goal BFS → `canReachGoal` for LIVE classification
- `doomedLiveStateCount` = LIVE states with moves but Goal unreachable
- Track outcomes: `safe` | `optional_stranding` | `unsolvable` | `search_limit` | `structural_error`

### Hex classes

- **safe** — can reach Goal from all phases on hex; no runtime stranded phases
- **risky** — mix of Goal-reaching and stranded/doomed phases, or safe + stranded on same hex
- **stranded** — only runtime stranded / doomed phases on hex

## Audit severity mapping

| Stranding outcome | Severity | Copy (conceptual) |
|-------------------|----------|-------------------|
| `safe` | GREEN | No runtime stranded states |
| `optional_stranding` | AMBER | Stranding possible; Goal route remains |
| `unsolvable` | RED | No route reaches Goal |
| `search_limit` | UNKNOWN | Analysis incomplete |
| `structural_error` | RED | Cannot analyze |

Optional stranding is **AMBER** (intentional design), not automatic RED rejection.

## Simulator

`runSimulator` runs aligned stranding analysis and surfaces:

- `strandingOutcome` / `strandingSummaryLabel`
- `summary.strandedStateCount` (runtime stranded states)
- Solvable + optional stranding is **not** labeled unsolvable

Outcomes remain distinct: `solvable` | `unsolvable` | `search_limit` | `structural_error` | `internal_error`

## Example bad path

Legal successful moves only; ends at runtime STRANDED state; move count excludes STRANDED detection itself.

## State key

Reuses `solverStateKey` (player + active layers + row rotation proxy). Same coordinate + different row phase → different keys when futures differ.

## Excluded from Step 3

- Visibility modes (presentation only unless movement rules change)
- Cards / Red encounters / dice / banishment / layer-entry punishment snapshots
- Player-facing stranding warnings in commercial gameplay

## Tests

- `src/studio/trackPlanner/step3StrandedAlignment.test.ts` — matrix TEST 1–15
- `src/studio/trackPlanner/strandingAnalysis.test.ts` — regression
- `src/engine/runtimeStranded.test.ts` — runtime unchanged

## Deferred

Red Encounter foundation (Step 5A+).
