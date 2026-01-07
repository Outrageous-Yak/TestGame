import type { Scenario } from "../engine/types";

export function mountApp(
  root: HTMLElement | null,
  scenarios: Scenario[],
  initialId: string
) {
  if (!root) throw new Error('Missing element with id="app"');

  root.innerHTML = `
    <div style="padding:16px;font-family:system-ui">
      <h1>Game</h1>
      <p>Loaded scenarios: ${scenarios.length}</p>
      <p>Initial: ${String(initialId)}</p>
    </div>
  `;
}
