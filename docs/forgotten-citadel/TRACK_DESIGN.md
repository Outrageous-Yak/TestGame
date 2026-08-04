# Forgotten Citadel — Track Design Notes

| Track | Concept | Difficulty | Min moves* |
|-------|---------|------------|------------|
| fc_t01_first_steps | Simple introduction — one UP, shifting L2 | 1 | ~6 |
| fc_t02_rift_isles | Missing islands — rim route on static L1 | 2 | ~12 |
| fc_t03_portal_fork | Portal routing — west vs east stair | 3 | ~8 |
| fc_t04_false_summit | False summit — east lift, cross shifting L3 | 4 | ~14 |
| fc_t05_broken_span | Broken bridge — rim detour before climb | 4 | ~12 |
| fc_t06_return_valve | Repeated portal — UP, DOWN, traverse, UP | 5 | ~18 |
| fc_t07_helix_coil | Spiral routing — alternating corner lifts | 5 | ~16 |
| fc_t08_gate_order | Portal order — L2+L3 shift timing | 6 | ~10 |
| fc_t09_twin_relics | Parallel objectives — cards + villains | 7 | ~14 |
| fc_t10_citadel_engine | Machine systems — L2–4 shift, 4 UP chain | 8 | ~22 |

\* Min moves computed by engine BFS (`computeMinMovesToGoal`) including row rotation.

## Intended solutions (summary)

1. **First Steps** — Walk east to UP portal, cross shifting L2 to goal.
2. **Rift Isles** — Clockwise or counter rim around row-3 gap.
3. **Portal Fork** — West portal (L1 C0); east path blocked by L2 midline holes.
4. **False Summit** — East UP chain to L3 SE, then navigate shifting tier to NW goal.
5. **Broken Span** — Rim to NE UP portal, then shifting L2 to inner goal.
6. **Return Valve** — NE UP → navigate to DOWN → west undercroft → west UP → goal.
7. **Helix Coil** — NE→NW→NE corner portal chain across four layers.
8. **Gate Order** — L1 west UP, cross shifting L2 to east UP, align L3 gate.
9. **Twin Relics** — North UP chain; cards mark west/east rim entry points.
10. **Citadel Engine** — Rim to east chain; cross three shifting tiers to NW sanctum.

## Quality scoring (design intent)

| Category | Target | Notes |
|----------|--------|-------|
| Fairness | 10/10 | All solvable; no guessing |
| Elegance | 9/10 | Portal sequencing over brute movement |
| Discovery | 9/10 | DOWN return, false summit, gate timing |
| Memorability | 9/10 | Each track has distinct hook |
| Randomness | 0 | Deterministic shifts |
| Soft locks | 0 | Wrong routes remain traversable |
| Guessing | 0 | Geometry encodes correct path |
