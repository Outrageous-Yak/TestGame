import type { Scenario } from "../engine/types";

export function scenarioToTemplateJSON(s: Scenario): string {
  const template = {
    id: s.id,
    name: s.name,
    layers: s.layers,
    objective: s.objective ?? "Reach the goal hex.",
    description: s.description ?? "",
    notes: s.notes ?? [],
    start: s.start,
    goal: s.goal,
    missing: s.missing ?? [],
    blocked: s.blocked ?? [],
    movement: s.movement ?? {},
    transitions: s.transitions ?? [],
    revealOnEnterGuaranteedUp: s.revealOnEnterGuaranteedUp ?? true
  };
  return JSON.stringify(template, null, 2);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
