# Architecture

## Layers

```
UI (React features/components)
    ↓ calls
Application (ProjectService, commands)
    ↓ uses
Domain (types, validation, rules)
    ↓ persisted via
Infrastructure (IndexedDbAdapter, import/export)
```

## Key constraints (from specification)

1. **One source of truth** — nodes and relationships are canonical; views derive from them
2. **Immutable UUIDs** — titles and slugs may change; IDs never do
3. **No UI → database direct writes** — all mutations go through `ProjectService`
4. **Soft delete** — nodes and relationships use `archivedAt` instead of hard delete by default
5. **Import validates before commit** — `validateExport()` runs before import

## Persistence strategy

Current: **IndexedDB** with versioned schema (migration v1).

The `PersistenceAdapter` interface in `src/infrastructure/persistence/types.ts` is designed so SQLite/Tauri can replace IndexedDB without changing domain or application code.

Planned: Tauri 2 + SQLite via SQLx when desktop packaging is added.

**Implemented:** Tauri 2 shell in `src-tauri/` with `SqliteAdapter` implementing `PersistenceAdapter`. Browser builds continue to use `IndexedDbAdapter`. Selection happens in `src/infrastructure/persistence/index.ts` via `initPersistenceAdapter()`.

## State management

**Zustand** store (`src/app/providers/store.ts`) holds UI state and delegates mutations to `ProjectService`.

## Data model

See `src/domain/types.ts` for full entity definitions:

- `Project`, `Node`, `Relationship`
- Planning: `Arc`, `Issue`, `Page`, `PanelBeat`
- Reader knowledge: `ReaderState`
- `SourceReference`, `ValidationFinding`, `Snapshot`

## Export contract

JSON schema version 1 — see specification Section 18.1. Implemented in `ProjectExport` type and `infrastructure/importExport`.

## Testing

- **Vitest** + **fake-indexeddb** for persistence tests
- Domain validation unit tests
- Playwright e2e planned for Phase 9
