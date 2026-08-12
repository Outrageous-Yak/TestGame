# Runtime STRANDED terminal state

Player-facing rule after Stage 1B simulator hardening.

## Definition

After a turn has **fully resolved** (successful `attemptMoveToSlot` / encounter move already includes portal + `endTurn` row movement), or after track **initial settle**:

```
if playerOnGoal → SUCCESS
else if zero legal successful destinations → STRANDED
else → continue
```

Authoritative helper: `evaluateAttemptTerminal` (`src/engine/attemptTerminal.ts`) using `listLegalSuccessfulMoveTargets` (`legalMoves.ts` → `attemptMove` probes).

## Timing

- Checked **after** move+portal+row resolution (engine already applied these before UI reads the state).
- Checked once after `startScenario` init.
- **Not** checked on intermediate animation frames.
- Wrong taps do **not** escape STRANDED; board input locks while the terminal overlay is active.

## Presentation

- Red failure dialog in the same family as Goal Achieved (`strandedScene*` in `app.css`).
- Title: **Stranded**
- Copy: **No paths remain.**
- Actions: **Try Again** (fresh restart via `startScenario`) · **Exit** (`onGoHome` / Map flow).

## Non-goals (this PR)

- No rewind / WAIT / automatic restart.
- No progression completion, best-score write, or unlock on STRANDED.
- No Invisible wrong-tap exception.
- No Solver / Stranding Analysis / Audit label alignment (**Step 3**).

## Tests

`src/engine/runtimeStranded.test.ts`
