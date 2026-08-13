/**
 * Shared commit helpers for Red encounter resolution (testable without React).
 * GameController orchestrates UI around these domain steps.
 */

import type { GameState } from "../types";
import {
  markEncounterConsumed,
  type EncounterId,
  type EncounterTier,
} from "./redEncounter";
import {
  resolveEffectiveRedTier,
  resolveRedEncounterRoll,
  type RedEncounterOutcome,
} from "./redEncounterDice";
import { applyRedEncounterBanishment, type RedBanishmentResult } from "./redEncounterBanishment";

export type LockedRedRoll = {
  encounterId: EncounterId;
  layer: number;
  tier: EncounterTier;
  roll: number;
  outcome: RedEncounterOutcome;
};

/**
 * Classify a single roll and lock it. Returns null if roll/tier is invalid.
 * Callers must refuse a second lock while one is already held.
 */
export function lockRedEncounterRoll(opts: {
  encounterId: EncounterId;
  layer: number;
  tier: EncounterTier | null | undefined;
  roll: number;
  alreadyLocked: boolean;
}): LockedRedRoll | null {
  if (opts.alreadyLocked) return null;
  const result = resolveRedEncounterRoll(opts.tier, opts.roll);
  if (!result.ok) return null;
  return {
    encounterId: opts.encounterId,
    layer: opts.layer,
    tier: result.tier,
    roll: result.roll,
    outcome: result.outcome,
  };
}

/** Success commit: consume encounter only. */
export function commitRedEncounterSuccess(state: GameState, encounterId: EncounterId): void {
  markEncounterConsumed(state, encounterId);
}

/**
 * Banishment commit: consume first, then restore layer-entry snapshot.
 * Consume is preserved across restore (Step 5B policy).
 */
export function commitRedEncounterBanishment(
  state: GameState,
  encounterId: EncounterId,
  layer: number
): RedBanishmentResult {
  markEncounterConsumed(state, encounterId);
  return applyRedEncounterBanishment(state, layer);
}

export function effectiveTierLabel(tier: EncounterTier | null | undefined): EncounterTier {
  return resolveEffectiveRedTier(tier);
}
