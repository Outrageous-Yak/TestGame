import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SavedCharacter } from "../spriteTypes";
import { isSpriteSheet } from "../spriteTypes";
import { createCharacterFrameDataUrl, pickPlaybackFrame } from "../spriteRenderer";
import type { BoardPreviewMode, CharacterRenderSettings } from "./importAssistantTypes";
import { renderSettingsToCss } from "./importExport";

const MODES: Array<{ id: BoardPreviewMode; label: string; walking?: boolean }> = [
  { id: "normal", label: "Normal" },
  { id: "selected", label: "Selected" },
  { id: "portal", label: "Portal" },
  { id: "walking", label: "Walking", walking: true },
  { id: "idle", label: "Idle", walking: false },
];

type BoardPreviewPanelProps = {
  character: SavedCharacter;
  renderSettings: CharacterRenderSettings;
  mode: BoardPreviewMode;
  onModeChange: (mode: BoardPreviewMode) => void;
};

export function BoardPreviewPanel({
  character,
  renderSettings,
  mode,
  onModeChange,
}: BoardPreviewPanelProps) {
  const [dataUrl, setDataUrl] = useState("");
  const animStart = useRef(performance.now());
  const [tick, setTick] = useState(0);

  const isWalking = mode === "walking";
  const hasAnim = isSpriteSheet(character) && (character.animation?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasAnim || (mode !== "walking" && mode !== "idle")) return;
    let raf = 0;
    const loop = () => {
      setTick(performance.now() - animStart.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hasAnim, mode, character]);

  useEffect(() => {
    animStart.current = performance.now();
    const frame = hasAnim && (mode === "walking" || mode === "idle")
      ? pickPlaybackFrame(character, isWalking, tick)
      : 0;
    setDataUrl(createCharacterFrameDataUrl(character, frame));
  }, [character, hasAnim, isWalking, mode, tick]);

  const tokenStyle = useMemo(() => renderSettingsToCss(renderSettings), [renderSettings]);

  const stageClass =
    "boardPreviewStage" +
    (mode === "selected" ? " selected" : "") +
    (mode === "portal" ? " portal" : "");

  return (
    <div className="boardPreviewPanel">
      <h3 className="assistantTitle">Board preview</h3>
      <p className="spriteHint">Exact anchor, scale, and nearest-neighbour rendering as in-game.</p>
      <div className={stageClass}>
        <div className="boardPreviewHex">
          <img
            src={dataUrl}
            alt=""
            className="boardPreviewToken"
            style={tokenStyle as React.CSSProperties}
            draggable={false}
          />
          {mode === "portal" ? <div className="boardPreviewPortalFx" aria-hidden="true" /> : null}
        </div>
      </div>
      <div className="previewBgPicker">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={"btn" + (mode === m.id ? " primary" : "")}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
