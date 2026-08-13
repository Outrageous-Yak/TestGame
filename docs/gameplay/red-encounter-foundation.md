# Step 5A — Red Encounter Foundation

## Status

Foundation only. **No dice. No banishment.** Layer-entry snapshots are Step **5B**
(see `docs/gameplay/layer-entry-snapshot-foundation.md`) and are **not** attached
to Encounter Continue.

## Terminology

| Layer | Term |
|-------|------|
| Planner authoring | **RED — Encounter** (`CardFeature` with `cardType: "RED"`) |
| Runtime card key | `cosmic` |
| Domain | **Encounter** (one concept — not parallel Villain/Enemy/RedCard types) |

Existing GREEN/`risk` dice encounters and hex `villains` triggers remain separate systems.

## Identity

- Prefer stable authored **feature id** (`CardFeature.id` → `CardTrigger.id`).
- Legacy production JSON `{ "card": "cosmic", layer, row, col }` without `id` receives a deterministic fallback at parse time:
  - `legacy_card_L{layer}_R{row}_C{col}`
- Layer transforms **must preserve** `id` while remapping coordinates (`transformExtrasOnLayer` spreads the trigger object).

Do **not** key consumption only by ephemeral display slots.

## Authored data

On `CardFeature` / `CardTrigger`:

- `id` (required at runtime after parse)
- optional `encounterTier?: 1 | 2 | 3 | 4` — **forward-compatible only**
- No silent tier default for resolution. Unset means “not configured for 5C yet.”

Serialization:

- Export includes `id` (+ optional tier) on `cardTriggers`
- Full planner metadata remains in `_plannerMeta.authoredFeatures`
- Legacy tracks load without migration

## Attempt-local state

`GameState.consumedEncounterIds: Set<string>`

- Initialized empty in `newGame` / `buildInitialState`
- Copied on full snapshot restore; **fresh Set** on lite restore (no shared mutation)
- **Not** included in solver lite DTO / `solverStateKey`
- **Not** persisted to localStorage (no `hexgame-encounters` schema)

## Lifecycle (authoritative)

1. Player completes a **successful** move (`attemptMoveToSlot` → `MOVED`).
2. Portal resolution (if any) already applied — player is on the **final** hex.
3. Goal check: if landed on Goal → **Goal wins**; no Red encounter activation.
4. Else if final hex has unresolved Red/`cosmic` encounter → activate foundation panel; **board input locked**.
5. User presses **Continue** → mark encounter **consumed** → clear panel → resume.
6. If the post-move state was STRANDED, stranded UI is deferred until after Continue (encounter is not terminal).
7. Revisiting a consumed encounter in the **same attempt** does **not** retrigger.

Consumption does **not** occur from: visibility, rendering, wrong taps, Solver inspection, or merely approaching a hex.

## One-shot + reset

| Event | Consumed state |
|-------|----------------|
| Continue on encounter | Mark that encounter id consumed |
| Try Again / newGame / exit+re-enter / replay after win | **Fresh empty set** |
| Persistent storage | **Never** |

## Portal / row movement

- Trigger uses final authoritative player hex after portal.
- Row movement does not redefine encounter identity; feature id stays stable while coords may transform at attempt start.

## Visibility

- Consumption state must not reveal hidden information.
- Spent visual is a subtle grayscale/opacity on an **already renderable** card badge — not a reveal path for concealed features.
- Step 5A does not redesign visibility modes.

## Track Planner

- Features inspector: RED — Encounter (+ optional Tier control)
- Audit: invalid tier; duplicate feature ids
- Occupancy: cards remain single-slot (no stacking with Start/Goal/other cards)
- Simulator / Stranding / Solver: **unchanged** — encounter effects are **not simulated**

## Progression / storage

Encounter activation/consumption must not:

- complete a track
- unlock progression
- write best moves/time

## Future hooks (not implemented)

- **5B** — layer-entry snapshots / restoration primitive (does **not** rewind `consumedEncounterIds`; not wired to Continue)
- **5C** — dice resolution / V1–V4 punishments / banishment via extending `EncounterResolution` beyond `{ kind: "acknowledge" }`
