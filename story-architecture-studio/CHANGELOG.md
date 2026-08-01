# Changelog

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
