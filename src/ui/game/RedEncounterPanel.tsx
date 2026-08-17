import React from "react";
import type { EncounterTier } from "../../engine/encounters/redEncounter";
import type { RedEncounterOutcome } from "../../engine/encounters/redEncounterDice";
import { redEncounterEscapeHint, resolveEffectiveRedTier } from "../../engine/encounters/redEncounterDice";
import { DiceCube } from "./DiceCube";
import type { DiceRot } from "./diceGeometry";

export type RedEncounterPhase =
  | "intro"
  | "rolling"
  | "result_success"
  | "result_banish"
  | "banish_failed";

export type RedEncounterPanelProps = {
  encounterId: string;
  title?: string;
  /** Authored tier (optional). Display uses effective tier. */
  tier?: EncounterTier;
  phase: RedEncounterPhase;
  /** Authoritative final roll once known. */
  roll?: number;
  outcome?: RedEncounterOutcome;
  /** Live dice display face (may flicker during animation). */
  diceValue: number;
  diceRot: DiceRot;
  diceRolling: boolean;
  faceUrl: (n: number) => string;
  diceBorderCss?: string;
  onRoll: () => void;
  onContinue: () => void;
};

/**
 * Step 5C Red encounter resolution panel.
 * Intro → Roll → Result (success / banish / restore failure) → Continue.
 */
export function RedEncounterPanel({
  encounterId,
  title,
  tier,
  phase,
  roll,
  outcome,
  diceValue,
  diceRot,
  diceRolling,
  faceUrl,
  diceBorderCss,
  onRoll,
  onContinue,
}: RedEncounterPanelProps) {
  const heading = title?.trim() || "ENCOUNTER";
  const effectiveTier = resolveEffectiveRedTier(tier);
  const escapeHint = redEncounterEscapeHint(effectiveTier);
  const showDice = phase === "rolling" || phase === "result_success" || phase === "result_banish";
  const controlsLocked = phase === "rolling";
  const canContinue =
    phase === "result_success" || phase === "result_banish" || phase === "banish_failed";

  let bodyMessage = "An encounter blocks your path.";
  let resultLabel: string | null = null;
  if (phase === "intro") {
    bodyMessage = escapeHint;
  } else if (phase === "rolling") {
    bodyMessage = "Rolling…";
  } else if (phase === "result_success") {
    bodyMessage = "You escape the encounter.";
    resultLabel = "ESCAPED";
  } else if (phase === "result_banish") {
    bodyMessage = "Return to the point where you entered this layer.";
    resultLabel = "BANISHED";
  } else if (phase === "banish_failed") {
    bodyMessage = "The layer checkpoint could not be restored.";
    resultLabel = "BANISHMENT FAILED";
  }

  return (
    <div
      className="encounterScene redEncounterScene"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redEncounterTitle"
      style={
        diceBorderCss
          ? ({ ["--diceBorderUrl" as string]: diceBorderCss } as React.CSSProperties)
          : undefined
      }
    >
      <div className="goalScenePanel redEncounterPanel">
        <div className="goalSceneBadge redEncounterBadge" aria-hidden="true">
          !
        </div>
        <h2 id="redEncounterTitle" className="goalTitle">
          {heading}
        </h2>
        <p className="redEncounterTier">Tier {effectiveTier}</p>
        {resultLabel ? (
          <p
            className={
              "redEncounterResultLabel" +
              (outcome === "banishment" || phase === "banish_failed"
                ? " redEncounterResultLabel--banish"
                : " redEncounterResultLabel--success")
            }
          >
            {resultLabel}
          </p>
        ) : null}
        <p className="strandedSceneMessage">{bodyMessage}</p>
        {typeof roll === "number" && phase !== "intro" && phase !== "rolling" ? (
          <p className="redEncounterRollText" aria-live="polite">
            Roll: <b>{roll}</b>
          </p>
        ) : null}

        {showDice ? (
          <div className="redEncounterDiceRow">
            <DiceCube
              value={diceValue}
              rot={diceRot}
              rolling={diceRolling}
              faceUrl={faceUrl}
              aria-label={
                typeof roll === "number" && !diceRolling
                  ? `Die showing ${roll}`
                  : "Die rolling"
              }
            />
          </div>
        ) : null}

        <p className="tp-hint redEncounterIdHint" aria-hidden="true">
          {encounterId}
        </p>

        <div className="encounterButtons goalSceneButtons">
          {phase === "intro" ? (
            <button
              type="button"
              className="btn primary"
              autoFocus
              disabled={controlsLocked}
              onClick={onRoll}
            >
              Roll
            </button>
          ) : null}
          {canContinue ? (
            <button
              type="button"
              className="btn primary"
              autoFocus
              disabled={controlsLocked}
              onClick={onContinue}
            >
              Continue
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
