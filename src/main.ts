import { assertScenario } from "./engine/scenario";
import { mountApp } from "./ui/app";
import type { Scenario } from "./engine/types";

type Manifest = { initial: string; files: string[] };

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

async function loadScenario(path: string): Promise<Scenario> {
  const s = await fetchJson<Scenario>(path);
  assertScenario(s);
  return s;
}

(async () => {
  const manifest = await fetchJson<Manifest>("scenarios/manifest.json");
  const scenarios = await Promise.all(manifest.files.map(loadScenario));
  mountApp(document.getElementById("app"), scenarios, manifest.initial);
})();
