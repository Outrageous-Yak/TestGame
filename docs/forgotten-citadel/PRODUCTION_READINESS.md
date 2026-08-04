# Forgotten Citadel — Production Readiness Review

Phase 2 engineering audit for PR #33. This document answers whether Forgotten Citadel is production-ready **beyond solvability**.

---

## 10. Production Recommendation

```
NOT READY
```

### Remaining issues (must resolve before merge)

1. **Elegance / multiple optimal solutions** — Shift-aware BFS finds many equally-short routes on most tracks (often 20–1000). Design target was a single elegant solution; current boards allow numerous optimal paths. Tracks affected: fc_t01, fc_t04–fc_t10 (see PRODUCTION_AUDIT.md).
2. **Validator gaps** — `trackValidator.ts` does not detect soft locks, dead-end gameplay, blocked waste-turn branches, or portal loops (see §1). Production gate relies on `trackAnalysis.ts` for replay and originality.
3. **Gameplay audit** — Several tracks score high on movement length vs mechanic depth (especially fc_t10 at 30 moves). Portal-heavy rim ascents were redesigned but central-column t10 still has long optimal paths.
4. **Manual playthrough** — No human QA pass recorded in CI.

### What passed

- All 10 tracks solvable with deterministic replay
- Geometry/portal/route originality gate ≤35% vs Prism Path (after redesign)
- No engine code changes
- 149 automated tests pass

---

## 1. Validator Audit (`trackValidator.ts`)

Evidence: source review + `trackAnalysis.ts` extensions.

| Check | Status | Evidence |
|-------|--------|----------|
| JSON schema validation | **YES** | `assertScenario()` in `validateTrack()` |
| Coordinate bounds | **YES** | `validateCoords()` + `assertScenario` |
| Missing hex validation | **PARTIAL** | Bounds + duplicate missing entries; not checked against start/goal overlap beyond assertScenario |
| Blocked hex validation | **PARTIAL** | Bounds + duplicates; solver skips blocked targets entirely |
| Portal source validation | **YES** | Bounds, unique FROM, not on missing/blocked (`assertScenario`) |
| Portal destination validation | **YES** | Bounds, not on missing/blocked |
| Layer bounds | **YES** | `layers === 7`, per-hex row/col bounds |
| Start validation | **YES** | Bounds, not missing/blocked |
| Goal validation | **YES** | Bounds, not missing/blocked |
| Card trigger validation | **YES** | Bounds in `validateCoords` |
| Villain validation | **PARTIAL** | Bounds when `col` present; row-only triggers validated loosely |
| Layer reachability | **PARTIAL** | BFS from start (`layersReachableFromStart`); warning only |
| Portal reachability | **NO** | Does not verify every portal FROM is reachable |
| Shift-aware movement | **NO** in validator | **YES** in `computeMinMovesToGoal` / `trackAnalysis` |
| Dynamic row movement | **NO** in validator | **YES** in solver via `attemptMove` → `endTurn` → `applyShift` |
| Portal transitions | **PARTIAL** | Schema only; behavior tested via solver |
| UP portal behaviour | **PARTIAL** | Via `attemptMove` in analysis, not validator |
| DOWN portal behaviour | **PARTIAL** | Same |
| Multiple layer traversal | **PARTIAL** | Layer reachability BFS |
| Cyclic state handling | **NO** | No explicit cycle detection in validator |
| Infinite-loop detection | **NO** | Solver caps at `maxTurns` / `MAX_NODES` |
| Soft-lock detection | **NO** | Not implemented |
| Dead-end detection | **NO** | Not implemented |
| Shortcut detection | **PARTIAL** | Only vs provided intended path hex list |
| Multiple-solution detection | **NO** in validator | **YES** in `trackAnalysis.countOptimalPaths` |
| Minimum solution calculation | **PARTIAL** | `getMinMovesToGoal` in validateTrack |
| Maximum solution calculation | **NO** | Not implemented |
| Geometry similarity check | **YES** | `geometryFingerprint` + reference set |
| Duplicate track detection | **YES** | Exact fingerprint match → error |

