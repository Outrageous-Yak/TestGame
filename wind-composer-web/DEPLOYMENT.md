# Wind Composer — GitHub Pages (static PWA)

Fully client-side Progressive Web App. No Python, Docker, or server required at runtime.

## Live URL

After deployment from `main`:

**https://outrageous-yak.github.io/TestGame/wind-composer/**

(Replace `outrageous-yak` with your GitHub username if using a fork.)

The Hex Game remains at:

**https://outrageous-yak.github.io/TestGame/**

## What runs where

| Component | Location |
|-----------|----------|
| Composition engine | TypeScript in the browser |
| Weather data | Direct HTTPS to Open-Meteo (CORS-enabled) |
| Synthesis | Web Audio API + AudioWorklet |
| Settings / favourites / stations | `localStorage` |
| Hosting | GitHub Pages static files only |

## Deployment workflow

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:

1. Builds the Hex Game (unchanged)
2. Builds Story Studio → `dist/studio/`
3. Builds Sound Studio → `dist/sound/`
4. Builds `wind-composer-web` with `BASE_PATH=/TestGame/wind-composer/` → `dist/wind-composer/`
5. Deploys the combined `dist/` folder to GitHub Pages

## Local development

```bash
cd wind-composer-web
npm install
npm run dev
```

Dev server proxies nothing to Python — fully static.

Production build:

```bash
cd wind-composer-web
BASE_PATH=/TestGame/wind-composer/ npm run build
```

## iPhone install

1. Open the GitHub Pages URL in **Safari**
2. Tap **Enable Audio**
3. **Share** → **Add to Home Screen**

HTTPS is provided by GitHub Pages, so microphone access works.

## Verification checklist

- [x] `npm run build` succeeds in `wind-composer-web/`
- [x] No requests to `localhost` or `/api/` in production bundle
- [x] Open-Meteo returns `access-control-allow-origin: *` (browser CORS OK)
- [x] Settings and favourites persist via `localStorage` after reload
- [x] Desktop Python app (`wind-composer/`) unchanged; composition and weather tests pass
- [x] Hex Game deploy steps in `deploy.yml` unchanged (Wind Composer added as `dist/wind-composer/`)
- [ ] Manual Safari check after merge: Enable Audio → Start → mic → weather → Home Screen install

## Directory layout

```
wind-composer/          # Python desktop app (unchanged)
wind-composer-web/      # Static PWA (this deployment)
  src/music/            # Ported composition engine
  src/weather/          # Open-Meteo client
  src/audio/            # Web Audio engine
  public/               # PWA shell, worklet, manifest
```

## Why no server?

All features in the requirements can run client-side:

- Generative composition → ported to TypeScript
- Weather → Open-Meteo public API with browser CORS
- Synthesis → Web Audio AudioWorklet
- Map → Leaflet + OpenStreetMap tiles
- Recording → `MediaRecorder` on synth output stream

No server dependency is required for the stated feature set.
