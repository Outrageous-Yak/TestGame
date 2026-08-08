# AGENTS.md

## Cursor Cloud specific instructions

This repo is a monorepo of four independent, browser-based Vite + React apps that are
built together and deployed to GitHub Pages (see `.github/workflows/pages-publish.yml`).
There is also an optional Python/Tauri "Wind Composer" server/desktop variant that is
**not** part of the default dev scope.

### Apps in default scope (no backend / no DB — pure browser apps)

| App | Directory | Dev command | Deployed base path |
|-----|-----------|-------------|--------------------|
| Test Game ("Hex Game") — primary | `/` (root) | `npm run dev` | `/TestGame/` |
| Story Architecture Studio | `story-architecture-studio/` | `npm run dev` | `/TestGame/studio/` |
| Sound Studio | `sound-studio/` | `npm run dev` | `/TestGame/sound/` |
| Wind Composer (static PWA) | `wind-composer-web/` | `npm run dev` | `/TestGame/wind-composer/` |

Non-obvious notes:
- Every app's Vite dev server defaults to port **5173**, so to run more than one at a
  time you must pass a distinct port, e.g. `npm run dev -- --port 5174`.
- The root Test Game serves under the base path, i.e. open `http://localhost:5173/TestGame/`
  (not `/`). Likewise `wind-composer-web` serves at `/TestGame/wind-composer/`.
- Persistence is client-side only (IndexedDB / localStorage / Web Audio). No server, no
  database, and no external service is required for the core flows. Wind Composer's
  live-weather mode optionally hits the public Open-Meteo API.
- Game flow for the Test Game: Start → World → Character → Scenario → Game board.

### Testing / lint / build

- Tests: run `npm test` (Vitest) inside each app directory. Story/Sound/Wind pass clean.
- Known pre-existing failures: the root `npm test` has a few failing tests in
  `src/engine/puzzleFitness.test.ts` and `src/features/puzzle-studio/puzzleStudio.integration.test.ts`.
  These are game-content/track-count/fitness-gate assertions on this WIP branch, not
  environment problems.
- The root project has no `typescript`/`tsc` dependency; its `build` is just `vite build`
  and there is no root typecheck step. Sub-apps use `tsc -b && vite build`.
- `story-architecture-studio` defines a `lint` script (`eslint …`) but eslint is not in
  its dependencies, so `npm run lint` fails with "eslint: not found" (pre-existing). It
  has `typecheck` and `test:e2e` (Playwright, needs `npm run test:e2e:install`) scripts.

### Optional / out-of-default-scope (require extra system deps)

- `wind-composer/` FastAPI backend + `wind-composer/web` frontend (server variant,
  Render/Docker): needs Python deps from `wind-composer/requirements-pwa.txt`. Its
  `sounddevice` dependency needs the system package `libportaudio2`.
- Story Studio Tauri desktop (`story-architecture-studio/src-tauri`): needs Rust + GTK.
- Wind Composer Python/Tkinter desktop (`wind-composer/main.py`): needs a display + mic.
