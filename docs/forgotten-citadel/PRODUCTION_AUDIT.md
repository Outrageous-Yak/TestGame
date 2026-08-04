# Forgotten Citadel — Production Audit

Generated: 2026-08-04T14:39:05.074Z

## Production Recommendation

```
NOT READY
```

### Remaining issues

- fc_t01_first_steps: 50 equally-short solutions (target ≤12 for single elegant route)
- fc_t04_false_summit: 1000 equally-short solutions (target ≤12 for single elegant route)
- fc_t05_broken_span: 270 equally-short solutions (target ≤12 for single elegant route)
- fc_t06_return_valve: 84 equally-short solutions (target ≤12 for single elegant route)
- fc_t07_helix_coil: 1000 equally-short solutions (target ≤12 for single elegant route)
- fc_t08_gate_order: 328 equally-short solutions (target ≤12 for single elegant route)
- fc_t09_twin_relics: 240 equally-short solutions (target ≤12 for single elegant route)
- fc_t10_citadel_engine: 72 equally-short solutions (target ≤12 for single elegant route)

See `docs/forgotten-citadel/PRODUCTION_READINESS.md` for full engineering audit.

## Difficulty Curve

| Track | Difficulty | Main Mechanic | New Lesson | Est. Solve Time |
|-------|------------|---------------|------------|-----------------|
| First Steps | 4/10 | 1 portals | track track01.json | 4–9 min |
| Rift Isles | 4/10 | movement | track track02.json | 5–11 min |
| Portal Fork | 3/10 | 2 portals | track track03.json | 2–4 min |
| False Summit | 10/10 | 2 portals | track track04.json | 9–22 min |
| Broken Span | 8/10 | 1 portals | track track05.json | 8–18 min |
| Return Valve | 6/10 | 3 portals | track track06.json | 5–12 min |
| Helix Coil | 10/10 | 3 portals | track track07.json | 12–29 min |
| Gate Order | 7/10 | 2 portals | track track08.json | 6–15 min |
| Twin Relics | 6/10 | 2 portals | track track09.json | 6–15 min |
| Citadel Engine | 10/10 | 4 portals | track track10.json | 8–20 min |

## Per-Track Quality Reports

Track: First Steps (fc_t01_first_steps)
Shortest solution: 7
Estimated player moves: 7
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 7
Dead ends explored (search): 242
Backtracking required: NO
Alternative optimal solutions: 50
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 12.5% (scenario8.json)
  full max 100.0% geometry 0.0% portal 0.0% route 12.5% layer 100.0% moving-row 100.0%
Estimated difficulty: 4/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 249 states in 59.1ms
Gameplay notes: 50 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move east

Row shift (layers 2)

Move 2

Move east

Row shift (layers 2)

Move 3

Move south

Row shift (layers 2)

Move 4

Move southeast

Row shift (layers 2)

Move 5

UP portal → L2-R4-C2

Row shift (layers 2)

Move 6

Move southeast

Row shift (layers 2)

Move 7

Move northwest

Row shift (layers 2)

Goal

---

Track: Rift Isles (fc_t02_rift_isles)
Shortest solution: 9
Estimated player moves: 9
Portals used in optimal path: 0
Layer visits: 1
Row-shift events (total layers shifted): 0
Dead ends explored (search): 194
Backtracking required: NO
Alternative optimal solutions: 10
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 35.0% (scenario11.json)
  full max 50.0% geometry 35.0% portal 0.0% route 18.2% layer 50.0% moving-row 0.0%
Estimated difficulty: 4/10
Quality score: 7/10
Engineering score: 10/10
Solver: explored 203 states in 41.4ms
Gameplay notes: Missing hexes shape routing.; 10 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move west

Move 2

Move west

Move 3

Move west

Move 4

Move northwest

Move 5

Move north

Move 6

Move northwest

Move 7

Move north

Move 8

Move northwest

Move 9

Move north

Goal

---

Track: Portal Fork (fc_t03_portal_fork)
Shortest solution: 3
Estimated player moves: 3
Portals used in optimal path: 1
Layer visits: 2
Row-shift events (total layers shifted): 3
Dead ends explored (search): 34
Backtracking required: NO
Alternative optimal solutions: 2
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 29.5% (scenario8.json)
  full max 100.0% geometry 29.5% portal 0.0% route 7.7% layer 100.0% moving-row 100.0%
Estimated difficulty: 3/10
Quality score: 10/10
Engineering score: 10/10
Solver: explored 37 states in 6.3ms
Gameplay notes: Teaches a single core mechanic.; Requires portal sequencing.; Missing hexes shape routing.; 2 optimal routes — elegance reduced.

--- Replay ---
Move 1

UP portal → L2-R0-C2

Row shift (layers 2)

Move 2

Move southeast

Row shift (layers 2)

Move 3

Move southeast

Row shift (layers 2)

Goal

---

