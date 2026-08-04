import React from "react";
import type { SavedCharacter } from "../spriteTypes";
import { frameCount, isSpriteSheet } from "../spriteTypes";
import type { ImportAssistantChoices } from "./importAssistantTypes";
import {
  computeQualityScore,
  estimateCharacterMemoryBytes,
  estimateCharacterStorageBytes,
  formatQualityStars,
} from "./importQualityScore";
import {
  downloadDataUrl,
  downloadText,
  exportCharacterJson,
  exportCharacterPng,
  exportNativeCharacterFile,
  exportSpriteSheetPng,
} from "./importExport";
import { SpritePreview } from "../SpritePreview";
import { characterAsSingleFrameSprite } from "../spriteTypes";

type CharacterSummaryPanelProps = {
  character: SavedCharacter;
  characterName: string;
  onNameChange: (name: string) => void;
  assistantChoices: ImportAssistantChoices;
  sheetTypeLabel: string;
  selectOnSave: boolean;
  onSelectOnSaveChange: (v: boolean) => void;
  onSave: () => void;
};

export function CharacterSummaryPanel({
  character,
  characterName,
  onNameChange,
  assistantChoices,
  sheetTypeLabel,
  selectOnSave,
  onSelectOnSaveChange,
  onSave,
}: CharacterSummaryPanelProps) {
  const quality = computeQualityScore(character);
  const storageBytes = estimateCharacterStorageBytes(character);
  const memoryBytes = estimateCharacterMemoryBytes(character);
  const preview = characterAsSingleFrameSprite(character, 0);

  const slug = characterName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "character";

  return (
    <div className="characterSummaryPanel">
      <h3 className="assistantTitle">Character summary</h3>

      <div className="qualityBadge" aria-label={`Import quality: ${quality.label}`}>
        <span className="qualityStars">{formatQualityStars(quality.stars)}</span>
        <span className="qualityLabel">{quality.label}</span>
      </div>

      <SpritePreview sprite={preview} size={128} />

      <label className="summaryName">
        Character name
        <input className="spriteNameInput" value={characterName} onChange={(e) => onNameChange(e.target.value)} />
      </label>

      <dl className="summaryStats">
        <dt>Sprite size</dt><dd>{assistantChoices.logicalSize}×{assistantChoices.logicalSize} (board 64×64)</dd>
        <dt>Palette size</dt><dd>{assistantChoices.palettePreset} colours</dd>
        <dt>Pixel style</dt><dd>{assistantChoices.pixelStyle}</dd>
        <dt>Sprite sheet</dt><dd>{sheetTypeLabel}</dd>
        <dt>Frames</dt><dd>{frameCount(character)}</dd>
        <dt>Storage size</dt><dd>{(storageBytes / 1024).toFixed(1)} KB</dd>
        <dt>Est. memory</dt><dd>{(memoryBytes / 1024).toFixed(1)} KB</dd>
      </dl>

      <div className="exportRow">
        <span className="spritePreviewLabel">Export</span>
        <button type="button" className="btn" onClick={() => downloadDataUrl(exportCharacterPng(character), `${slug}.png`)}>PNG</button>
        {isSpriteSheet(character) ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              const url = exportSpriteSheetPng(character);
              if (url) downloadDataUrl(url, `${slug}-sheet.png`);
            }}
          >
            Sprite Sheet PNG
          </button>
        ) : null}
        <button type="button" className="btn" onClick={() => downloadText(exportCharacterJson(character), `${slug}.json`)}>JSON</button>
        <button type="button" className="btn" onClick={() => downloadText(exportNativeCharacterFile(character), `${slug}.hexchar`)}>Native Character</button>
      </div>

      <label><input type="checkbox" checked={selectOnSave} onChange={(e) => onSelectOnSaveChange(e.target.checked)} /> Select as board character</label>

      <button type="button" className="btn primary" onClick={onSave}>
        Save Character
      </button>
    </div>
  );
}