**Conclusion:** `trackValidator.ts` is a **schema + solvability smoke test**. Production-grade gates live in `trackAnalysis.ts` + `trackProductionAudit.test.ts`.

---

## 2. Solver Engineering (`computeMinMovesToGoal`)

Located in `src/engine/reachabilityOptimal.ts`. `trackAnalysis.computeOptimalSolution` extends it with path reconstruction and replay.

### State representation

Immutable base `GameState` holds scenario, hex map, transition map. Mutable simulation uses `GameStateLiteDTO`:

- `playerHexId` — current player position
- `turn` — turn counter (increments after each move via `endTurn`)
- `rows` — per-layer row arrays of hex IDs (mutate when layers shift)
- `visibleLayers`, `lastGuaranteedUpId`, `lastGuaranteedUpTurn`

Hex metadata (missing, blocked, goal) is **not** copied per node; read from base `hexesById`.

### Visited-state key

```text
p=<playerHexId>|t=<turn>|L1|<row0>|<row1>|…|L2|…
```

Row order and hex ID order within each row are included. Identical player position on different row rotations is a **different state**.

### Row-shift state

After each legal move, `endTurn` runs `applyShift` on every layer with a non-`NONE` movement pattern. `SEVEN_LEFT_SIX_RIGHT`: 7-wide rows shift left, 6-wide rows shift right. This changes adjacency for subsequent moves.

### Layer state

Player layer changes only via portal transitions inside `attemptMove`. Visible layers update via `enterLayer` on portal dest.

### Portal handling

On stepping onto `targetId`, if `transitionsByFromId` has an entry and destination is playable, player teleports to `to`, layer visibility updates, then `endTurn` runs. UP and DOWN use the same code path.

### Queue expansion

BFS queue of `{ dto, turns }`. For each state, enumerate `neighborIdsSameLayer` (engine layout adjacency). Skip missing/blocked neighbors. Call `attemptMove` on playable neighbors. Successful moves enqueue new DTO if signature unseen and depth `< maxTurns`.

**Note:** Blocked hexes as waste-turn moves are **not** expanded (game allows them; solver does not).

### Termination

- Success: `playerHexId === goalId` → return turn count
- Failure: queue exhausted or `explored >= MAX_NODES` (400000) or depth ≥ `maxTurns` (80) → `null`

---

## 3. Replay Capability

**Implemented** in `trackAnalysis.buildReplay()` and `formatReplay()`.

Deterministic output format:

```text
Move 1

Move east

Row shift (layers 2)

Move 2

UP portal → L2-R4-C2

…

Goal
```

Replay re-runs `attemptMove` on the optimal path hex sequence from a fresh `newGame()`. Verified in production audit tests (`replay reaches goal`).

---

## 4. Quality Report (automated)

Generated in `docs/forgotten-citadel/PRODUCTION_AUDIT.md` via `npm test -- src/engine/trackProductionAudit.test.ts`.

Each track includes: shortest solution, portals used, layer visits, row-shift count, search dead-ends, alternative optimal count, Prism similarity breakdown, difficulty, quality/engineering scores, full replay.

---

## 5. Gameplay Audit (automated heuristics + review)

| Track | Teaches? | Aha? | Guessing? | Repetitive? | Extra movement? | Portal overuse? | Shift overuse? | Shortcuts? | Dead gameplay? |
|-------|----------|------|-----------|-------------|-----------------|-----------------|----------------|------------|----------------|
| First Steps | Yes | Mild | No | No | Some | No | Low | No | No |
| Rift Isles | Yes | Mild | No | Rim walk | Moderate | No | No | No | No |
| Portal Fork | Yes | Yes | No | No | Low | Low | Low | No | No |
| False Summit | Yes | Yes | No | No | Moderate | Low | Medium | No | No |
| Broken Span | Yes | Mild | No | Rim | Moderate | Low | Low | No | No |
| Return Valve | Yes | Yes | No | No | Moderate | Medium | Low | No | No |
| Helix Coil | Yes | Yes | No | No | High | Medium | Medium | No | No |
| Gate Order | Yes | Yes | No | No | Moderate | Low | Medium | No | No |
| Twin Relics | Yes | Mild | No | No | Moderate | Low | Low | No | No |
| Citadel Engine | Yes | Yes | No | Long | High | High | High | No | Borderline |