Track: False Summit (fc_t04_false_summit)
Shortest solution: 18
Estimated player moves: 18
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 36
Dead ends explored (search): 1177
Backtracking required: NO
Alternative optimal solutions: 1000
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 25.0% (scenario10.json)
  full max 66.7% geometry 25.0% portal 0.0% route 16.0% layer 66.7% moving-row 50.0%
Estimated difficulty: 10/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 1195 states in 317.7ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 1000 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

--- Replay ---
Move 1

Move north

Row shift (layers 2, 3)

Move 2

Move north

Row shift (layers 2, 3)

Move 3

Move north

Row shift (layers 2, 3)

Move 4

Move north

Row shift (layers 2, 3)

Move 5

Move north

Row shift (layers 2, 3)

Move 6

UP portal → L2-R0-C0

Row shift (layers 2, 3)

Move 7

Move south

Row shift (layers 2, 3)

Move 8

Move southeast

Row shift (layers 2, 3)

Move 9

Move southeast

Row shift (layers 2, 3)

Move 10

Move south

Row shift (layers 2, 3)

Move 11

Move southeast

Row shift (layers 2, 3)

Move 12

UP portal → L3-R6-C0

Row shift (layers 2, 3)

Move 13

Move northwest

Row shift (layers 2, 3)

Move 14

Move north

Row shift (layers 2, 3)

Move 15

Move northwest

Row shift (layers 2, 3)

Move 16

Move northwest

Row shift (layers 2, 3)

Move 17

Move north

Row shift (layers 2, 3)

Move 18

Move northwest

Row shift (layers 2, 3)

Goal

---

Track: Broken Span (fc_t05_broken_span)
Shortest solution: 15
Estimated player moves: 15
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 15
Dead ends explored (search): 537
Backtracking required: NO
Alternative optimal solutions: 270
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 25.0% (scenario10.json)
  full max 100.0% geometry 25.0% portal 0.0% route 13.0% layer 100.0% moving-row 100.0%
Estimated difficulty: 8/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 552 states in 106.8ms
Gameplay notes: Missing hexes shape routing.; 270 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move north

Row shift (layers 2)

Move 2

Move north

Row shift (layers 2)

Move 3

Move north

Row shift (layers 2)

Move 4

Move northwest

Row shift (layers 2)

Move 5

Move east

Row shift (layers 2)

Move 6

Move east

Row shift (layers 2)

Move 7

Move east

Row shift (layers 2)

Move 8

Move east

Row shift (layers 2)

Move 9

Move north

Row shift (layers 2)

Move 10

UP portal → L2-R6-C0

Row shift (layers 2)

Move 11

Move northwest

Row shift (layers 2)

Move 12

Move northwest

Row shift (layers 2)

Move 13

Move northwest

Row shift (layers 2)

Move 14

Move northwest

Row shift (layers 2)

Move 15

Move northwest

Row shift (layers 2)

Goal

---

Track: Return Valve (fc_t06_return_valve)
Shortest solution: 10
Estimated player moves: 10
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 10
Dead ends explored (search): 302
Backtracking required: NO
Alternative optimal solutions: 84
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 31.3% (scenario8.json)
  full max 100.0% geometry 0.0% portal 0.0% route 31.3% layer 100.0% moving-row 100.0%
Estimated difficulty: 6/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 312 states in 64.0ms
Gameplay notes: Requires portal sequencing.; 84 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move west

Row shift (layers 2)

Move 2

Move west

Row shift (layers 2)

Move 3

Move west

Row shift (layers 2)

Move 4

Move northwest

Row shift (layers 2)

Move 5

Move north

Row shift (layers 2)

Move 6

Move northwest

Row shift (layers 2)

Move 7

Move north

Row shift (layers 2)

Move 8

Move northwest

Row shift (layers 2)

Move 9

UP portal → L2-R0-C0

Row shift (layers 2)

Move 10

Move east

Row shift (layers 2)

Goal

---

Track: Helix Coil (fc_t07_helix_coil)
Shortest solution: 24
Estimated player moves: 24
Portals used in optimal path: 3
Layer visits: 1, 2, 3, 4
Row-shift events (total layers shifted): 48
Dead ends explored (search): 2147
Backtracking required: NO
Alternative optimal solutions: 1000
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 20.0% (scenario15.json)
  full max 100.0% geometry 0.0% portal 20.0% route 11.1% layer 75.0% moving-row 33.3%
Estimated difficulty: 10/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 2171 states in 593.8ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 1000 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

--- Replay ---
Move 1

Move northwest

Row shift (layers 2, 3)

Move 2

Move north

Row shift (layers 2, 3)

Move 3

Move northwest

Row shift (layers 2, 3)

Move 4

Move northwest

Row shift (layers 2, 3)

Move 5

Move north

Row shift (layers 2, 3)

Move 6

UP portal → L2-R6-C3

Row shift (layers 2, 3)

Move 7

Move north

Row shift (layers 2, 3)

Move 8

Move northwest

Row shift (layers 2, 3)

Move 9

Move northwest

Row shift (layers 2, 3)

Move 10

Move northwest

