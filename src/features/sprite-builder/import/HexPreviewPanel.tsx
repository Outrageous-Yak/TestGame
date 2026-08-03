import React from "react";
import type { SavedCharacter } from "../spriteTypes";
import { characterAsSingleFrameSprite } from "../spriteTypes";
import { SpritePreview } from "../SpritePreview";
import type { HexPreviewBackground } from "./importAssistantTypes";

const HEX_BACKGROUNDS: Array<{ id: HexPreviewBackground; label: string; className: string }> = [
  { id: "transparent", label: "Transparent", className: "hexBgTransparent" },
  { id: "white", label: "White", className: "hexBgWhite" },
  { id: "dark", label: "Dark", className: "hexBgDark" },
  { id: "forest", label: "Forest Hex", className: "hexBgForest" },
  { id: "grass", label: "Grass Hex", className: "hexBgGrass" },
  { id: "snow", label: "Snow Hex", className: "hexBgSnow" },
  { id: "lava", label: "Lava Hex", className: "hexBgLava" },
  { id: "portal", label: "Portal Hex", className: "hexBgPortal" },
  { id: "stone", label: "Stone Hex", className: "hexBgStone" },
  { id: "water", label: "Water Hex", className: "hexBgWater" },
  { id: "dungeon", label: "Dungeon Hex", className: "hexBgDungeon" },
];

type HexPreviewPanelProps = {
  character: SavedCharacter;
  background: HexPreviewBackground;
  onBackgroundChange: (bg: HexPreviewBackground) => void;
};

export function HexPreviewPanel({ character, background, onBackgroundChange }: HexPreviewPanelProps) {
  const sprite = characterAsSingleFrameSprite(character, 0);
  const bg = HEX_BACKGROUNDS.find((b) => b.id === background) ?? HEX_BACKGROUNDS[0]!;

  return (
    <div className="hexPreviewPanel">
      <h3 className="assistantTitle">Hex preview</h3>
      <p className="spriteHint">See how your sprite reads on different board tiles.</p>
      <div className={"hexPreviewStage " + bg.className}>
        <div className="hexPreviewTile">
          <SpritePreview sprite={sprite} size={96} />
        </div>
      </div>
      <div className="previewBgPicker">
        {HEX_BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={"btn" + (background === b.id ? " primary" : "")}
            onClick={() => onBackgroundChange(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { HEX_BACKGROUNDS };
