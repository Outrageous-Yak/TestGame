# Forgotten Citadel — Production Audit

Generated: 2026-08-05T16:21:06.035Z

## Production Recommendation

```
NOT READY
```

### Remaining issues

- fc_t04_false_summit: 20 equally-short solutions (target ≤12 for single elegant route)
- fc_t08_gate_order: 38 equally-short solutions (target ≤12 for single elegant route)

See `docs/forgotten-citadel/PRODUCTION_READINESS.md` for full engineering audit.

## Difficulty Curve

| Track | Difficulty | Main Mechanic | New Lesson | Est. Solve Time |
|-------|------------|---------------|------------|-----------------|
| First Steps | 5/10 | 1 portals | track track01.json | 4–9 min |
| Rift Isles | 4/10 | movement | track track02.json | 5–11 min |
| Portal Fork | 5/10 | 2 portals | track track03.json | 5–11 min |
| False Summit | 10/10 | 2 portals | track track04.json | 13–30 min |
| Broken Span | 6/10 | 1 portals | track track05.json | 6–14 min |
| Return Valve | 7/10 | 3 portals | track track06.json | 6–14 min |
| Helix Coil | 10/10 | 2 portals | track track07.json | 13–32 min |
| Gate Order | 4/10 | 1 portals | track track08.json | 4–10 min |
| Twin Relics | 5/10 | 2 portals | track track09.json | 6–14 min |
| Citadel Engine | 9/10 | 2 portals | track track10.json | 9–22 min |

## Per-Track Quality Reports

Track: First Steps (fc_t01_first_steps)
Shortest solution: 7
Estimated player moves: 7
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 7
Dead ends explored (search): 34
Backtracking required: NO
Alternative optimal solutions: 1
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 29.5% (scenario8.json)
  full max 100.0% geometry 29.5% portal 0.0% route 12.5% layer 100.0% moving-row 100.0%
Estimated difficulty: 5/10
Quality score: 10/10
Engineering score: 10/10
Solver: explored 41 states in 6.2ms
Gameplay notes: Missing hexes shape routing.

--- Replay ---
Move 1

Move northwest

Row shift (layers 2)

Move 2

Move east

Row shift (layers 2)

Move 3

Move east

Row shift (layers 2)

Move 4

Move east

Row shift (layers 2)

Move 5

Move south

Row shift (layers 2)

Move 6

UP portal → L2-R3-C2

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
Dead ends explored (search): 32
Backtracking required: NO
Alternative optimal solutions: 10
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 35.0% (scenario11.json)
  full max 50.0% geometry 35.0% portal 0.0% route 18.2% layer 50.0% moving-row 0.0%
Estimated difficulty: 4/10
Quality score: 7/10
Engineering score: 10/10
Solver: explored 41 states in 7.9ms
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
Shortest solution: 9
Estimated player moves: 9
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 0
Dead ends explored (search): 49
Backtracking required: NO
Alternative optimal solutions: 3
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 31.0% (scenario11.json)
  full max 100.0% geometry 31.0% portal 0.0% route 14.7% layer 100.0% moving-row 0.0%
Estimated difficulty: 5/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 58 states in 8.7ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 3 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move west

Move 2

Move west

Move 3

Move west

Move 4

Move west

Move 5

Move west

Move 6

UP portal → L2-R0-C2

Move 7

Move south

Move 8

Move southeast

Move 9

Move east

Goal

---

Track: False Summit (fc_t04_false_summit)
Shortest solution: 25
Estimated player moves: 25
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 0
Dead ends explored (search): 44
Backtracking required: NO
Alternative optimal solutions: 20
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 27.1% (scenario11.json)
  full max 66.7% geometry 27.1% portal 0.0% route 12.2% layer 66.7% moving-row 0.0%
Estimated difficulty: 10/10
Quality score: 8/10
Engineering score: 10/10
Solver: explored 69 states in 36.7ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 20 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

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

UP portal → L2-R0-C0

Move 10

Move south

Move 11

Move south

Move 12

Move south

Move 13

Move south

Move 14

Move south

Move 15

UP portal → L3-R6-C0

Move 16

Move north

Move 17

Move north

Move 18

Move north

Move 19

Move east

Move 20

Move northwest

Move 21

Move east

Move 22

Move east

Move 23

Move east

Move 24

Move north

Move 25

Move northwest

Goal

---

Track: Broken Span (fc_t05_broken_span)
Shortest solution: 11
Estimated player moves: 11
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 0
Dead ends explored (search): 49
Backtracking required: NO
Alternative optimal solutions: 5
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 26.8% (scenario11.json)
  full max 100.0% geometry 26.8% portal 0.0% route 10.8% layer 100.0% moving-row 0.0%
Estimated difficulty: 6/10
Quality score: 8/10
Engineering score: 10/10
Solver: explored 60 states in 13.4ms
Gameplay notes: Missing hexes shape routing.; 5 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move northwest

Move 2

Move north

Move 3

Move northwest

Move 4

Move northwest

Move 5

Move north

Move 6

UP portal → L2-R6-C0

Move 7

Move north

Move 8

Move northwest

Move 9

Move north

Move 10

Move northwest

Move 11

Move north

Goal

---

