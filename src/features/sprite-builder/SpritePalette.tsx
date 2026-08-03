import React from "react";
import type { SpritePaletteColor } from "./spriteTypes";
import { TRANSPARENT_INDEX } from "./spriteConstants";

type SpritePaletteProps = {
  palette: SpritePaletteColor[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function SpritePalette({ palette, selectedIndex, onSelect }: SpritePaletteProps) {
  return (
    <div className="spritePalette" role="listbox" aria-label="Color palette">
      {palette.map((color, index) => {
        if (index === TRANSPARENT_INDEX) return null;
        const swatchStyle: React.CSSProperties =
          color.value === "transparent"
            ? { background: "repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 50% / 8px 8px" }
            : { background: color.value };

        return (
          <button
            key={color.id}
            type="button"
            role="option"
            aria-selected={selectedIndex === index}
            className={"spriteSwatch" + (selectedIndex === index ? " active" : "")}
            style={swatchStyle}
            title={color.name}
            onClick={() => onSelect(index)}
          />
        );
      })}
    </div>
  );
}
