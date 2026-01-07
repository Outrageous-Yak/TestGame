import type { GameState } from "../engine/types";
import { computeReachability } from "../engine/reachability";
import { computeReachabilityWithShifts } from "../engine/reachabilityTime";
import { getPatternForLayer } from "./movementViz";
import { getHoverPreview } from "./hoverPreview";

export function renderDevOverlay(opts: {
  state: GameState;
  scenarioId: string;
  viewLayer: number;
  followPlayer: boolean;
  pinnedHexId: string | null;
  previewDestId: string | null;
  isVisible: boolean;
}) {
  let el = document.getElementById("devOverlay") as HTMLDivElement | null;

  if (!opts.isVisible) {
    if (el) el.style.display = "none";
    return;
  }

  if (!el) {
    el = document.createElement("div");
    el.id = "devOverlay";
    el.style.position = "fixed";
    el.style.right = "12px";
    el.style.bottom = "12px";
    el.style.zIndex = "10001";
    el.style.width = "min(420px, calc(100vw - 24px))";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(0,0,0,0.70)";
    el.style.border = "1px solid rgba(255,255,255,0.14)";
    el.style.backdropFilter = "blur(6px)";
    el.style.color = "#e8e8e8";
    el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    el.style.fontSize = "12px";
    el.style.lineHeight = "1.35";
    document.body.appendChild(el);
  }

  el.style.display = "block";

  const player = opts.state.hexesById.get(opts.state.playerHexId);
  const hp = getHoverPreview();
  const pat = getPatternForLayer(opts.state.scenario.movement, opts.viewLayer);

  const stat = computeReachability(opts.state);
  const time = computeReachabilityWithShifts(opts.state, 20);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div><b>DEV</b> <span style="opacity:0.75;">(D)</span></div>
      <div style="opacity:0.75;">Scenario: ${opts.scenarioId}</div>
    </div>

    <div><b>Turn:</b> ${opts.state.turn}</div>
    <div><b>Player:</b> ${opts.state.playerHexId} ${player ? `(L${player.pos.layer} R${player.pos.row} C${player.pos.col})` : ""}</div>
    <div><b>Visible layers:</b> ${Array.from(opts.state.visibleLayers).sort((a,b)=>a-b).join(", ") || "—"}</div>

    <div style="margin-top:6px;"><b>Reachable (static):</b> ${stat.reachable ? "YES" : "NO"}</div>
    <div><b>Min distance:</b> ${stat.distance ?? "—"} <span style="opacity:0.7;">(ignores shifts)</span></div>

    <div style="margin-top:6px;"><b>Reachable (with shifts ≤20):</b> ${time.reachable ? "YES" : "NO"}</div>
    <div><b>Min turns:</b> ${time.minTurns ?? "—"}</div>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.12);margin:8px 0;" />

    <div><b>View layer:</b> L${opts.viewLayer}</div>
    <div><b>Movement:</b> ${pat}</div>
    <div><b>Follow:</b> ${opts.followPlayer ? "ON" : "OFF"}</div>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.12);margin:8px 0;" />

    <div><b>Pinned:</b> ${opts.pinnedHexId ?? "—"}</div>
    <div><b>Pinned dest:</b> ${opts.previewDestId ?? "—"}</div>
    <div><b>Hover from:</b> ${hp.fromId ?? "—"}</div>
    <div><b>Hover dest:</b> ${hp.destId ?? "—"}</div>
  `;
}
