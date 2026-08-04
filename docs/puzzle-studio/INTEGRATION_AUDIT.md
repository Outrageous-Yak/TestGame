# Puzzle Studio — Integration Audit (PR #34)

Generated during final integration audit before GitHub Pages preview.

## Canonical analysis module paths

| System | Canonical source | Studio import path |
|--------|------------------|-------------------|
| Track validation | `src/engine/trackValidator.ts` → `validateTrack` | `studioAnalysis.ts` → `../../engine/trackValidator` |
| Optimal solver + replay | `src/engine/trackAnalysis.ts` → `computeOptimalSolution`, `formatReplay` | `studioAnalysis.ts` → `../../engine/trackAnalysis` |
| Puzzle fitness | `src/engine/puzzleFitness.ts` → `analyzePuzzleFitness`, `countSolutionsWithin` | `studioAnalysis.ts` → `../../engine/puzzleFitness` |
| Similarity | `src/engine/trackAnalysis.ts` → `compareToScenario` | `studioAnalysis.ts` → `compareTracks` wrapper |
| Soft-lock detection | `src/engine/puzzleFitness.ts` → `detectSoftLocks` (via fitness) | indirect via fitness report |
| Dead gameplay | `src/engine/puzzleFitness.ts` → `detectDeadGameplay` (via fitness) | indirect via fitness report |
| Playtest moves | `src/engine/api.ts` → `tryMove` | `PuzzleStudioScreen.tsx` → `../../engine/api` |
| Replay reconstruction | `src/engine/rules.ts` → `attemptMove` | `studioBoard.ts` → `../../engine/rules` |

No duplicate validator or solver implementations exist under `src/features/puzzle-studio/`.

## Divergence vs `cursor/forgotten-citadel-09fd`

Engine analysis files are identical to the Forgotten Citadel branch (no diff).

## Routing

- `?dev=true` → start screen with Developer menu
- `?studio=true` → Puzzle Studio directly

## Preview

- https://outrageous-yak.github.io/TestGame/preview/puzzle-studio/
- `?dev=true` or `?studio=true`
