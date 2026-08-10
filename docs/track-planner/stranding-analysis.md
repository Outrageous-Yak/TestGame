# Track Planner — Stranding Analysis

Answers: **from which legally reachable states can the player no longer reach Goal?**

Distinct from the Simulator/Solver question: *does at least one optimal Start→Goal path exist?*

## Entry points

| Piece | Location |
|-------|----------|
| Engine | `analyzeStranding` (`src/engine/strandingAnalysis.ts`) |
| Planner | `runStrandingAnalysis(track)` |
| UI | Audit → **STRANDING / REACHABILITY** → Run Stranding Analysis |

Structural Audit GREEN/AMBER/RED is unchanged. Stranding is a separate section.

## Method

1. **Forward graph** — BFS of successful `attemptMove` actions from Start (same legality as the optimal solver; wrong taps excluded).
2. **Reverse Goal reachability** — mark all states that can reach a Goal-occupying state by walking recorded edges backward.
3. **Stranded** = reachable − Goal-reaching (Goal-occupying states are safe/completed).

Uses `solverStateKey` — no second state model.

## Classifications

### State

| Class | Meaning |
|-------|---------|
| SAFE / Goal-reaching | Goal remains reachable |
| STRANDED | Goal unreachable; search completed |
| UNKNOWN | search limit — never reported as stranded |

### Hex aggregation

| Class | Meaning |
|-------|---------|
| SAFE | all reachable states on this hex still reach Goal |
| RISKY | some safe, some stranded (e.g. different row phases) |
| STRANDED | all reachable states on this hex are stranded |
| UNKNOWN | incomplete under search limit |

### Track outcome

| Outcome | Severity | Meaning |
|---------|----------|---------|
| `safe` | GREEN | no stranded states |
| `optional_stranding` | AMBER | Start can reach Goal; bad legal choices exist |
| `unsolvable` | RED | Start cannot reach Goal |
| `search_limit` | UNKNOWN | ceiling hit — do not claim safe or unsolvable |
| `structural_error` | RED | missing Start/Goal — CANNOT ANALYZE |

**Optional vs unavoidable:** optional = safe path exists + stranded states; unavoidable failure = Start cannot reach Goal under completed search.

## Assumptions

Same as `docs/track-planner/simulator-solver.md`:

- Wrong taps excluded
- Cards/encounters not in state
- Visibility presentation-only
- Read-only (no draft / progression / best-score / campaign writes)

## Limits

Default `maxTurns=80`, `maxNodes=400000`. Metrics: reachable / safe / stranded counts, risky positions, runtime.

## Example bad path

One shallow Start→stranded route (move targets) for designer reproduction.

## Generator readiness

Stranding signals (optional dead-ends, portal dumps, risky hexes) are available for a future Generator to score or reject tracks. **Generator is not implemented in this step.**

## Next step

Generator (optional) — use stranding + solver metrics when authoring automated tracks.
