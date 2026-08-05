# Game sound effects

## Player move

- **Current file:** `effects/player-move.mp3`
- **Used for:** every successful player hex move

### Replacing with a Pixabay sound

1. Open [Pixabay game move sounds](https://pixabay.com/sound-effects/search/game%20move/).
2. Pick a sound and download the MP3.
3. Replace `public/sounds/effects/player-move.mp3` with your download (keep the same filename), or update `SOUND_EFFECT_PATHS.playerMove` in `src/ui/audio/soundEffects.ts`.
4. Add attribution in `public/sounds/ATTRIBUTION.md` (author + Pixabay URL) if you wish — not required by the [Pixabay Content License](https://pixabay.com/service/license-summary/), but helpful for your records.

Automated download from Pixabay is blocked in CI/agents (Cloudflare), so the file must be added manually from your browser.
