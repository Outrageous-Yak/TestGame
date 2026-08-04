import type { WorldEntry, ScenarioTheme } from "../../ui/types";

export type StudioTrackRef = {
  key: string;
  worldId: string;
  worldName: string;
  scenarioId: string;
  scenarioName: string;
  trackId: string;
  trackName: string;
  scenarioJson: string;
  theme: ScenarioTheme;
};

export function buildStudioCatalog(worlds: WorldEntry[]): StudioTrackRef[] {
  const out: StudioTrackRef[] = [];

  for (const world of worlds) {
    for (const scenario of world.scenarios) {
      const tracks = scenario.tracks;
      if (tracks && tracks.length > 0) {
        for (const track of tracks) {
          out.push({
            key: `${world.id}/${scenario.id}/${track.id}`,
            worldId: world.id,
            worldName: world.name,
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            trackId: track.id,
            trackName: track.name,
            scenarioJson: track.scenarioJson,
            theme: scenario.theme,
          });
        }
      } else {
        out.push({
          key: `${world.id}/${scenario.id}/default`,
          worldId: world.id,
          worldName: world.name,
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          trackId: scenario.id,
          trackName: scenario.name,
          scenarioJson: scenario.scenarioJson,
          theme: scenario.theme,
        });
      }
    }
  }

  return out;
}

export function groupCatalogByWorld(catalog: StudioTrackRef[]): Array<{
  worldId: string;
  worldName: string;
  tracks: StudioTrackRef[];
}> {
  const map = new Map<string, { worldId: string; worldName: string; tracks: StudioTrackRef[] }>();
  for (const t of catalog) {
    let g = map.get(t.worldId);
    if (!g) {
      g = { worldId: t.worldId, worldName: t.worldName, tracks: [] };
      map.set(t.worldId, g);
    }
    g.tracks.push(t);
  }
  return [...map.values()];
}
