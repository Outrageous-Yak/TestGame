import React from "react";
import type { Scenario } from "../../../engine/types";
import type { StudioAnalysisResult } from "../studioAnalysis";
import { buildEngineeringReport } from "../studioAnalysis";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJson(filename: string, data: unknown) {
  downloadText(filename, JSON.stringify(data, null, 2));
}

export function exportBoardScreenshot(boardEl: HTMLElement | null, filename: string) {
  if (!boardEl) return;
  const rect = boardEl.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, rect.width, rect.height);

  boardEl.querySelectorAll(".hex").forEach((hex) => {
    const hr = hex.getBoundingClientRect();
    const cx = hr.left - rect.left + hr.width / 2;
    const cy = hr.top - rect.top + hr.height / 2;
    const r = hr.width / 2.8;
    ctx.beginPath();
    ctx.fillStyle = hex.classList.contains("player") ? "#fbbf24" : "#475569";
    if (hex.classList.contains("goal")) ctx.fillStyle = "#22c55e";
    if (hex.classList.contains("portalUp") || hex.classList.contains("portalDown")) ctx.fillStyle = "#818cf8";
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

type ExportPanelProps = {
  scenario: Scenario | null;
  analysis: StudioAnalysisResult | null;
  boardRef: React.RefObject<HTMLDivElement>;
};

export function ExportPanel({ scenario, analysis, boardRef }: ExportPanelProps) {
  const id = scenario?.id ?? "track";

  return (
    <div className="ps-panel">
      <div className="ps-panelHead">Export</div>
      <div className="ps-exportBtns">
        <button
          type="button"
          className="btn"
          disabled={!scenario}
          onClick={() => scenario && downloadJson(`${id}.json`, scenario)}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="btn"
          disabled={!analysis}
          onClick={() =>
            analysis &&
            scenario &&
            downloadText(`${id}-report.md`, buildEngineeringReport(scenario, analysis))
          }
        >
          Export Report
        </button>
        <button
          type="button"
          className="btn"
          disabled={!analysis}
          onClick={() => analysis && downloadText(`${id}-replay.txt`, analysis.replayText)}
        >
          Export Replay
        </button>
        <button
          type="button"
          className="btn"
          disabled={!analysis}
          onClick={() => analysis && downloadJson(`${id}-metrics.json`, {
            validation: analysis.validation,
            counts: analysis.counts,
            fitness: analysis.fitness,
            quality: analysis.quality,
            solverStats: analysis.solution.stats,
          })}
        >
          Export Metrics
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => exportBoardScreenshot(boardRef.current, `${id}-board.png`)}
        >
          Export Screenshot
        </button>
      </div>
    </div>
  );
}
