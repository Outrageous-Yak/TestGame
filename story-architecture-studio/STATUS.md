# STATUS — Story Architecture Studio

Last updated: 2026-08-01

## Overall: v1.0 (spec complete)

| Phase | Status | Notes |
|-------|--------|-------|
| 0–7 | **Complete** | Foundation through page planner |
| 8 — Validation & impact | **Complete** | Validation, dismissals, impact analysis, reveal-move simulation |
| 9 — Backup & hardening | **Complete** | Snapshots, undo/redo, CSV import, crash recovery |
| 10 — Walk seed | **Complete** | |
| Desktop shell | **Complete** | Tauri 2 scaffold + SQLite adapter |

## v1.0 highlights

- **Crash recovery** — autosave checkpoints before persist; recovery modal on project open
- **Impact simulation** — move reveals/mysteries across issues with validation delta preview
- **Validation rules** — `UNSEEDED_PAYOFF`, `FORESHADOW_AFTER_REVEAL`, `PAYOFF_BEFORE_REVEAL`, `ORPHANED_READER_STATE`
- **Relationship timing** — `issueStart` / `issueEnd` on foreshadow/payoff links in inspector
- **Tauri + SQLite** — desktop shell in `src-tauri/`, `SqliteAdapter` swaps in at runtime

## Commands

```bash
cd story-architecture-studio
npm install
npm test              # 24 unit tests
npm run test:e2e      # 3 Playwright tests
npm run dev           # browser + IndexedDB
npm run tauri:dev     # desktop + SQLite (requires Rust 1.88+)
```

## Deployment

GitHub Pages workflow at `.github/workflows/deploy-sas.yml` — enable Pages on the repo for `https://<user>.github.io/TestGame/`.
