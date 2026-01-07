import type { Scenario } from "../engine/types";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = String(v);
    else if (k === "html") node.innerHTML = String(v);
    else (node as any)[k] = v;
  }
  return node;
}

export function mountApp(root: HTMLElement | null, scenarios: Scenario[], initialPath: string) {
  if (!root) throw new Error('Missing element with id="app"');

  // Build a map of scenario "display keys"
  const keyOf = (s: any, idx: number) => String(s.id ?? s.name ?? s.title ?? idx);
  const labelOf = (s: any, idx: number) => String(s.name ?? s.title ?? s.id ?? `Scenario ${idx + 1}`);

  root.innerHTML = "";
  const wrap = el("div", { className: "app-wrap" });
  const header = el("div", { className: "app-header" });
  const title = el("h1", { text: "Game" });

  const picker = el("select") as HTMLSelectElement;
  scenarios.forEach((s: any, i: number) => {
    const opt = el("option") as HTMLOptionElement;
    opt.value = String(i);
    opt.textContent = labelOf(s, i);
    picker.appendChild(opt);
  });

  const initialIndex = (() => {
    // manifest.initial is a path in your setup; try to match by id or filename
    const base = initialPath.split("/").pop()?.replace(".json", "");
    const idx = scenarios.findIndex((s: any) => (s.id && String(s.id) === base) || (s.name && String(s.name) === base));
    return idx >= 0 ? idx : 0;
  })();
  picker.value = String(initialIndex);

  const meta = el("div", { className: "meta" });
  const left = el("div", { className: "panel" });
  const right = el("div", { className: "panel" });

  header.append(title, picker);
  wrap.append(header, meta);

  const render = () => {
    const s: any = scenarios[Number(picker.value)];
    meta.innerHTML = "";

    const summary = el("div", { className: "summary" });
    summary.innerHTML = `
      <div><b>Loaded scenarios:</b> ${scenarios.length}</div>
      <div><b>Selected:</b> ${labelOf(s, Number(picker.value))}</div>
      <div><b>Layers:</b> ${s.layers ?? "?"}</div>
      <div><b>Start:</b> ${s.start ? `L${s.start.layer}-R${s.start.row}-C${s.start.col}` : "?"}</div>
      <div><b>Goal:</b> ${s.goal ? `L${s.goal.layer}-R${s.goal.row}-C${s.goal.col}` : "?"}</div>
      <div><b>Objective:</b> ${s.objective ?? "(none)"}</div>
    `;

    left.innerHTML = "";
    right.innerHTML = "";

    // Show movement rules
    const movement = el("pre");
    movement.textContent = JSON.stringify(s.movement ?? {}, null, 2);

    // Show transitions
    const transitions = el("pre");
    transitions.textContent = JSON.stringify(s.transitions ?? [], null, 2);

    left.append(el("h3", { text: "Movement" }), movement);
    right.append(el("h3", { text: "Transitions" }), transitions);

    meta.append(summary);
    meta.append(el("div", { className: "grid" },));
    meta.append(el("div", { className: "two" }));
    meta.append(el("div"));
    meta.append(el("div"));
    meta.append(el("div"));
    meta.append(el("div"));

    // Simple layout
    const two = el("div", { className: "two" });
    two.append(left, right);
    meta.append(two);
  };

  picker.addEventListener("change", render);

  // Basic styles
  const style = document.createElement("style");
  style.textContent = `
    .app-wrap { max-width: 1100px; margin: 0 auto; padding: 16px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #e8e8e8; }
    .app-header { display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
    h1 { margin: 0; font-size: 40px; }
    select { padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.15); background: rgba(0,0,0,.2); color: #e8e8e8; }
    .summary { margin: 14px 0; display: grid; gap: 6px; }
    .two { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .panel { padding: 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.15); }
    pre { margin: 8px 0 0; white-space: pre-wrap; word-break: break-word; }
    @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);

  root.appendChild(wrap);
  render();
}
