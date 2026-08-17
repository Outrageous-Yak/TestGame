/**
 * Step 5C — Red encounter dice resolution (pure domain).
 *
 * Randomness is injected separately from outcome classification.
 * Tests must force 1–6; never rely on statistical Math.random.
 */

import type { EncounterTier } from "./redEncounter";
import { isEncounterTier } from "./redEncounter";

export type RedEncounterOutcome = "success" | "banishment";

export type RedEncounterRollResult =
  | {
      ok: true;
      tier: EncounterTier;
      roll: number;
      outcome: RedEncounterOutcome;
      /** Inclusive minimum face that succeeds for this tier. */
      successAtOrAbove: number;
    }
  | {
      ok: false;
      reason: "invalid_tier" | "invalid_roll";
      tier: unknown;
      roll: unknown;
    };

/** Minimum face that succeeds (inclusive). Banishment is 1..(min-1). */
export const RED_TIER_SUCCESS_AT_OR_ABOVE: Record<EncounterTier, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
};

/**
 * Legacy / unset authored tier → runtime Tier 1.
 * Does not rewrite JSON; resolution fallback only.
 */
export function resolveEffectiveRedTier(tier: EncounterTier | null | undefined): EncounterTier {
  if (isEncounterTier(tier)) return tier;
  return 1;
}

export function isValidD6(roll: unknown): roll is number {
  return typeof roll === "number" && Number.isInteger(roll) && roll >= 1 && roll <= 6;
}

/**
 * Classify a single authoritative six-sided roll for a Red encounter tier.
 * Deterministic and unit-testable — no RNG here.
 */
export function resolveRedEncounterRoll(
  tier: EncounterTier | null | undefined,
  roll: unknown
): RedEncounterRollResult {
  const effective = resolveEffectiveRedTier(tier);
  if (!isEncounterTier(effective)) {
    return { ok: false, reason: "invalid_tier", tier, roll };
  }
  if (!isValidD6(roll)) {
    return { ok: false, reason: "invalid_roll", tier: effective, roll };
  }
  const successAtOrAbove = RED_TIER_SUCCESS_AT_OR_ABOVE[effective];
  const outcome: RedEncounterOutcome = roll >= successAtOrAbove ? "success" : "banishment";
  return { ok: true, tier: effective, roll, outcome, successAtOrAbove };
}

export type D6RollSource = () => number;

/** Production d6 — isolate Math.random from React/presentation. */
export function rollD6(source: D6RollSource = defaultD6Source): number {
  const n = source();
  if (!isValidD6(n)) {
    throw new Error(`rollD6 source returned invalid face: ${String(n)}`);
  }
  return n;
}

function defaultD6Source(): number {
  return 1 + Math.floor(Math.random() * 6);
}

/** Human-facing escape threshold copy, e.g. "Roll 3+ to escape." */
export function redEncounterEscapeHint(tier: EncounterTier | null | undefined): string {
  const effective = resolveEffectiveRedTier(tier);
  const min = RED_TIER_SUCCESS_AT_OR_ABOVE[effective];
  return `Roll ${min}+ to escape.`;
}
