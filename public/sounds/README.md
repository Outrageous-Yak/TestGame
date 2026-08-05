# Game sound effects

| Event | File | Source |
|-------|------|--------|
| Player move | `effects/player-move.mp3` | [Sonar ping #290188](https://pixabay.com/sound-effects/film-special-effects-sonar-ping-290188/) |
| Portal transition | `effects/portal-land.mp3` | [Level up #289723](https://pixabay.com/sound-effects/sonar-ping-289723/) |
| Goal reached | `effects/goal-land.mp3` | [Good result #82807](https://pixabay.com/sound-effects/goodresult-82807/) |

All sounds are licensed under the [Pixabay Content License](https://pixabay.com/service/license-summary/). See `ATTRIBUTION.md` for details.

The move sound is trimmed to ~1.1s; portal and goal use the full clips (~2.5s and ~3.5s).

To swap a sound, replace the MP3 or update `SOUND_EFFECT_PATHS` in `src/ui/audio/soundEffects.ts`.
