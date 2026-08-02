# Decisions

## D001 — Parallel project location

**Decision:** Build Sound Studio in `sound-studio/` alongside the existing testgame and story-architecture-studio projects.

**Reason:** User requested a new parallel sound app without replacing existing workspace content.

## D002 — IndexedDB for projects and audio blobs

**Decision:** Store project metadata and audio file blobs in IndexedDB.

**Reason:** Browser-local persistence without a backend; matches Story Architecture Studio's browser-first approach.

## D003 — Web Audio API for mixing

**Decision:** Use Web Audio API with per-layer gain nodes and a master bus.

**Reason:** Native browser mixing with mute/solo/volume without external dependencies.

## D004 — JSON manifest export (not bundled audio)

**Decision:** Export references clip metadata and mixer settings as JSON; blobs remain in IndexedDB.

**Reason:** Keeps export lightweight; game integration can wire paths separately.

## D005 — Zustand for UI state

**Decision:** Zustand over Redux.

**Reason:** Simple API for a single-user local app; consistent with Story Architecture Studio.
