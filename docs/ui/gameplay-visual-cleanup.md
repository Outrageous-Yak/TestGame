# Gameplay Visual Cleanup

Focused presentation polish for the **player gameplay experience**. Same game identity — clearer hierarchy.

Base main: `8426844bcbb07a3bdb5f437649d182ab64115864`

## Problems identified before editing

- Left rail showed technical `L1` / `R2` row-shift labels in player gameplay (puzzle spoilers).
- Mobile hid the left rail entirely → no row-shift cue on phones.
- Reachable-cell pulse / sparkles competed with the protagonist.
- Portal and Goal bloom were strong enough to dominate dense boards.
- Crystal beacon / Echo glows were high-intensity continuous effects.
- Portal FX lacked `prefers-reduced-motion` gating.
- Missing/ghost tiles could read like faint playable tiles.

## What changed

### Player / current hex
- Quieter inset ring on `.hex.player` so the occupied tile stays clear under the sprite.
- Slightly stronger dark rim on `.playerSpriteSheet` for contrast (no new art).

### Movable cells
- Softer reach-pulse overlays.
- Slightly quieter reach sparkles.

### Goal / portals
- Reduced Goal gold bloom.
- Reduced portal drop-shadow / breathe scale.
- Portal ambient animations respect `prefers-reduced-motion`.

### Row movement information
- Player gameplay no longer shows per-row `L#`/`R#` labels.
- Compact chip: **"Rows shift on this layer"** when the current layer has any movement.
- Visible on desktop and mobile (~390).
- Engine `rowShiftLabel` and Track Planner / Studio overlays unchanged.

### Missing hexes
- Ghost placeholders slightly dimmer / less “button-like”.

### Visibility modes
- Echo visible glow softened.
- Crystal beacon pulse softened + reduced-motion gated.
- Mode rules and visibility calculations unchanged.

### HUD
- Silent left alignment rail kept for desktop grid; spoilery labels removed.
- Warning chip sits above the board (works when left rail is hidden on mobile).

## Deliberately NOT changed

- Movement legality, move counting, wrong-tap rules
- Row movement engine amount/direction/timing
- Portal destinations / transitions (authoritative)
- Visibility mode gameplay rules / lantern radius
- Puzzle geometry / tracks / scenarios
- Solver, Simulator, Stranding Analysis
- Progression / storage schemas
- Character art / world backgrounds
- Predictive row previews or solver hints
- STRANDED result screen (not on player main)

## Visual hierarchy (target)

1. Player location + current hex  
2. Legal moves (restrained)  
3. Action feedback (move / portal / row shift)  
4. Goal / portals  
5. Atmosphere (clouds, shimmer, particles)

## Tests

`src/ui/game/rowShiftPlayerWarning.test.ts` — static vs moving layers; no L/R leakage; engine labels preserved.

## Known limitations

- No board-row slide animation exists to retune (state updates immediately).
- Optimal stats remain in the status panel (useful, not spoilery movement data).
- Full visibility-mode art passes are presentation-only; mechanics untouched.
