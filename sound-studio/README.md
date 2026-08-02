# Sound Studio

Local-first audio workspace for game and story projects. Built as a parallel project alongside the Hex Game and Story Architecture Studio in this repository.

## Quick start

```bash
cd sound-studio
npm install
npm run dev
```

Open http://localhost:5173

### GitHub Pages

Deployed automatically on push to `main` at **https://outrageous-yak.github.io/TestGame/sound/** (alongside the Hex Game at `/TestGame/` and Studio at `/TestGame/studio/`).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run typecheck` | TypeScript check |

## Features

- **Projects** — create and manage sound projects stored in IndexedDB
- **Library** — import audio files (MP3, WAV, OGG, etc.) with category tags
- **Mixer** — layered ambient / music / SFX / master controls with mute, solo, loop
- **Cue Board** — 12 trigger pads for playtesting SFX during game development
- **Export** — download JSON manifest for game integration

## Architecture

- **Domain** — `SoundProject`, clips, mixer layers, cue slots
- **Infrastructure** — IndexedDB persistence for projects and audio blobs
- **Application** — Web Audio API engine for layered playback
- **UI** — React + Zustand + React Router

## Folder structure

```
sound-studio/
├── src/domain/           # Types and factories
├── src/infrastructure/   # IndexedDB adapter
├── src/application/      # Audio engine
├── src/features/         # Page components
├── src/app/              # Shell, routing, store
└── src/styles/           # Global CSS
```