Row shift (layers 2, 3)

Move 11

Move northwest

Row shift (layers 2, 3)

Move 12

UP portal → L3-R6-C0

Row shift (layers 2, 3)

Move 13

Move northwest

Row shift (layers 2, 3)

Move 14

Move north

Row shift (layers 2, 3)

Move 15

Move northwest

Row shift (layers 2, 3)

Move 16

Move northwest

Row shift (layers 2, 3)

Move 17

Move north

Row shift (layers 2, 3)

Move 18

UP portal → L4-R6-C6

Row shift (layers 2, 3)

Move 19

Move west

Row shift (layers 2, 3)

Move 20

Move northwest

Row shift (layers 2, 3)

Move 21

Move north

Row shift (layers 2, 3)

Move 22

Move northwest

Row shift (layers 2, 3)

Move 23

Move north

Row shift (layers 2, 3)

Move 24

Move west

Row shift (layers 2, 3)

Goal

---

Track: Gate Order (fc_t08_gate_order)
Shortest solution: 12
Estimated player moves: 12
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 24
Dead ends explored (search): 708
Backtracking required: NO
Alternative optimal solutions: 328
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 15.0% (scenario10.json)
  full max 66.7% geometry 0.0% portal 0.0% route 15.0% layer 66.7% moving-row 50.0%
Estimated difficulty: 7/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 720 states in 170.3ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 328 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move west

Row shift (layers 2, 3)

Move 2

Move west

Row shift (layers 2, 3)

Move 3

UP portal → L2-R0-C3

Row shift (layers 2, 3)

Move 4

Move east

Row shift (layers 2, 3)

Move 5

Move southeast

Row shift (layers 2, 3)

Move 6

Move east

Row shift (layers 2, 3)

Move 7

Move south

Row shift (layers 2, 3)

Move 8

Move southeast

Row shift (layers 2, 3)

Move 9

UP portal → L3-R0-C3

Row shift (layers 2, 3)

Move 10

Move southeast

Row shift (layers 2, 3)

Move 11

Move southeast

Row shift (layers 2, 3)

Move 12

Move southeast

Row shift (layers 2, 3)

Goal

---

Track: Twin Relics (fc_t09_twin_relics)
Shortest solution: 12
Estimated player moves: 12
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 12
Dead ends explored (search): 854
Backtracking required: NO
Alternative optimal solutions: 240
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 8.5% (scenario13.json)
  full max 100.0% geometry 0.5% portal 0.0% route 8.5% layer 100.0% moving-row 50.0%
Estimated difficulty: 6/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 866 states in 172.1ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 240 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move north

Row shift (layers 2)

Move 2

Move west

Row shift (layers 2)

Move 3

Move north

Row shift (layers 2)

Move 4

UP portal → L2-R0-C3

Row shift (layers 2)

Move 5

Move west

Row shift (layers 2)

Move 6

UP portal → L3-R6-C3

Row shift (layers 2)

Move 7

Move northwest

Row shift (layers 2)

Move 8

Move north

Row shift (layers 2)

Move 9

Move north

Row shift (layers 2)

Move 10

Move northwest

Row shift (layers 2)

Move 11

Move north

Row shift (layers 2)

Move 12

Move north

Row shift (layers 2)

Goal

---

Track: Citadel Engine (fc_t10_citadel_engine)
Shortest solution: 16
Estimated player moves: 16
Portals used in optimal path: 4
Layer visits: 1, 2, 3, 4, 5
Row-shift events (total layers shifted): 48
Dead ends explored (search): 1588
Backtracking required: NO
Alternative optimal solutions: 72
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 27.7% (scenario9.json)
  full max 40.0% geometry 27.7% portal 0.0% route 3.8% layer 40.0% moving-row 33.3%
Estimated difficulty: 10/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 1604 states in 320.5ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 72 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

--- Replay ---
Move 1

Move east

Row shift (layers 2, 3, 4)

Move 2

Move east

Row shift (layers 2, 3, 4)

Move 3

Move south

Row shift (layers 2, 3, 4)

Move 4

Move southeast

Row shift (layers 2, 3, 4)

Move 5

UP portal → L2-R3-C3

Row shift (layers 2, 3, 4)

Move 6

Move northwest

Row shift (layers 2, 3, 4)

Move 7

UP portal → L3-R3-C3

Row shift (layers 2, 3, 4)

Move 8

Move east

Row shift (layers 2, 3, 4)

Move 9

UP portal → L4-R3-C3

Row shift (layers 2, 3, 4)

Move 10

Move east

Row shift (layers 2, 3, 4)

Move 11

Move east

Row shift (layers 2, 3, 4)

Move 12

UP portal → L5-R3-C3

Row shift (layers 2, 3, 4)

Move 13

Move northwest

Row shift (layers 2, 3, 4)

Move 14

Move north

Row shift (layers 2, 3, 4)

Move 15

Move northwest

Row shift (layers 2, 3, 4)

Move 16

Move east

Row shift (layers 2, 3, 4)

Goal