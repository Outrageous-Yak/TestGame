import * as WorldsMod from "../worlds";
import type { ScenarioEntry, ScenarioTheme, Track, WorldEntry } from "./types";

function getRegisteredWorlds(): any[] {
  const anyMod: any = WorldsMod as any;
  const list =
    (Array.isArray(anyMod?.worlds) && anyMod.worlds) ||
    (Array.isArray(anyMod?.default) && anyMod.default) ||
    (Array.isArray(anyMod?.registeredWorlds) && anyMod.registeredWorlds) ||
    (Array.isArray(anyMod?.registry) && anyMod.registry) ||
    [];
  return list;
}

function normalizeWorldEntry(raw: any): WorldEntry | null {
  if (!raw) return null;
  const w = raw.default ?? raw;

  const id = String(w.id ?? w.slug ?? w.key ?? "world");
  const name = String(w.name ?? w.title ?? id);

  const scenarios = Array.isArray(w.scenarios) ? w.scenarios : [];

  const normScenarios: ScenarioEntry[] = scenarios
    .map((s: any, idx: number): ScenarioEntry | null => {
      if (!s) return null;

      const sid = String(s.id ?? s.slug ?? `scenario-${idx}`);
      const sname = String(s.name ?? s.title ?? sid);

      const scenarioJson = String(s.scenarioJson ?? s.json ?? "");
      if (!scenarioJson) return null;

      const theme: ScenarioTheme =
        s.theme ??
        ({
          palette: {
            L1: "#19ffb4",
            L2: "#67a5ff",
            L3: "#ffd36a",
            L4: "#ff7ad1",
            L5: "#a1ff5a",
            L6: "#a58bff",
            L7: "#ff5d7a",
          },
          assets: {
            diceFacesBase: "images/dice",
            diceCornerBorder: "",
            villainsBase: "images/villains",
          },
        } as ScenarioTheme);

      const tracks: Track[] | undefined = Array.isArray(s.tracks)
        ? (s.tracks
            .map((t: any, tIdx: number): Track | null => {
              if (!t) return null;
              const tid = String(t.id ?? `track-${tIdx}`);
              const tname = String(t.name ?? tid);
              const tjson = String(t.scenarioJson ?? t.json ?? "");
              if (!tjson) return null;
              const progression = t.progression;
              return {
                id: tid,
                name: tname,
                scenarioJson: tjson,
                ...(progression ? { progression } : {}),
              };
            })
            .filter(Boolean) as Track[])
        : undefined;

      const cloudMode =
        s.cloudMode === "cloudy" || s.cloudMode === "full_cloud" ? s.cloudMode : undefined;

      const extendedVisibility = [
        "night",
        "invisible",
        "memory",
        "lantern",
        "crystal_vision",
        "echo",
      ] as const;
      const visibilityMode =
        extendedVisibility.includes(s.visibilityMode) ? s.visibilityMode : undefined;

      const progression = s.progression;
      return {
        id: sid,
        name: sname,
        desc: s.desc,
        scenarioJson,
        theme,
        tracks: tracks && tracks.length ? tracks : undefined,
        cloudMode,
        ...(visibilityMode ? { visibilityMode } : {}),
        ...(progression ? { progression } : {}),
      };
    })
    .filter(Boolean) as ScenarioEntry[];

  if (normScenarios.length === 0) return null;

  const progression = w.progression;
  return {
    id,
    name,
    desc: w.desc,
    menu: w.menu ?? {},
    scenarios: normScenarios,
    ...(progression ? { progression } : {}),
  };
}

export function loadWorlds(): WorldEntry[] {
  const rawList = getRegisteredWorlds();
  const list: WorldEntry[] = [];

  for (const raw of rawList) {
    const norm = normalizeWorldEntry(raw);
    if (norm) list.push(norm);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}
