# Story Architecture Studio

Local-first narrative knowledge graph and comic planning workspace. Built as a parallel project alongside the existing testgame in this repository.

**Primary test project:** The Walk — seven source books adapted into ~32 comics of 20 pages each.

## Quick start

### Browser

```bash
cd story-architecture-studio
npm install
npm run dev          # includes --host for phone preview on same WiFi
```

Open http://localhost:5173

### Desktop (Tauri + SQLite)

Requires Rust 1.88+ and platform libraries (GTK on Linux, Xcode on macOS).

```bash
cd story-architecture-studio
npm install
npm run tauri:dev    # development
npm run tauri:build  # production binary
```

In the desktop shell, persistence uses SQLite via `@tauri-apps/plugin-sql`. The browser build uses IndexedDB.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (24 tests) |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run typecheck` | TypeScript check |
| `npm run tauri:dev` | Tauri desktop dev shell |
| `npm run tauri:build` | Tauri production build |

## Architecture

- **Domain layer** — canonical types, validation rules, issue inference utilities
- **Application layer** — services and commands (no direct UI → DB writes)
- **Infrastructure** — `PersistenceAdapter` with IndexedDB (browser) or SQLite (Tauri)
- **UI** — React + Zustand + React Router

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [STATUS.md](./STATUS.md) for details.

## v1.0 scope (complete)

- Full planning workflow: nodes → 7 trees / graph → 32 issues → 20-page planner → page beats → Markdown export
- Explorer, inspector, source references, impact analysis with reveal-move simulation
- Validation UI with dismissals, editorial reports, timeline, reader knowledge editor
- Undo/redo, snapshots, crash recovery, merge import, CSV import/export
- Dark mode, mobile drawer navigation
- Tauri 2 desktop shell with SQLite persistence adapter
- The Walk seed project with Issue 1 vertical-slice content

## Folder structure

```
story-architecture-studio/
├── src/domain/          # Types, validation, utilities
├── src/application/     # Services and commands
├── src/infrastructure/  # Persistence, import/export
├── src/features/        # UI feature pages
├── src/components/      # Shared UI
├── src-tauri/           # Tauri desktop shell (Rust)
└── e2e/                 # Playwright tests
```

## Specification

Built from the Story Architecture Studio Cursor Master Specification (v1.0) with engineering corrections v1.1.
