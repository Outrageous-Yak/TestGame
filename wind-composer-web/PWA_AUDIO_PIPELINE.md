# PWA Audio Pipeline

## Path

`MusicSession.tick()` → `ProducerBrain` → `IntelligentComposer.enhance()` → `Orchestrator.mapPlan(intent)` → `WebSynthEngine.applyTick()` → `synth-worklet.js`

## Timing

- Master clock: `AudioContext.currentTime` and sample position from context
- Drums: `DrumEngine` inside AudioWorklet (16th-step sequencer)
- BPM smoothing: `TempoEngine` max ~1 BPM/bar; gust boost decays
- UI tick: 50ms audio updates; live panel 500ms (no full DOM rebuild)

## Worklet voices

- Procedural kick (sine + pitch decay + click transient)
- Clap pattern (Deep House beats 2/4)
- Snare fallback when clap disabled
- Closed/open hats
- Sequenced bass with kick sidechain ducking
- Pad/lead voices via `Voice` class with reverb/delay

## Deployment

- Base path: `/TestGame/wind-composer/`
- Worklet: `synth-worklet.js` (cached in service worker v12)
- Hex game root unchanged at `/TestGame/`

## iPhone constraints

Default quality Standard/Mobile Safe preserves kick, bass, timing. Reduces atmosphere complexity and reverb under load.
