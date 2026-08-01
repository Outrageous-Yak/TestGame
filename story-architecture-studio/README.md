# Story Architecture Studio

Local-first narrative knowledge graph and comic planning workspace. Built as a parallel project alongside the existing testgame in this repository.

**Primary test project:** The Walk — seven source books adapted into ~32 comics of 20 pages each.

## Quick start

```bash
cd story-architecture-studio
npm install
npm run dev
```

Open http://localhost:5173

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run typecheck` | TypeScript check |

## Architecture

- **Domain layer** — canonical types, validation rules, utilities
- **Application layer** — `ProjectService` commands (no direct UI → DB writes)
- **Infrastructure** — IndexedDB adapter with migration support (isolated for future SQLite/Tauri)
- **UI** — React + Zustand + React Router

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [STATUS.md](./STATUS.md) for phase completion details.

## Current scope (v0.1 foundation)

Phases 0–2 are partially complete:

- Project create/open/duplicate/archive/delete
- Node and relationship CRUD with soft-delete
- Explorer with search, type filter, inspector, backlinks
- JSON import/export with validation
- CSV export for nodes and relationships
- Mermaid source generation from relationships
- The Walk seed project (books 1–7, major characters/locations/creatures/themes)

Not yet implemented: seven master trees, 2D graph, timeline, issue board, 20-page planner, validation UI, Tauri desktop shell.

## Folder structure

```
story-architecture-studio/
├── src/domain/          # Types, validation, utilities
├── src/application/     # Services and commands
├── src/infrastructure/  # Persistence, import/export
├── src/features/        # UI feature pages
├── src/components/      # Shared UI
├── fixtures/            # Test/seed data
└── docs/                # Additional documentation
```

## Specification

Built from the Story Architecture Studio Cursor Master Specification (v1.0) with engineering corrections v1.1.
