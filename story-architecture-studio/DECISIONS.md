# Decisions

## D001 — Parallel project location

**Decision:** Build Story Architecture Studio in `story-architecture-studio/` alongside the existing testgame project.

**Reason:** User requested building "parallel here" without replacing existing workspace content.

## D002 — IndexedDB over SQLite for v0.1 foundation

**Decision:** Use IndexedDB with an abstracted `PersistenceAdapter` for Phase 0–2.

**Reason:** Cloud agent environment supports browser-based development immediately. Spec allows browser-only PoC when persistence is isolated. Tauri/SQLite deferred to a later phase.

## D003 — Zustand for UI state

**Decision:** Zustand over Redux Toolkit.

**Reason:** Simpler API for single-user local app; sufficient for current scope.

## D004 — No stub features in navigation

**Decision:** Disabled nav items for unimplemented views with `title` tooltips indicating phase.

**Reason:** Spec requires buttons either work or are visibly disabled with explanation.

## D005 — Creature Tree retained (not Entity Tree)

**Decision:** Keep seven trees from v1.0 spec; note v1.1 engineering correction recommending Entity Tree as future consideration.

**Reason:** Master specification is authoritative; v1.1 correction recorded here for future evaluation.

## D006 — React Router for navigation

**Decision:** react-router-dom v6 with nested layout in AppShell.

**Reason:** Standard pattern; supports future deep-linking to nodes/issues.
