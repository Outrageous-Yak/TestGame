import type { GameState } from "../engine/types";
import { attemptMove } from "../engine/rules";
import { neighborIdsSameLayer } from "../engine/neighbors";
import { clearHoverPreview, getHoverPreview, setHoverPreview } from "./hoverPreview";

type XY = { x: number; y: number };
function getPrevPosMap(container: HTMLElement): Map<string, XY> {
  if (!(container as any).__posMap) (container as any).__posMap = new Map<string, XY>();
  return (container as any).__posMap as Map<string, XY>;
}

function ensureTooltip(): HTMLDivElement {
  let tip = document.getElementById("tooltip") as HTMLDivElement | null;
  if (!tip) {
    tip = document.createElement("div");
    tip.id = "tooltip";
    tip.style.position = "fixed";
    tip.style.pointerEvents = "none";
    tip.style.zIndex = "9999";
    tip.style.padding = "8px 10px";
    tip.style.borderRadius = "10px";
    tip.style.background = "rgba(20, 24, 35, 0.92)";
    tip.style.border = "1px solid rgba(255,255,255,0.12)";
    tip.style.color = "#e8e8e8";
    tip.style.fontSize = "12px";
    tip.style.lineHeight = "1.25";
    tip.style.whiteSpace = "nowrap";
    tip.style.transform = "translate(12px, 12px)";
    tip.style.display = "none";
    document.body.appendChild(tip);
  }
  return tip;
}
function showTooltip(tip: HTMLDivElement, x: number, y: number, html: string) {
  tip.innerHTML = html;
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
  tip.style.display = "block";
}
function hideTooltip(tip: HTMLDivElement) { tip.style.display = "none"; }

