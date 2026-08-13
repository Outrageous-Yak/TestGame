import React from "react";
import type { EncounterTier } from "../../engine/encounters/redEncounter";

export type RedEncounterPanelProps = {
  encounterId: string;
  title?: string;
  tier?: EncounterTier;
  onContinue: () => void;
};

/**
 * Step 5A presentation shell — acknowledgement only.
 * No dice, punishments, lives, or fake rolls.
 */
export function RedEncounterPanel({ encounterId, title, tier, onContinue }: RedEncounterPanelProps) {
  const heading = title?.trim() || "ENCOUNTER";
  return (
    <div
      className="encounterScene redEncounterScene"
      role="dialog"
      aria-modal="true"
      aria-labelledby="redEncounterTitle"
    >
      <div className="goalScenePanel redEncounterPanel">
        <div className="goalSceneBadge redEncounterBadge" aria-hidden="true">
          !
        </div>
        <h2 id="redEncounterTitle" className="goalTitle">
          {heading}
        </h2>
        {tier != null ? <p className="redEncounterTier">Tier {tier}</p> : null}
        <p className="strandedSceneMessage">An encounter blocks your path.</p>
        <p className="tp-hint redEncounterIdHint" aria-hidden="true">
          {encounterId}
        </p>
        <div className="encounterButtons goalSceneButtons">
          <button type="button" className="btn primary" autoFocus onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