**Main gameplay concern:** Multiple equally-short solutions reduce “aha” clarity on shifting tracks.

---

## 6. Difficulty Curve

| Track | Difficulty | Main Mechanic | New Lesson | Est. Solve Time |
|-------|------------|---------------|------------|-----------------|
| First Steps | 4/10 | 1 portal + L2 shift | First climb | 3–6 min |
| Rift Isles | 4/10 | Missing islands | Rim routing | 5–11 min |
| Portal Fork | 3/10 | 2 portals | Wrong stair | 2–4 min |
| False Summit | 8/10 | 2 portals + 2 shifting layers | Decoy peak | 8–18 min |
| Broken Span | 7/10 | Bridge gap + climb | Detour | 7–16 min |
| Return Valve | 6/10 | UP/DOWN/UP | Return valve | 5–12 min |
| Helix Coil | 9/10 | 3 portals spiral | Corner coil | 12–28 min |
| Gate Order | 7/10 | Timed gates | Shift alignment | 6–15 min |
| Twin Relics | 7/10 | Cards + 2 portals | Parallel hints | 6–15 min |
| Citadel Engine | 10/10 | 4 portals + L2–4 shift | Central engine | 15–36 min |

Curve rises overall but **jumps** at Helix Coil and Citadel Engine. Recommend smoothing fc_t04–fc_t05 before fc_t07 if targeting casual players.

---

## 7. Originality Audit

Gate metric: max(geometry, portal, route) similarity vs any Prism Path track ≤ **35%**.

After Phase 2 redesign (western/center portals, unique missing patterns), **all tracks pass** the gate.

Layer and moving-row similarity often reads 80–100% because many Prism tracks also use L2 `SEVEN_LEFT_SIX_RIGHT` — reported in `fullMaxPercent` but **not** used for the merge gate.

---

## 8. Engine Compatibility

| Area | Changed? |
|------|----------|
| New mechanics | **NO** |
| Engine gameplay code | **NO** |
| Rendering | **NO** |
| Movement rules | **NO** |
| Portal rules | **NO** |
| Save format | **NO** |

New files: `trackValidator.ts`, `trackAnalysis.ts`, world JSON, docs, tests, scripts.

---

## 9. Performance

Typical per-track solver (10 FC tracks, warm prism cache):

| Track | Runtime | Visited states | Explored nodes | Branching factor |
|-------|---------|----------------|----------------|------------------|
| t01 | ~45ms | ~250 | ~250 | ~3.5 |
| t02 | ~35ms | ~200 | ~200 | ~3.2 |
| t10 | ~320ms | ~3000+ | ~3000+ | ~4.5 |

Full production audit suite: ~1.5–2s (includes loading 21 Prism paths once).

**Recommendations:**

- Prism path cache is effective; keep for CI
- `countOptimalPaths` capped at 1000 — sufficient for reporting
- For worlds with 50+ tracks, consider parallel vitest workers (already default)

---

## Deliverables index

| # | Document |
|---|----------|
| 1 | This file (`PRODUCTION_READINESS.md`) |
| 2 | Validator audit — §1 |
| 3 | Gameplay audit — §5 |
| 4 | Difficulty audit — §6 |
| 5 | Originality audit — §7 |
| 6 | Performance audit — §9 |
| 7 | Recommendation — §10 |
| 8 | `PRODUCTION_AUDIT.md` (per-track machine reports) |
| 9 | PR #33 updated with audit tooling |

---

## Commands

```bash
npm test                                    # full suite (149 tests)
npm run validate:tracks                     # FC schema + solvability
npm test -- src/engine/trackProductionAudit.test.ts  # audit + PRODUCTION_AUDIT.md
```
