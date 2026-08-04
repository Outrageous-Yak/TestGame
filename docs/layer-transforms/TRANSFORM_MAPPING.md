# Layer transform visual mapping (7676767 board)

This document describes the **four active layer automorphisms**. They are rigid graph symmetries of the 46-cell honeycomb layer. They are **not** literal 60°/120°/240° rotations.

See also the table in `src/engine/layerTransform/transformCatalog.ts`.

| Canonical ID | Player label | Example (R0C0 →) | Involution | Screen interpretation | Inverse |
|--------------|--------------|------------------|------------|----------------------|---------|
| `identity` | Variant 1 | R0C0 | yes | No change | `identity` |
| `reflect-horizontal` | Variant 2 | R0C6 | yes | Mirror left/right within each row | `reflect-horizontal` |
| `symmetry-b` | Variant 3 | R6C0 | yes | Mirror top/bottom (row index reverses) | `symmetry-b` |
| `symmetry-c` | Variant 4 | R6C6 | yes | Opposite cell (row and column reverse) | `symmetry-c` |

## Legacy ID migration

| Legacy ID | Canonical ID |
|-----------|--------------|
| `rotate-60` | `reflect-horizontal` |
| `rotate-120` | `symmetry-b` |
| `rotate-240` | `symmetry-c` |
| `reflect-a` | `reflect-horizontal` |
| `reflect-b` | `symmetry-c` |

Older builds used misleading `rotate-*` names. Migration runs when parsing dev URLs and loading `localStorage` selections.

## Run lifecycle

| Action | Transform behaviour |
|--------|---------------------|
| Enter track from menu | New seed and combination (`fresh`) |
| Goal popup **Replay** | New seed and combination, avoids previous if possible (`replayAfterWin`) |
| Restart / retry / resume | Preserve (`preserve`) |
| Re-enter track from menu after playing | New combination, avoids previous if possible (`fresh`) |
| `?variation=fixed` | All `identity` |
