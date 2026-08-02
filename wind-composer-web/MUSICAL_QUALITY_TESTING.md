# Musical Quality Testing

## Automated

```bash
cd wind-composer-web && npm test
```

Covers: producer brain BPM range, kick pattern, startup phases, tick stress, audio diagnostics.

## Manual listening protocol

### Test A — Groove only

Disable dance toggle off for pads only — or use Deep House with mental focus on kick/bass/hats.

Requirements: intentional groove, bass locks with kick, no timing instability, recognizable Deep House.

### Test B — Full mix

All layers on. Groove remains clear; pads do not obscure drums.

### Test C — 10 minutes

Meaningful variations, section change, some subtraction.

### Test D — 30 minutes

Continued evolution, balanced repetition, weather influence audible.

### Test E — Weather comparison

Same style (Deep House), different locations — mood differs but genre identity holds.

### Test F — iPhone

Safari, installed PWA, speaker and headphones, stop/start, service worker update.

## Event log (deterministic)

Producer actions appear in `weather_hints` on the composition plan and in the live weather notice panel when bar-boundary decisions fire.
