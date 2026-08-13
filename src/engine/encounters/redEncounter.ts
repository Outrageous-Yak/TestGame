/**
 * Step 5A — Red Encounter Foundation (domain helpers).
 *
 * RED / runtime `cosmic` cards are encounters.
 * Dice, banishment, rewind, and snapshots are deferred to Steps 5B/5C.
 */

import type { GameState } from "../types";

/** Stable authored encounter identity (prefer planner CardFeature.id). */
export type EncounterId = string;

/** Forward-compatible tier; optional until Step 5C resolution profiles. */
export type EncounterTier = 1 | 2 | 3 | 4;

export function isEncounterTier(value: unknown): value is EncounterTier {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** Runtime CardKey for RED encounters. */
export const RED_ENCOUNTER_CARD_KEY = "cosmic" as const;

export function isRedEncounterCardKey(card: string | null | undefined): boolean {
  return card === RED_ENCOUNTER_CARD_KEY;
}

/**
 * Deterministic fallback id for legacy production JSON that only has
 * `{ card, layer, row, col }` (no feature id).
 * Assigned at parse/load time from authored coordinates; transforms must preserve `id`.
 */
export function legacyEncounterId(layer: number, row: number, col: number): EncounterId {
  return `legacy_card_L${layer}_R${row}_C${col}`;
}

export function resolveEncounterId(
  rawId: unknown,
  layer: number,
  row: number,
  col: number
): EncounterId {
  if (typeof rawId === "string" && rawId.trim().length > 0) return rawId.trim();
  return legacyEncounterId(layer, row, col);
}

export type EncounterActivation = {
  encounterId: EncounterId;
  layer: number;
  row: number;
  col: number;
  /** Display title if authored; otherwise UI uses a generic label. */
  title?: string;
  /** Optional; not required for Step 5A acknowledgement. */
  tier?: EncounterTier;
};

/**
 * Step 5A resolution is acknowledgement only.
 * Step 5C may extend with dice / punishment outcomes.
 */
export type EncounterResolution = { kind: "acknowledge" };

export function emptyConsumedEncounterIds(): Set<EncounterId> {
  return new Set();
}

export function cloneConsumedEncounterIds(source: Iterable<EncounterId> | undefined | null): Set<EncounterId> {
  return new Set(source ?? []);
}

export function isEncounterConsumed(state: GameState, encounterId: EncounterId): boolean {
  return state.consumedEncounterIds?.has(encounterId) ?? false;
}

/**
 * Copy-on-write consume so clones / snapshots never share a mutable Set.
 */
export function markEncounterConsumed(state: GameState, encounterId: EncounterId): void {
  const next = cloneConsumedEncounterIds(state.consumedEncounterIds);
  next.add(encounterId);
  state.consumedEncounterIds = next;
}

export function resetConsumedEncounters(state: GameState): void {
  state.consumedEncounterIds = emptyConsumedEncounterIds();
}

/**
 * Decide whether landing on a card should activate a Red encounter.
 * Goal hexes must not open an encounter (Goal priority).
 */
export function shouldActivateRedEncounter(opts: {
  cardKey: string | null | undefined;
  encounterId: EncounterId | null | undefined;
  consumed: Iterable<EncounterId> | undefined | null;
  landedOnGoal: boolean;
}): boolean {
  if (opts.landedOnGoal) return false;
  if (!isRedEncounterCardKey(opts.cardKey ?? null)) return false;
  if (!opts.encounterId) return false;
  const consumed = opts.consumed instanceof Set ? opts.consumed : new Set(opts.consumed ?? []);
  return !consumed.has(opts.encounterId);
}
