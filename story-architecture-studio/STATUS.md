# STATUS — Story Architecture Studio

Last updated: 2026-08-01

## Overall: v0.1 foundation (Phases 0–2 partial)

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — Repository & decisions | **Complete** | App launches, docs exist, tests scaffolded |
| 1 — Domain & persistence | **Complete** | IndexedDB, migrations, CRUD, import/export round-trip |
| 2 — Project shell & explorer | **Partial** | Dashboard, explorer, inspector, search, backlinks work |
| 3 — Trees | Not started | All seven trees disabled in nav |
| 4 — Graph, Mermaid, timeline | **Partial** | Mermaid text export only; no React Flow graph or timeline |
| 5 — Issue board | Not started | |
| 6 — 20-page planner | Not started | |
| 7 — Page details | Not started | |
| 8 — Validation & impact | **Partial** | Domain validation rules; no UI |
| 9 — Backup & hardening | **Partial** | Snapshots on delete/import; no recovery UI |
| 10 — Walk seed | **Partial** | Seed creates books, major nodes, sample relationships |

## What works today

- Create, open, list, duplicate, archive, delete projects
- Create/edit/archive nodes with UUID identity and slug uniqueness
- Create/archive typed relationships
- Full-text search and type filtering in Explorer
- Inspector with overview, relationships, incoming/outgoing backlinks
- JSON export/import with pre-commit validation
- CSV export for nodes and relationships
- Mermaid diagram source generation from relationships
- "The Walk" seed project with Books 1–7 and major story nodes
- Unit tests for persistence, validation, and import round-trip

## Known limitations

- **Persistence:** IndexedDB in browser (not SQLite/Tauri yet)
- **Merge import:** Not implemented (replace only)
- **Undo/redo:** Not implemented
- **Trees, graph, timeline, issue planner:** Not implemented
- **Validation UI:** Rules exist in domain; no Validation view
- **Autosave debounce:** Saves on each command; no explicit debounce timer
- **Playwright e2e:** Not yet scaffolded

## How to verify

```bash
cd story-architecture-studio
npm install
npm run typecheck
npm run test
npm run dev
```

1. Create "The Walk" seed from Dashboard
2. Open Explorer — confirm Aerin, Keth, Azurefold, etc.
3. Select Aerin — confirm relationships in inspector
4. Export JSON from Import/Export
5. Refresh browser — project should persist in IndexedDB

## Next recommended phase

**Continue Phase 2** — relationship editor improvements, source tab, keyboard shortcuts, then **Phase 3** Story and Character trees.
