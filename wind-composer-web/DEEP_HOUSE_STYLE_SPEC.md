# Deep House Style Spec

Acceptance-test genre for Phase 7.

## Tempo

- Range: 110–126 BPM
- Preferred: 114–122 BPM
- Wind influences target BPM within range; gusts add temporary intensity, not permanent tempo jumps

## Drum pattern

- Kick: four-on-the-floor (`DEEP_HOUSE_KICK`)
- Clap: beats 2 and 4 (`DEEP_HOUSE_CLAP`)
- Closed hats: eighth movement
- Open hat: offbeats during build/drop/high density

## Bass families

- `offbeat` — default groove
- `syncopated` — build sections
- `root_fifth` — variation after repetition
- `breakdown` — sparse breakdown

## Mix hierarchy

1. Kick and sequenced bass (dry, sidechain ducking)
2. Clap and hats
3. Chords (capped pad gain ~0.38)
4. Occasional lead
5. Atmosphere (capped ~0.22)

## Groove-first startup

| Phase | Layers |
|-------|--------|
| 0 | Kick only |
| 1+ | Kick established |
| 2+ | Sequenced bass |
| 3+ | Leads allowed |
| 4 | Full arrangement |

Mute pads/leads during Test A (groove-only listening protocol).

## Forbidden

- Kick reverb
- Pad-dominated mix
- Constant lead melody
- Abrupt BPM jumps
