# STATUS — Story Architecture Studio

Last updated: 2026-08-01

## Overall: v0.1 (~90% of spec)

| Phase | Status | Notes |
|-------|--------|-------|
| 0–7 | **Complete** | Foundation through page planner |
| 8 — Validation & impact | **Complete** | Validation UI, dismissals, impact analysis, editorial reports |
| 9 — Backup & hardening | **Partial** | Snapshots, undo/redo, CSV import; no Tauri/SQLite |
| 10 — Walk seed | **Complete** | |

## New in this iteration

- **Mobile drawer navigation** — hamburger menu, overlay, slide-in sidebar
- **Source references CRUD** — add/edit/remove in node inspector
- **Editorial reports page** — unused nodes, mysteries, payoffs, adaptation gaps
- **Dark mode** — theme toggle with system preference default
- **CSV import** — nodes and relationships from exported CSV format
- **GitHub Pages deploy workflow** — `.github/workflows/deploy-sas.yml`
- **Extra validation rules** — `ORPHANED_PRIMARY`, `DUPLICATE_TITLE`

## Still missing

- Tauri + SQLite desktop shell
- Full impact simulation (move reveal across issues)
- Crash recovery UI

## Commands

```bash
cd story-architecture-studio
npm install
npm test          # 21 unit tests
npm run test:e2e  # 3 Playwright tests
npm run dev       # includes --host for phone on same WiFi
```