function ensureShiftAnimStyle() {
  let style = document.getElementById("shiftAnimStyle");
  if (!style) {
    style = document.createElement("style");
    style.id = "shiftAnimStyle";
    style.textContent = `
      .hexAnim { transition: transform 150ms ease-out; transform-origin: center; }
      .pulse { animation: pulseStroke 0.9s ease-in-out infinite; }
      @keyframes pulseStroke { 0%{stroke-width:4} 50%{stroke-width:8} 100%{stroke-width:4} }
    `;
    document.head.appendChild(style);
  }
}

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30); // pointy-top
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function renderLayer(
  state: GameState,
  layer: number,
  container: HTMLElement,
  onAction: (msg: string, won?: boolean) => void,
  onInspect: (hexId: string) => void,
  pinnedDestId: string | null,
  beforeAction: () => void
) {
  ensureShiftAnimStyle();
  const tip = ensureTooltip();
  hideTooltip(tip);

  const prevPos = getPrevPosMap(container);
  const nextPos = new Map<string, XY>();

  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "820");
  svg.setAttribute("height", "560");
  svg.style.background = "rgba(255,255,255,0.03)";
  svg.style.border = "1px solid rgba(255,255,255,0.08)";
  svg.style.borderRadius = "12px";

  const R = 26;                // hex radius
  const DX = Math.sqrt(3) * R; // horizontal step
  const DY = 1.5 * R;          // vertical step
  const M = 40;                // margin

  const player = state.hexesById.get(state.playerHexId)!;
  const playerLayer = player.pos.layer;

  const legalMoveIds = new Set<string>();
  if (playerLayer === layer) {
    for (const id of neighborIdsSameLayer(state, state.playerHexId)) {
      const h = state.hexesById.get(id)!;
      if (!h.missing && !h.blocked) legalMoveIds.add(id);
    }
  }

  const hp = getHoverPreview();
  const hoverDestId = hp.destId;
  const destToShow = pinnedDestId ?? hoverDestId;

  const layerRows = state.rows.get(layer)!;

  for (let row = 0; row < layerRows.length; row++) {
    const rowIds = layerRows[row];
    for (let col = 0; col < rowIds.length; col++) {
      const id = rowIds[col];
      const hex = state.hexesById.get(id)!;

      const cx = M + col * DX + (row % 2 ? DX / 2 : 0);
      const cy = M + row * DY;
      nextPos.set(id, { x: cx, y: cy });

      // color language (v0.1)
      let fill = "#2f3547";
      if (!hex.revealed) fill = "#0f1422";
      if (hex.blocked) fill = "#555b6e";
      if (hex.missing) fill = "#000000";
      if (hex.kind === "GOAL") fill = "#ffd24a";
      if (id === state.playerHexId) fill = "#3dd6d0";

      let stroke = "rgba(255,255,255,0.10)";
      let strokeW = "1";

      // UP/DOWN outline (only if revealed)
      const tr = state.transitionsByFromId.get(id);
      if (hex.revealed && tr && !hex.missing && !hex.blocked) {
        stroke = tr.type === "UP" ? "#6bff8e" : "#ff6b6b";
        strokeW = "2.5";
      }

      // legal move highlight
      if (legalMoveIds.has(id)) {
        stroke = "rgba(255,255,255,0.85)";
        strokeW = "3.5";
      }

      // destination preview
      if (destToShow && destToShow === id) {
        stroke = "#ffd24a";
        strokeW = "6";
      }

      // player highlight
      if (id === state.playerHexId) {
        stroke = "#e8ffff";
        strokeW = "6";
      }

      // goal pulse hint
      const isGoal = hex.kind === "GOAL";
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", hexPoints(cx, cy, Math.floor(R * 0.92))); // tiny gaps
      poly.setAttribute("fill", fill);
      poly.setAttribute("stroke", stroke);
      poly.setAttribute("stroke-width", strokeW);
      if (isGoal && hex.revealed) poly.classList.add("pulse");

      if (destToShow && destToShow === id) poly.setAttribute("stroke-dasharray", "10 6");

      poly.classList.add("hexAnim");

      // animate from previous position
      const old = prevPos.get(id);
      if (old) {
        const dx = old.x - cx;
        const dy = old.y - cy;
        poly.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => (poly.style.transform = "translate(0px, 0px)"));
      }

      poly.addEventListener("mousemove", (e) => {
        const legal = legalMoveIds.has(id);
        const kind = hex.revealed ? hex.kind : "UNKNOWN";
        const t = state.transitionsByFromId.get(id);

        if (t) {
          const destId = `L${t.to.layer}-R${t.to.row}-C${t.to.col}`;
          const visible = state.visibleLayers.has(t.to.layer);
          setHoverPreview({ fromId: id, destId: visible ? destId : null, destLayer: t.to.layer });
        } else {
          const hp2 = getHoverPreview();
          if (hp2.fromId === id) clearHoverPreview();
        }

        const destText = t
          ? (state.visibleLayers.has(t.to.layer) ? `Dest: L${t.to.layer} R${t.to.row} C${t.to.col}` : "Dest: hidden")
          : "";

        const html =
          `<b>L${hex.pos.layer} R${hex.pos.row} C${hex.pos.col}</b><br>` +
          `Revealed: ${hex.revealed ? "Yes" : "No"}<br>` +
          `Type: ${kind}<br>` +
          `Legal: ${legal ? "Yes" : "No"}` +
          (destText ? `<br>${destText}` : "");

        showTooltip(tip, e.clientX, e.clientY, html);
        (window as any).__rerender?.();
      });

      poly.addEventListener("mouseleave", () => {
        hideTooltip(tip);
        const hp2 = getHoverPreview();
        if (hp2.fromId === id) clearHoverPreview();
        (window as any).__rerender?.();
      });

      poly.addEventListener("click", (e) => {
        hideTooltip(tip);

        // Shift+Click = inspect only
        if ((e as MouseEvent).shiftKey) {
          onInspect(id);
          onAction("Pinned hex for inspection.");
          return;
        }

        // normal click: only allow moving from player layer to legal neighbors
        if (playerLayer === layer && !legalMoveIds.has(id)) return;

        beforeAction();
        const result = attemptMove(state, id);

        if (!result.ok) {
          if (result.reason === "BLOCKED") onAction("Tried blocked/missing → lost turn.");
          else onAction("Invalid move.");
          return;
        }

        if (result.won) {
          onAction("Reached goal. You win!", true);
          return;
        }

        onAction(result.triggeredTransition ? "Moved and triggered a transition." : "Moved.");
      });

      svg.appendChild(poly);

      // Transition icons (only if revealed)
      if (hex.revealed && tr && !hex.missing && !hex.blocked) {
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", String(cx));
        txt.setAttribute("y", String(cy + 5));
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("font-size", "18");
        txt.setAttribute("font-weight", "800");
        txt.setAttribute("opacity", "0.90");
        txt.setAttribute("fill", tr.type === "UP" ? "#6bff8e" : "#ff6b6b");
        txt.textContent = tr.type === "UP" ? "▲" : "▼";
        svg.appendChild(txt);
      }
    }
  }

  container.appendChild(svg);
  (container as any).__posMap = nextPos;
}
