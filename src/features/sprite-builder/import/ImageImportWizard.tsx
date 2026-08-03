import React, { useMemo, useRef, useState } from "react";
import type { SavedCharacter, SavedPixelSprite } from "../spriteTypes";
import { characterAsSingleFrameSprite } from "../spriteTypes";
import { SpriteBuilder } from "../SpriteBuilder";
import { SpritePreview } from "../SpritePreview";
import {
  decodeImageFile,
  imageDecodeErrorMessage,
  canvasToImageData,
  type ImageDecodeError,
} from "./imageDecode";
import {
  DEFAULT_CROP_TRANSFORM,
  extractSquareCrop,
  fitCharacterTransform,
  nextRotation,
  renderCropWorkspace,
  type CropTransform,
} from "./imageCrop";
import {
  applyAlphaThreshold,
  applyMaskBrush,
  cloneImageData,
  hasTransparency,
  removeEdgeConnectedBackground,
  type BackgroundMode,
} from "./backgroundRemoval";
import {
  convertImageDataToSprite,
  DEFAULT_CONVERSION_SETTINGS,
  type ConversionMode,
  type ConversionSettings,
  type PaletteSizeOption,
} from "./pixelConversion";
import type { SheetType } from "./spriteSheetGeneration";
import { createSheetFromConversion, createSpriteFromConversion } from "../spriteValidation";

export type ImportStage =
  | "choose"
  | "crop"
  | "background"
  | "convert"
  | "sheet"
  | "edit"
  | "save";

const STAGE_ORDER: ImportStage[] = ["choose", "crop", "background", "convert", "sheet", "edit", "save"];

const STAGE_LABELS: Record<ImportStage, string> = {
  choose: "Choose Image",
  crop: "Crop & Position",
  background: "Background",
  convert: "Pixel Conversion",
  sheet: "Sprite Preview",
  edit: "Edit Pixels",
  save: "Save / Select",
};

type ImageImportWizardProps = {
  onComplete: (character: SavedCharacter, selectActive: boolean) => void;
  onCancel: () => void;
};

type PreviewBg = "checker" | "light" | "dark" | "hex";

