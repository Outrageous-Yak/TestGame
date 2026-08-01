# Changelog

## [1.0.0] — 2026-08-01

### Added

- Crash recovery pipeline with autosave checkpoints and recovery modal
- Full impact simulation: move reveal/mystery across issues with apply
- Validation rules: `UNSEEDED_PAYOFF`, `FORESHADOW_AFTER_REVEAL`, `PAYOFF_BEFORE_REVEAL`, `ORPHANED_READER_STATE`
- Relationship `issueStart` / `issueEnd` fields in inspector for foreshadow/payoff links
- Tauri 2 desktop shell (`src-tauri/`) with SQLite persistence adapter
- Persistence factory: IndexedDB in browser, SQLite in Tauri
- Shared `persistProjectExport` helper for recovery-aware saves
- 3 new unit tests (24 total)

## [0.5.0] — 2026-08-01

### Added

- Mobile drawer navigation (hamburger menu, overlay, slide-in sidebar)
- Source references CRUD in node inspector
- Editorial reports page (unused nodes, mysteries, payoffs, adaptation gaps)
- Dark mode theme toggle with CSS variables
- CSV import for nodes and relationships
- GitHub Pages deploy workflow
- Validation rules: `ORPHANED_PRIMARY`, `DUPLICATE_TITLE`
- 5 new unit tests (21 total)

### Fixed

- Missing `historyService` import in store
- Mobile sidebar off-screen positioning

## [0.4.0] — 2026-08-01

### Added

- Undo/redo with session command history (header buttons)
- Snapshots & Recovery page (create, list, restore)
- Merge import with preview (additions, updates, conflicts)
- Impact analysis panel in node inspector
- 4 new unit tests (16 total)

## [0.3.0] — 2026-08-01

### Added

- React Flow 2D relationship graph with depth, type/canon filters, and node focus
- Path-between-nodes finder on graph page
- Reader knowledge editor (add/edit/delete per issue)
- Persisted validation dismissals
- Playwright e2e smoke tests (3 tests)
- Graph view model unit tests

### Changed

- Validation page supports dismiss with reason
- Navigation includes Graph and Reader Knowledge links

## [0.2.0] — 2026-08-01

### Added

- All 7 master trees as generated views (Story, Character, Reader, World, Mythology, Creature, Adaptation)
- Issue board with 32-issue series, drag-reorder, and metadata editing
- 20-page issue planner with default roles, scene drag-and-drop, density warnings
- Page planner with panel beats and Markdown production brief export
- Validation UI with core editorial rules
- Timeline view from chronology properties
- Walk seed enhanced with Issue 1 vertical-slice content (scene, event, mystery, reader state)
- Planning service, tree view models, validation service
- 4 additional unit tests (10 total)

### Changed

- Dashboard quick-start workflow
- Navigation enables trees, issues, timeline, validation

## [0.1.0] — 2026-08-01

### Added

- Initial Story Architecture Studio project scaffold
- Domain model with full node/relationship types per specification
- IndexedDB persistence with migration v1
- ProjectService with project/node/relationship CRUD
- Soft-delete (archive) for nodes and relationships
- JSON import/export with validation
- CSV export for nodes and relationships
- Mermaid source generation
- The Walk seed project generator
- Dashboard, Explorer, Inspector, Import/Export, Mermaid pages
- Unit tests for persistence and validation
- README, STATUS, ARCHITECTURE, DECISIONS documentation

### Not included

- Tauri desktop shell
- Seven master trees
- 2D graph (React Flow)
- Issue board and 20-page planner
- Validation UI
- Playwright e2e tests