Track: Return Valve (fc_t06_return_valve)
Shortest solution: 11
Estimated player moves: 11
Portals used in optimal path: 3
Layer visits: 1, 2
Row-shift events (total layers shifted): 0
Dead ends explored (search): 4
Backtracking required: YES
Alternative optimal solutions: 2
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 34.4% (scenario11.json)
  full max 100.0% geometry 34.4% portal 16.7% route 5.1% layer 100.0% moving-row 0.0%
Estimated difficulty: 7/10
Quality score: 10/10
Engineering score: 10/10
Solver: explored 15 states in 1.4ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 2 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move northwest

Move 2

Move northwest

Move 3

Move northwest

Move 4

Move northwest

Move 5

Move northwest

Move 6

UP portal → L2-R6-C6

Move 7

Move northwest

Move 8

Move north

Move 9

Move north

Move 10

DOWN portal → L1-R2-C1

Move 11

UP portal → L2-R2-C0

Goal

---

Track: Helix Coil (fc_t07_helix_coil)
Shortest solution: 26
Estimated player moves: 26
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 0
Dead ends explored (search): 47
Backtracking required: NO
Alternative optimal solutions: 10
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 27.2% (scenario11.json)
  full max 66.7% geometry 27.2% portal 0.0% route 14.3% layer 66.7% moving-row 0.0%
Estimated difficulty: 10/10
Quality score: 8/10
Engineering score: 10/10
Solver: explored 73 states in 40.5ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 10 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

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

UP portal → L2-R6-C0

Move 10

Move north

Move 11

Move north

Move 12

Move north

Move 13

Move north

Move 14

Move north

Move 15

UP portal → L3-R6-C0

Move 16

Move north

Move 17

Move north

Move 18

Move north

Move 19

Move north

Move 20

Move north

Move 21

Move northwest

Move 22

Move east

Move 23

Move east

Move 24

Move east

Move 25

Move east

Move 26

Move east

Goal

---

Track: Gate Order (fc_t08_gate_order)
Shortest solution: 8
Estimated player moves: 8
Portals used in optimal path: 1
Layer visits: 1, 2
Row-shift events (total layers shifted): 8
Dead ends explored (search): 128
Backtracking required: NO
Alternative optimal solutions: 38
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 11.8% (scenario10.json)
  full max 100.0% geometry 0.0% portal 0.0% route 11.8% layer 100.0% moving-row 100.0%
Estimated difficulty: 4/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 136 states in 20.5ms
Gameplay notes: Missing hexes shape routing.; 38 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move west

Row shift (layers 2)

Move 2

UP portal → L2-R0-C3

Row shift (layers 2)

Move 3

Move east

Row shift (layers 2)

Move 4

Move southeast

Row shift (layers 2)

Move 5

Move southeast

Row shift (layers 2)

Move 6

Move southeast

Row shift (layers 2)

Move 7

Move southeast

Row shift (layers 2)

Move 8

Move east

Row shift (layers 2)

Goal

---

Track: Twin Relics (fc_t09_twin_relics)
Shortest solution: 11
Estimated player moves: 11
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 0
Dead ends explored (search): 44
Backtracking required: NO
Alternative optimal solutions: 4
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 20.0% (scenario9.json)
  full max 66.7% geometry 20.0% portal 0.0% route 0.0% layer 66.7% moving-row 0.0%
Estimated difficulty: 5/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 55 states in 8.7ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 4 optimal routes — elegance reduced.

--- Replay ---
Move 1

Move north

Move 2

Move northwest

Move 3

UP portal → L2-R0-C3

Move 4

Move west

Move 5

UP portal → L3-R6-C3

Move 6

Move north

Move 7

Move north

Move 8

Move north

Move 9

Move north

Move 10

Move north

Move 11

Move north

Goal

---

Track: Citadel Engine (fc_t10_citadel_engine)
Shortest solution: 18
Estimated player moves: 18
Portals used in optimal path: 2
Layer visits: 1, 2, 3
Row-shift events (total layers shifted): 36
Dead ends explored (search): 548
Backtracking required: NO
Alternative optimal solutions: 8
Soft locks detected: 0
Portal loops: 0
Max Prism similarity (gate): 10.3% (scenario3.json)
  full max 60.0% geometry 0.0% portal 0.0% route 10.3% layer 60.0% moving-row 33.3%
Estimated difficulty: 9/10
Quality score: 9/10
Engineering score: 10/10
Solver: explored 566 states in 85.2ms
Gameplay notes: Requires portal sequencing.; Missing hexes shape routing.; 8 optimal routes — elegance reduced.; Long solve — verify movement is purposeful.

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

Move northwest

Row shift (layers 2, 3)

Move 6

UP portal → L2-R6-C3

Row shift (layers 2, 3)

Move 7

Move northwest

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

UP portal → L3-R6-C3

Row shift (layers 2, 3)

Move 13

Move northwest

Row shift (layers 2, 3)

Move 14

Move northwest

Row shift (layers 2, 3)

Move 15

Move northwest

Row shift (layers 2, 3)

Move 16

Move northwest

Row shift (layers 2, 3)

Move 17

Move northwest

Row shift (layers 2, 3)

Move 18

Move north

Row shift (layers 2, 3)

Goal