export function ImageImportWizard({ onComplete, onCancel }: ImageImportWizardProps) {
  const [stage, setStage] = useState<ImportStage>("choose");
  const [error, setError] = useState<string | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [cropTransform, setCropTransform] = useState<CropTransform>(DEFAULT_CROP_TRANSFORM);
  const [preparedData, setPreparedData] = useState<ImageData | null>(null);
  const [bgMode, setBgMode] = useState<BackgroundMode>("has-alpha");
  const [bgTolerance, setBgTolerance] = useState(32);
  const [removeAllMatching, setRemoveAllMatching] = useState(false);
  const [bgSeed, setBgSeed] = useState<{ x: number; y: number } | null>(null);
  const [masking, setMasking] = useState(false);
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>(DEFAULT_CONVERSION_SETTINGS);
  const [convertedSprite, setConvertedSprite] = useState<SavedPixelSprite | null>(null);
  const [sheetType, setSheetType] = useState<SheetType>("static");
  const [frameDurationMs, setFrameDurationMs] = useState(150);
  const [previewBg, setPreviewBg] = useState<PreviewBg>("checker");
  const [characterName, setCharacterName] = useState("Imported Character");
  const [editingCharacter, setEditingCharacter] = useState<SavedCharacter | null>(null);
  const [selectOnSave, setSelectOnSave] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const maskDrag = useRef<{ x: number; y: number } | null>(null);

  const workspaceSize = 512;

  const sourceData = useMemo(() => {
    if (!sourceCanvas) return null;
    return canvasToImageData(sourceCanvas);
  }, [sourceCanvas]);

  const croppedPreview = useMemo(() => {
    if (!sourceData) return null;
    return renderCropWorkspace(sourceData, workspaceSize, cropTransform);
  }, [sourceData, cropTransform]);

  const stageIndex = STAGE_ORDER.indexOf(stage);

  const goBack = () => {
    if (stageIndex > 0) setStage(STAGE_ORDER[stageIndex - 1]!);
  };

  const goNext = () => {
    if (stage === "crop" && croppedPreview) {
      setPreparedData(extractSquareCrop(croppedPreview));
      if (hasTransparency(croppedPreview)) setBgMode("has-alpha");
    }
    if (stage === "background" && preparedData) {
      let data = cloneImageData(preparedData);
      data = applyAlphaThreshold(data, conversionSettings.alphaThreshold);
      if (bgMode === "solid-remove" && bgSeed) {
        data = removeEdgeConnectedBackground(data, bgSeed, bgTolerance, removeAllMatching);
      }
      setPreparedData(data);
    }
    if (stage === "convert" && preparedData) {
      const { palette, pixels } = convertImageDataToSprite(preparedData, conversionSettings);
      setConvertedSprite(createSpriteFromConversion(characterName, palette, pixels));
    }
    if (stageIndex < STAGE_ORDER.length - 1) setStage(STAGE_ORDER[stageIndex + 1]!);
  };

  const skipToSave = () => {
    if (!convertedSprite) return;
    const char: SavedCharacter =
      sheetType === "static"
        ? { ...convertedSprite, name: characterName }
        : createSheetFromConversion(
            characterName,
            convertedSprite.palette,
            convertedSprite.pixels,
            sheetType,
            frameDurationMs
          );
    setEditingCharacter(char);
    setStage("save");
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const canvas = await decodeImageFile(file);
      setSourceCanvas(canvas);
      setCropTransform(fitCharacterTransform(canvas.width, canvas.height, workspaceSize));
      setStage("crop");
    } catch (e) {
      const code =
        e instanceof Error &&
        ["unsupported-type", "file-too-large", "decode-failed", "empty-image"].includes(e.message)
          ? (e.message as ImageDecodeError)
          : "decode-failed";
      setError(imageDecodeErrorMessage(code));
    }
  };

  const onCropPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: cropTransform.offsetX, oy: cropTransform.offsetY };
  };

  const onCropPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setCropTransform((t) => ({ ...t, offsetX: dragRef.current!.ox + dx, offsetY: dragRef.current!.oy + dy }));
  };

  const onCropPointerUp = () => {
    dragRef.current = null;
  };

  const onBgClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!preparedData || bgMode !== "solid-remove") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = preparedData.width / rect.width;
    const x = Math.floor((e.clientX - rect.left) * scale);
    const y = Math.floor((e.clientY - rect.top) * scale);
    setBgSeed({ x, y });
    setPreparedData(removeEdgeConnectedBackground(preparedData, { x, y }, bgTolerance, removeAllMatching));
  };

  const onMaskPointer = (e: React.PointerEvent<HTMLCanvasElement>, isStart: boolean) => {
    if (!preparedData || bgMode !== "manual-mask") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = preparedData.width / rect.width;
    const x = Math.floor((e.clientX - rect.left) * scale);
    const y = Math.floor((e.clientY - rect.top) * scale);
    if (isStart) {
      e.currentTarget.setPointerCapture(e.pointerId);
      maskDrag.current = { x, y };
      setPreparedData(applyMaskBrush(preparedData, x, y, x, y, 4, true));
    } else if (maskDrag.current) {
      const from = maskDrag.current;
      setPreparedData(applyMaskBrush(preparedData, from.x, from.y, x, y, 4, true));
      maskDrag.current = { x, y };
    }
  };

  const liveConverted = useMemo(() => {
    if (!preparedData) return null;
    const { palette, pixels } = convertImageDataToSprite(preparedData, conversionSettings);
    return createSpriteFromConversion("Preview", palette, pixels);
  }, [preparedData, conversionSettings]);

  const sheetPreview = useMemo(() => {
    if (!convertedSprite) return null;
    if (sheetType === "static") return convertedSprite;
    return createSheetFromConversion(
      convertedSprite.name,
      convertedSprite.palette,
      convertedSprite.pixels,
      sheetType,
      frameDurationMs
    );
  }, [convertedSprite, sheetType, frameDurationMs]);

  const openEditor = () => {
    if (!convertedSprite) return;
    if (sheetType === "static") {
      setEditingCharacter(convertedSprite);
    } else {
      setEditingCharacter(
        createSheetFromConversion(
          convertedSprite.name,
          convertedSprite.palette,
          convertedSprite.pixels,
          sheetType,
          frameDurationMs
        )
      );
    }
    setStage("edit");
  };

  const previewClass = `importPreviewBg ${previewBg}`;

  return (
    <div className="imageImportWizard">
      <nav className="importStageNav" aria-label="Import progress">
        {STAGE_ORDER.map((s, i) => (
          <button
            key={s}
            type="button"
            className={"importStageStep" + (stage === s ? " active" : "") + (i < stageIndex ? " done" : "")}
            onClick={() => i <= stageIndex && setStage(s)}
            disabled={i > stageIndex}
          >
            {i + 1}. {STAGE_LABELS[s]}
          </button>
        ))}
      </nav>

      {error ? <div className="importError" role="alert">{error}</div> : null}

      {stage === "choose" ? (
        <div className="importStage">
          <p>Upload a PNG, JPEG, or WebP image. Processing happens locally in your browser.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            className="importFileInput"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button type="button" className="btn primary" onClick={() => fileRef.current?.click()}>
            Choose Image
          </button>
        </div>
      ) : null}

      {stage === "crop" && croppedPreview ? (
        <div className="importStage">
          <div className="cropControls">
            <button type="button" className="btn" onClick={() => sourceCanvas && setCropTransform(fitCharacterTransform(sourceCanvas.width, sourceCanvas.height, workspaceSize))}>Fit</button>
            <button type="button" className="btn" onClick={() => setCropTransform(DEFAULT_CROP_TRANSFORM)}>Reset</button>
            <button type="button" className="btn" onClick={() => setCropTransform((t) => ({ ...t, rotation: nextRotation(t.rotation) }))}>Rotate 90°</button>
            <button type="button" className="btn" onClick={() => setCropTransform((t) => ({ ...t, flipH: !t.flipH }))}>Flip H</button>
            <label>Zoom
              <input type="range" min={0.2} max={3} step={0.05} value={cropTransform.scale} onChange={(e) => setCropTransform((t) => ({ ...t, scale: Number(e.target.value) }))} />
            </label>
          </div>
          <canvas
            className="cropCanvas checkerBg"
            width={workspaceSize}
            height={workspaceSize}
            onPointerDown={onCropPointerDown}
            onPointerMove={onCropPointerMove}
            onPointerUp={onCropPointerUp}
            ref={(el) => {
              if (!el || !croppedPreview) return;
              const ctx = el.getContext("2d");
              if (!ctx) return;
              ctx.clearRect(0, 0, workspaceSize, workspaceSize);
              ctx.putImageData(croppedPreview, 0, 0);
              ctx.strokeStyle = "rgba(120,220,255,0.8)";
              ctx.lineWidth = 2;
              ctx.strokeRect(1, 1, workspaceSize - 2, workspaceSize - 2);
            }}
          />
        </div>
      ) : null}

      {stage === "background" && preparedData ? (
        <div className="importStage">
          <div className="bgModeRow">
            {(["keep", "solid-remove", "manual-mask", "has-alpha"] as BackgroundMode[]).map((m) => (
              <button key={m} type="button" className={"btn" + (bgMode === m ? " primary" : "")} onClick={() => setBgMode(m)}>{m}</button>
            ))}
          </div>
          {bgMode === "solid-remove" ? (
            <>
              <p>Tap the background color to remove. Edge-connected removal by default.</p>
              <label>Tolerance <input type="range" min={0} max={120} value={bgTolerance} onChange={(e) => setBgTolerance(Number(e.target.value))} /></label>
              <label><input type="checkbox" checked={removeAllMatching} onChange={(e) => setRemoveAllMatching(e.target.checked)} /> Remove all matching pixels</label>
            </>
          ) : null}
          {bgMode === "manual-mask" ? <p>Paint to erase background areas before conversion.</p> : null}
          <canvas
            className="bgCanvas checkerBg"
            width={preparedData.width}
            height={preparedData.height}
            style={{ width: "min(100%, 400px)", imageRendering: "pixelated" }}
            onClick={onBgClick}
            onPointerDown={(e) => onMaskPointer(e, true)}
            onPointerMove={(e) => onMaskPointer(e, false)}
            onPointerUp={() => { maskDrag.current = null; }}
            ref={(el) => {
              if (!el || !preparedData) return;
              const ctx = el.getContext("2d");
              if (!ctx) return;
              ctx.putImageData(preparedData, 0, 0);
            }}
          />
        </div>
      ) : null}

      {stage === "convert" && preparedData ? (
        <div className="importStage importConvertStage">
          <div className="convertControls">
            <label>Mode
              <select value={conversionSettings.mode} onChange={(e) => setConversionSettings((s) => ({ ...s, mode: e.target.value as ConversionMode }))}>
                <option value="clean">Clean</option>
                <option value="detailed">Detailed</option>
                <option value="retro">Retro</option>
                <option value="silhouette">Silhouette / Token</option>
              </select>
            </label>
            <label>Palette
              <select value={conversionSettings.paletteSize} onChange={(e) => setConversionSettings((s) => ({ ...s, paletteSize: Number(e.target.value) as PaletteSizeOption }))}>
                {[8, 12, 16, 24, 32, 64].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label>Contrast <input type="range" min={-100} max={100} value={conversionSettings.contrast} onChange={(e) => setConversionSettings((s) => ({ ...s, contrast: Number(e.target.value) }))} /></label>
            <label>Saturation <input type="range" min={-100} max={100} value={conversionSettings.saturation} onChange={(e) => setConversionSettings((s) => ({ ...s, saturation: Number(e.target.value) }))} /></label>
            <label>Brightness <input type="range" min={-100} max={100} value={conversionSettings.brightness} onChange={(e) => setConversionSettings((s) => ({ ...s, brightness: Number(e.target.value) }))} /></label>
            <label>Alpha threshold <input type="range" min={0} max={255} value={conversionSettings.alphaThreshold} onChange={(e) => setConversionSettings((s) => ({ ...s, alphaThreshold: Number(e.target.value) }))} /></label>
            <label>Dithering
              <select value={conversionSettings.dithering} onChange={(e) => setConversionSettings((s) => ({ ...s, dithering: e.target.value as "off" | "ordered" }))}>
                <option value="off">Off</option>
                <option value="ordered">Ordered</option>
              </select>
            </label>
            <label>Outline
              <select value={conversionSettings.outline} onChange={(e) => setConversionSettings((s) => ({ ...s, outline: e.target.value as ConversionSettings["outline"] }))}>
                <option value="off">Off</option>
                <option value="dark">Dark</option>
                <option value="auto">Automatic</option>
              </select>
            </label>
            <label>Detail <input type="range" min={0} max={100} value={conversionSettings.detailLevel} onChange={(e) => setConversionSettings((s) => ({ ...s, detailLevel: Number(e.target.value) }))} /></label>
          </div>
          <div className={previewClass}>
            {liveConverted ? <SpritePreview sprite={liveConverted} size={192} /> : null}
          </div>
          <div className="previewBgPicker">
            {(["checker", "light", "dark", "hex"] as PreviewBg[]).map((b) => (
              <button key={b} type="button" className={"btn" + (previewBg === b ? " primary" : "")} onClick={() => setPreviewBg(b)}>{b}</button>
            ))}
          </div>
        </div>
      ) : null}

      {stage === "sheet" && convertedSprite ? (
        <div className="importStage">
          <p>Choose sprite sheet type. Directional generation is approximate and editable.</p>
          <div className="sheetTypeRow">
            {([
              ["static", "Static (1 frame)"],
              ["idle", "Simple Idle (4 frames)"],
              ["walk", "Simple Walk (4 frames)"],
              ["directional", "Directional (experimental)"],
            ] as [SheetType, string][]).map(([t, label]) => (
              <button key={t} type="button" className={"btn" + (sheetType === t ? " primary" : "")} onClick={() => setSheetType(t)}>{label}</button>
            ))}
          </div>
          {sheetType !== "static" ? (
            <label>Frame duration (ms) <input type="number" min={50} max={1000} value={frameDurationMs} onChange={(e) => setFrameDurationMs(Number(e.target.value))} /></label>
          ) : null}
          <div className={previewClass}>
            {sheetPreview ? <SpritePreview sprite={characterAsSingleFrameSprite(sheetPreview, 0)} size={192} /> : null}
          </div>
          {sheetType === "directional" ? (
            <p className="spriteHint">Back and side views are procedural approximations — edit frames manually.</p>
          ) : null}
        </div>
      ) : null}

      {stage === "edit" && editingCharacter ? (
        <SpriteBuilder
          initialCharacter={editingCharacter}
          isNew
          onSave={(c) => {
            setEditingCharacter(c);
            setStage("save");
          }}
          onCancel={() => setStage("sheet")}
        />
      ) : null}

      {stage === "save" && editingCharacter ? (
        <div className="importStage">
          <label>Name <input className="spriteNameInput" value={characterName} onChange={(e) => setCharacterName(e.target.value)} /></label>
          <SpritePreview sprite={characterAsSingleFrameSprite(editingCharacter, 0)} size={128} />
          <label><input type="checkbox" checked={selectOnSave} onChange={(e) => setSelectOnSave(e.target.checked)} /> Select as board character</label>
          <button type="button" className="btn primary" onClick={() => onComplete({ ...editingCharacter, name: characterName, updatedAt: Date.now() }, selectOnSave)}>
            Save Character
          </button>
        </div>
      ) : null}

      {stage !== "edit" ? (
        <div className="importNavRow">
          <button type="button" className="btn" onClick={stage === "choose" ? onCancel : goBack} disabled={stage === "choose" && !sourceCanvas}>
            {stage === "choose" ? "Cancel" : "Back"}
          </button>
          {stage === "sheet" ? (
            <button type="button" className="btn primary" onClick={openEditor}>Edit Pixels</button>
          ) : null}
          {stage !== "save" && stage !== "sheet" ? (
            <button type="button" className="btn primary" onClick={goNext} disabled={stage === "choose" && !sourceCanvas}>
              Next
            </button>
          ) : null}
          {stage === "sheet" ? (
            <button type="button" className="btn" onClick={skipToSave}>
              Skip to Save
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
