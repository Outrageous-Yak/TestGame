# Simulator hardening + Runtime STRANDED (Stages 1A → 1B → 2)

Base main: `c924e0434df2f13fbd498ea5a3904149a86ef235`

## 1A — Diagnosis

See `docs/simulator/simulator-dead-end-diagnosis.md`.

- Zero-outgoing / isolation failure class reproduced with fixtures + all FC production tracks.
- Current main: **no throw** (structured unsolvable); shared hex mutation smell documented.
- Runtime/Solver key parity on short moving-row path: PASS.

## 1B — Hardening

See `docs/simulator/simulator-dead-end-hardening.md`.

- `analysisSafe` lite restores; `revealHex` no-op in analysis.
- `legalMoves.ts` helpers shared with runtime.
- `internal_error` Simulator outcome distinct from NO SOLUTION.
- Regression suite: isolation, disconnected, dead-end+alternate, search limit, Goal-with-zero-exit, optimality.

## 2 — Runtime STRANDED

See `docs/gameplay/runtime-stranded.md`.

- `evaluateAttemptTerminal` after full turn / initial settle.
- Red Goal-family overlay: Try Again / Exit.
- No rewind, WAIT, completion, or best-score writes.

## Combined architecture

```
attemptMove (authoritative)
    ↓
legal successful destinations (legalMoves.ts)
    ↓
┌───────────────────┬────────────────────────┐
│ Simulator BFS     │ Runtime GameController │
│ (analysisSafe)    │ evaluateAttemptTerminal│
└───────────────────┴────────────────────────┘
```

## Deferred — Step 3

Solver / Stranding Analysis / Audit **label alignment** with runtime STRANDED wording.

## Explicitly not in this PR

Red encounters, dice, banishment, Generator, puzzle JSON edits, visibility rule changes, PR #98 visual redesign.
