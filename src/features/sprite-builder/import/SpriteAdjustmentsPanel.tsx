import React from "react";
import type { CharacterRenderSettings } from "./importAssistantTypes";
import { DEFAULT_RENDER_SETTINGS } from "./importAssistantTypes";

type SpriteAdjustmentsPanelProps = {
  settings: CharacterRenderSettings;
  onChange: (settings: CharacterRenderSettings) => void;
};

export function SpriteAdjustmentsPanel({ settings, onChange }: SpriteAdjustmentsPanelProps) {
  const set = <K extends keyof CharacterRenderSettings>(key: K, value: CharacterRenderSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="spriteAdjustmentsPanel">
      <h3 className="assistantTitle">Sprite adjustments</h3>
      <p className="spriteHint">Rendering only — stored pixels are not modified.</p>

      <div className="adjustGrid">
        <label><input type="checkbox" checked={settings.autoCentre} onChange={(e) => set("autoCentre", e.target.checked)} /> Auto centre</label>
        <label><input type="checkbox" checked={settings.autoScale} onChange={(e) => set("autoScale", e.target.checked)} /> Auto scale</label>

        <label>Feet position <input type="range" min={70} max={95} value={settings.feetPosition} onChange={(e) => set("feetPosition", Number(e.target.value))} /></label>
        <label>Vertical offset <input type="range" min={-30} max={30} value={settings.verticalOffset} onChange={(e) => set("verticalOffset", Number(e.target.value))} /></label>
        <label>Horizontal offset <input type="range" min={-30} max={30} value={settings.horizontalOffset} onChange={(e) => set("horizontalOffset", Number(e.target.value))} /></label>
        <label>Token scale <input type="range" min={0.8} max={2.2} step={0.05} value={settings.tokenScale} onChange={(e) => set("tokenScale", Number(e.target.value))} /></label>

        <label><input type="checkbox" checked={settings.outlineEnabled} onChange={(e) => set("outlineEnabled", e.target.checked)} /> Outline</label>
        <label>Outline thickness <input type="range" min={0} max={4} value={settings.outlineThickness} onChange={(e) => set("outlineThickness", Number(e.target.value))} disabled={!settings.outlineEnabled} /></label>
        <label>Outline colour <input type="color" value={settings.outlineColor} onChange={(e) => set("outlineColor", e.target.value)} disabled={!settings.outlineEnabled} /></label>

        <label><input type="checkbox" checked={settings.groundGlow} onChange={(e) => set("groundGlow", e.target.checked)} /> Ground glow</label>
        <label>Glow colour <input type="color" value={settings.glowColor} onChange={(e) => set("glowColor", e.target.value)} disabled={!settings.groundGlow} /></label>
        <label>Glow size <input type="range" min={0} max={24} value={settings.glowSize} onChange={(e) => set("glowSize", Number(e.target.value))} disabled={!settings.groundGlow} /></label>

        <label><input type="checkbox" checked={settings.shadow} onChange={(e) => set("shadow", e.target.checked)} /> Shadow</label>
        <label>Shadow opacity <input type="range" min={0} max={1} step={0.05} value={settings.shadowOpacity} onChange={(e) => set("shadowOpacity", Number(e.target.value))} disabled={!settings.shadow} /></label>
        <label>Shadow blur <input type="range" min={0} max={30} value={settings.shadowBlur} onChange={(e) => set("shadowBlur", Number(e.target.value))} disabled={!settings.shadow} /></label>
      </div>

      <button type="button" className="btn" onClick={() => onChange({ ...DEFAULT_RENDER_SETTINGS })}>
        Reset adjustments
      </button>
    </div>
  );
}
