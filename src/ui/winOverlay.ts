export type WinOverlayOptions = {
  scenarioName: string;
  turns: number;
  bestTurns: number | null;
  onRestart: () => void;
  onNext: () => void;
  onClose: () => void;
};

export function showWinOverlay(opts: WinOverlayOptions) {
  const existing = document.getElementById("winOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "winOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "10000";

  const card = document.createElement("div");
  card.style.width = "min(520px, calc(100vw - 24px))";
  card.style.borderRadius = "14px";
  card.style.background = "rgba(20, 24, 35, 0.95)";
  card.style.border = "1px solid rgba(255,255,255,0.10)";
  card.style.backdropFilter = "blur(8px)";
  card.style.padding = "16px";
  card.style.color = "#e8e8e8";

  card.innerHTML = `
    <div style="font-size:18px;font-weight:800;">You win!</div>
    <div style="margin-top:6px;opacity:0.9;">${opts.scenarioName}</div>

    <div style="margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,0.06);
                border:1px solid rgba(255,255,255,0.08);display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <div><div style="opacity:0.75;font-size:12px;">Turns</div><div style="font-size:18px;font-weight:800;">${opts.turns}</div></div>
      <div><div style="opacity:0.75;font-size:12px;">Best</div><div style="font-size:18px;font-weight:800;">${opts.bestTurns ?? "—"}</div></div>
    </div>

    <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button id="woRestart" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#141a28;color:#e8e8e8;cursor:pointer;">Restart</button>
      <button id="woNext" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#141a28;color:#e8e8e8;cursor:pointer;">Next level</button>
      <button id="woClose" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:#141a28;color:#e8e8e8;cursor:pointer;">Close</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); opts.onClose(); };

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  window.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { window.removeEventListener("keydown", onKey); close(); }
  });

  (document.getElementById("woRestart") as HTMLButtonElement).onclick = () => { overlay.remove(); opts.onRestart(); };
  (document.getElementById("woNext") as HTMLButtonElement).onclick = () => { overlay.remove(); opts.onNext(); };
  (document.getElementById("woClose") as HTMLButtonElement).onclick = () => close();
}
