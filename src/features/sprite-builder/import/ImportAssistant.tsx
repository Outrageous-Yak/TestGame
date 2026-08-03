import React from "react";
import type {
  ImportAssistantChoices,
  SubjectType,
  SpriteFramingType,
  LogicalSpriteSize,
  PixelStylePreset,
  PalettePreset,
} from "./importAssistantTypes";
import { DEFAULT_ASSISTANT_CHOICES } from "./importAssistantTypes";
import { logicalSizeLabel, palettePresetHint } from "./importPresets";

const LAST_STEP = 5;

type ImportAssistantProps = {
  choices: ImportAssistantChoices;
  onChange: (choices: ImportAssistantChoices) => void;
  step: number;
  onStepChange: (step: number) => void;
  onComplete: (choices: ImportAssistantChoices) => void;
};

const SUBJECTS: Array<{ id: SubjectType; label: string }> = [
  { id: "player-character", label: "Player Character" },
  { id: "npc", label: "NPC" },
  { id: "monster", label: "Monster" },
  { id: "boss", label: "Boss" },
  { id: "creature", label: "Creature" },
  { id: "pet", label: "Pet" },
  { id: "object", label: "Object" },
  { id: "decoration", label: "Decoration" },
];

const FRAMINGS: Array<{ id: SpriteFramingType; label: string; hint: string }> = [
  { id: "full-body", label: "Full Body", hint: "Maximise height, keep feet visible" },
  { id: "bust", label: "Bust", hint: "Crop around shoulders" },
  { id: "portrait", label: "Portrait", hint: "Head and upper torso" },
  { id: "token", label: "Token", hint: "Fill square, optimised for hex board" },
  { id: "face", label: "Face", hint: "Close-up face" },
  { id: "floating-object", label: "Floating Object", hint: "Centre object in frame" },
];

const SIZES: LogicalSpriteSize[] = [32, 64, 128];

const STYLES: Array<{ id: PixelStylePreset; label: string }> = [
  { id: "nes", label: "NES" },
  { id: "game-boy", label: "Game Boy" },
  { id: "snes", label: "SNES" },
  { id: "modern-pixel", label: "Modern Pixel" },
  { id: "soft-pixel", label: "Soft Pixel" },
  { id: "high-detail", label: "High Detail" },
  { id: "board-token", label: "Board Token" },
];

const PALETTES: PalettePreset[] = [8, 16, 24, 32, 64];

export function ImportAssistant({ choices, onChange, step, onStepChange, onComplete }: ImportAssistantProps) {
  const set = <K extends keyof ImportAssistantChoices>(key: K, value: ImportAssistantChoices[K]) => {
    onChange({ ...choices, [key]: value });
  };

  const handleBack = () => {
    if (step > 1) onStepChange(step - 1);
  };

  const handleContinue = () => {
    if (step < LAST_STEP) {
      onStepChange(step + 1);
    } else {
      onComplete(choices);
    }
  };

  return (
    <div className="importAssistant">
      <div className="assistantProgress" aria-label={`Assistant step ${step} of ${LAST_STEP}`}>
        {Array.from({ length: LAST_STEP }, (_, i) => i + 1).map((n) => (
          <span key={n} className={"assistantDot" + (step === n ? " active" : "") + (step > n ? " done" : "")} />
        ))}
      </div>

      <div className="assistantBody">
      {step === 1 ? (
        <div className="assistantStepPanel">
          <h3 className="assistantTitle">What are you creating?</h3>
          <div className="assistantGrid">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={"assistantCard" + (choices.subjectType === s.id ? " active" : "")}
                onClick={() => set("subjectType", s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="assistantStepPanel">
          <h3 className="assistantTitle">What type of sprite?</h3>
          <div className="assistantGrid">
            {FRAMINGS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={"assistantCard" + (choices.spriteFraming === f.id ? " active" : "")}
                onClick={() => set("spriteFraming", f.id)}
              >
                <strong>{f.label}</strong>
                <span className="assistantHint">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="assistantStepPanel">
          <h3 className="assistantTitle">What size should the original sprite be?</h3>
          <div className="assistantGrid sizeGrid">
            {SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                className={"assistantCard" + (choices.logicalSize === sz ? " active" : "")}
                onClick={() => set("logicalSize", sz)}
              >
                <strong>{sz}×{sz}</strong>
                <span className="assistantHint">{logicalSizeLabel(sz)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="assistantStepPanel">
          <h3 className="assistantTitle">What pixel style?</h3>
          <div className="assistantGrid">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={"assistantCard" + (choices.pixelStyle === s.id ? " active" : "")}
                onClick={() => set("pixelStyle", s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="assistantStepPanel">
          <h3 className="assistantTitle">Palette preset</h3>
          <div className="assistantGrid sizeGrid">
            {PALETTES.map((p) => (
              <button
                key={p}
                type="button"
                className={"assistantCard" + (choices.palettePreset === p ? " active" : "")}
                onClick={() => set("palettePreset", p)}
              >
                <strong>{p} colours</strong>
                <span className="assistantHint">{palettePresetHint(p)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      </div>

      <div className="importNavRow importAssistantNav">
        <button type="button" className="btn" onClick={handleBack} disabled={step <= 1}>
          Back
        </button>
        <button type="button" className="btn primary" onClick={handleContinue}>
          {step < LAST_STEP ? "Next" : "Continue to Crop"}
        </button>
      </div>
    </div>
  );
}

export { DEFAULT_ASSISTANT_CHOICES };
