# STATUS — Story Architecture Studio

Last updated: 2026-08-01

## Overall: v0.1 (~75% of spec)

Core workflow plus graph and reader knowledge editing:

**source node → tree/graph view → issue → page → export brief**

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Repository & decisions | **Complete** | |
| 1 — Domain & persistence | **Complete** | |
| 2 — Project shell & explorer | **Complete** | |
| 3 — Trees | **Complete** | All 7 generated views |
| 4 — Graph, Mermaid, timeline | **Complete** | React Flow graph, path finder, Mermaid, timeline |
| 5 — Issue board | **Complete** | |
| 6 — 20-page planner | **Complete** | |
| 7 — Page details | **Complete** | |
| 8 — Validation & impact | **Partial** | Validation UI + dismiss persistence; no impact reports |
| 9 — Backup & hardening | **Partial** | Snapshots on delete/import; Playwright e2e scaffolded |
| 10 — Walk seed | **Complete** | |

## New in this iteration

- **2D relationship graph** (React Flow) with depth, type/canon filters, node focus
- **Path between nodes** finder
- **Reader knowledge editor** — add/edit/delete per issue
- **Validation dismissals** persisted across runs
- **Playwright e2e** — 3 smoke tests

## Still missing

- Tauri + SQLite desktop shell
- Undo/redo
- Merge import
- Impact analysis reports
- Recovery UI after crash

## Commands

```bash
cd story-architecture-studio
npm install
npm test                 # unit tests (12)
npm run test:e2e:install # first time only
npm run test:e2e         # Playwright smoke tests
npm run dev
```
