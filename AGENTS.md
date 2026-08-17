# Agent notes

## Cursor Cloud specific instructions

### Product

Hex Layers puzzle game (Vite + React). Play via Start → Campaign map → track. Dev server: `npm run dev` (base `/TestGame/`).

### Step 5C — Red dice / banishment (non-obvious)

- Force a deterministic d6 in the browser: `window.__HEX_FORCE_D6 = 1..6` before clicking **Roll** on a Red encounter panel.
- Banishment restores the **current layer’s** latest layer-entry snapshot (Step 5B). It preserves `turn` / move count, `moveHistory`, and `consumedEncounterIds`. It does **not** auto-trigger portals.
- Restore failure (`no_snapshot` / `invalid_snapshot`) leaves live state unchanged and shows a contained **BANISHMENT FAILED** result — do not reload or restart the scenario.
- Solver / Simulator must **not** branch on Red dice; analysis DTOs still omit `layerEntrySnapshots`.

### Commands

See root `package.json`: `npm test`, `npm run build`, `npm run dev`. Do not “fix” the known baseline fitness / catalog failures (fc_t11–t15, Puzzle Studio catalog, partly-cloudy IDs, Fork t3).
