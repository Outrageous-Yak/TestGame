# Step 5C — Red Encounter Dice + Banishment

## Status

Playable Red encounter resolution loop on top of Step **5A** (foundation) and Step **5B**
(layer-entry snapshots).

**Not in scope:** player stats, lives, modifiers, rerolls, combat, Solver probability
branching, Commercial Player Shell, Green redesign.

## Encounter lifecycle

```
Land on unresolved Red/cosmic (successful move, not Goal)
  → ENCOUNTER intro (Tier + escape hint)
  → ROLL (exactly one authoritative d6)
  → animate die to that face
  → RESULT (ESCAPED | BANISHED | BANISHMENT FAILED)
  → CONTINUE commits resolution
  → resume play / show STRANDED if applicable
```

Board input stays locked for the entire encounter session.

## Dice

- One standard six-sided die: faces **1–6**
- Exactly **one** roll per encounter activation
- Random generation (`rollD6`) is separate from classification (`resolveRedEncounterRoll`)
- Tests inject forced faces; production may use `Math.random` via `rollD6`
- Dev/browser force: `window.__HEX_FORCE_D6 = 1..6`
- Animation may flicker faces but **must settle** on the pre-chosen authoritative result
- Reduced-motion: skip flicker; settle immediately on the same result

## Tier table

| Tier | Success | Banishment | Success rate |
|------|---------|------------|--------------|
| 1 | 2–6 | 1 | 5/6 |
| 2 | 3–6 | 1–2 | 4/6 |
| 3 | 4–6 | 1–3 | 3/6 |
| 4 | 5–6 | 1–4 | 2/6 |

### Legacy / missing tier

If authored `encounterTier` is absent, **runtime uses Tier 1**.

This is a resolution fallback only — import/export does **not** rewrite JSON to insert a tier.

## Success behaviour

1. Consume encounter id (`consumedEncounterIds`)
2. Clear encounter UI
3. If post-land state was STRANDED → show STRANDED
4. Else unlock board and continue

No snapshot restore. Move count unchanged by the roll/Continue.

## Banishment behaviour

**BANISHMENT = restore the most recent layer-entry snapshot for the encounter’s layer.**

Order on Continue after a failed roll:

1. **Consume** encounter id (so restore preserves spent state)
2. `restoreLayerEntrySnapshot(state, layer)`
3. Recompute Goal / STRANDED from the **restored** world
4. Clear UI / show terminal / unlock

### Snapshot chosen

- Layer = authoritative encounter layer at trigger time (`CardTrigger.layer` / player layer)
- Uses Step 5B **newest** entry snapshot for that layer (re-entry replacement)
- Initial layer (L1 start) already has a snapshot — initial-layer Red can banish

### Restored

- Player position
- Row / dynamic board tables
- Engine reveal flags
- Visible / movement-active layers (per 5B)

### Preserved (not rewound)

- `turn` / move count (banishment costs **0** additional moves; landing move already counted)
- `moveHistory`
- `consumedEncounterIds`
- Attempt timer architecture (none on GameState — do nothing)
- Snapshot map itself

### Not a portal move

Restore onto a portal hex does **not** auto-fire the portal.
Subsequent legitimate portal moves still work.

## Consume timing

Encounter is consumed when resolution is **committed** (Continue after result),
**before** snapshot restore on banishment.

BANISHMENT must **never** un-consume the encounter.
Revisiting the same id in the same attempt must not retrigger.

## Restore failure policy

If `no_snapshot` / `invalid_snapshot` / `internal_error`:

- Live GameState is left **unchanged** (5B guarantee)
- Encounter is still **consumed** (already marked before restore)
- UI shows **BANISHMENT FAILED** (contained — no Start reload, no silent success)
- Continue closes the panel; deferred STRANDED from the pre-banish land may still apply

## Goal / STRANDED ordering

- Goal priority: landing on Goal never opens Red
- While Red panel is open: do not show STRANDED underneath
- After **success** Continue: evaluate / show deferred STRANDED if needed
- After **banishment** Continue: recompute terminal from restored world (ignore pre-banish stranded)

## Retry / Replay / Exit

`newGame` / Try Again / Replay / exit+re-enter:

- Fresh `consumedEncounterIds`
- Fresh layer-entry snapshots
- No pending dice/roll/result UI state
- In-flight dice animation cancelled (generation bump)

## Track Planner

- Optional Red Tier 1–4 authoring preserved (Step 5A)
- Legacy Red without tier remains valid
- Audit still flags invalid tiers
- Layer Playtest unchanged as a second engine; may inspect snapshots read-only

## Solver / analysis

- **Unchanged** — no probabilistic Red branching
- `solverStateKey` does not include dice / encounter resolution UI
- `layerEntrySnapshots` remain omitted from analysis DTOs
- Sevenfold resource safety expectations unchanged

## Persistence

Dice rolls, banishments, consumed ids, and layer snapshots are **attempt-local**.

No new localStorage schema. No progression / best-score writes from banishment.

## Deferred

- Modifiers, rerolls, advantage, stats, equipment
- Multi-dice, combat, encounter text libraries
- Solver Monte Carlo / probability analysis
- Player-facing Restore button (banishment is automatic on failed roll only)
- Commercial Player Shell

## Key modules

| Module | Role |
|--------|------|
| `src/engine/encounters/redEncounterDice.ts` | Tier table + `resolveRedEncounterRoll` + `rollD6` |
| `src/engine/encounters/redEncounterBanishment.ts` | `applyRedEncounterBanishment` |
| `src/engine/encounters/redEncounterResolution.ts` | Lock / commit helpers |
| `src/ui/game/DiceCube.tsx` + `useDiceRoll.ts` | Shared dice presentation |
| `src/ui/game/RedEncounterPanel.tsx` | Multi-phase encounter UI |
| `src/ui/game/GameController.tsx` | Orchestration |
