// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./app.css";
import "./cloud/cloudCover.css";
import { StartScreen } from "./screens/StartScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { GameController } from "./game/GameController";
import { loadWorlds } from "./worldsLoader";
import type { Screen, WorldEntry } from "./types";
import { CharactersScreen } from "../features/sprite-builder/CharactersScreen";
import { PuzzleStudioScreen, isDevMode, resolveInitialScreen } from "../features/puzzle-studio";
import {
  loadActiveSpriteId,
  loadSprites,
  resolveActiveSprite,
} from "../features/sprite-builder/spriteStorage";
import type { SavedPixelSprite } from "../features/sprite-builder/spriteTypes";

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== "undefined") {
      return resolveInitialScreen(window.location.search);
    }
    return "start";
  });

  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);

  const world = useMemo(() => worlds.find((w) => w.id === worldId) ?? null, [worlds, worldId]);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioEntry = useMemo(
    () => world?.scenarios.find((s) => s.id === scenarioId) ?? null,
    [world, scenarioId]
  );

  const [trackId, setTrackId] = useState<string | null>(null);
  const trackEntry = useMemo(() => {
    const tracks = scenarioEntry?.tracks;
    if (!tracks || tracks.length <= 0) return null;
    return tracks.find((t) => t.id === trackId) ?? null;
  }, [scenarioEntry, trackId]);

  const [sprites, setSprites] = useState<SavedPixelSprite[]>(() => loadSprites());
  const [activeSpriteId, setActiveSpriteId] = useState<string | null>(() => loadActiveSpriteId());
  const customSprite = useMemo(
    () => resolveActiveSprite(sprites, activeSpriteId),
    [sprites, activeSpriteId]
  );

  useEffect(() => {
    setWorlds(loadWorlds());
  }, []);

  const resetAll = useCallback(() => {
    setWorldId(null);
    setScenarioId(null);
    setTrackId(null);
    setScreen("start");
  }, []);

  const handleActiveChange = useCallback((id: string | null) => {
    setActiveSpriteId(id);
    setSprites(loadSprites());
  }, []);

  const themeVars = useMemo(() => {
    const p = scenarioEntry?.theme?.palette;
    return {
      ["--L1" as any]: p?.L1 ?? "#19ffb4",
      ["--L2" as any]: p?.L2 ?? "#67a5ff",
      ["--L3" as any]: p?.L3 ?? "#ffd36a",
      ["--L4" as any]: p?.L4 ?? "#ff7ad1",
      ["--L5" as any]: p?.L5 ?? "#a1ff5a",
      ["--L6" as any]: p?.L6 ?? "#a58bff",
      ["--L7" as any]: p?.L7 ?? "#ff5d7a",
    } as React.CSSProperties;
  }, [scenarioEntry]);

  if (screen === "start") {
    return (
      <StartScreen
        themeVars={themeVars}
        worldsCount={worlds.length}
        devMode={isDevMode()}
        onStart={() => setScreen("world")}
        onCharacters={() => setScreen("characters")}
        onPuzzleStudio={() => setScreen("studio")}
        onReset={resetAll}
      />
    );
  }

  if (screen === "characters") {
    return (
      <CharactersScreen
        themeVars={themeVars}
        onBack={() => setScreen("start")}
        onActiveChange={handleActiveChange}
      />
    );
  }

  if (screen === "studio") {
    return (
      <PuzzleStudioScreen
        themeVars={themeVars}
        worlds={worlds}
        onBack={() => setScreen("start")}
      />
    );
  }

  if (screen !== "game") {
    return (
      <MenuScreen
        themeVars={themeVars}
        worlds={worlds}
        world={world}
        worldId={worldId}
        scenarioId={scenarioId}
        trackId={trackId}
        scenarioEntry={scenarioEntry}
        trackEntry={trackEntry}
        onSelectWorld={(w) => {
          setWorldId(w.id);
          const s0 = w.scenarios[0] ?? null;
          setScenarioId(s0 ? s0.id : null);
          const t0 = s0?.tracks?.[0] ?? null;
          setTrackId(t0 ? t0.id : null);
          setScreen("scenario");
        }}
        onSelectScenario={(s) => {
          setScenarioId(s.id);
          const t0 = s.tracks?.[0] ?? null;
          setTrackId(t0 ? t0.id : null);
          setScreen("scenario");
        }}
        onSelectTrack={setTrackId}
        onBack={resetAll}
        onStart={() => setScreen("game")}
        onQuickStart={() => {
          const w0 = worlds[0];
          const s0 = w0?.scenarios?.[0] ?? null;
          if (w0 && s0) {
            setWorldId(w0.id);
            setScenarioId(s0.id);
            const t0 = s0.tracks?.[0] ?? null;
            setTrackId(t0 ? t0.id : null);
            setScreen("game");
          }
        }}
      />
    );
  }

  if (!scenarioEntry) {
    resetAll();
    return null;
  }

  return (
    <GameController
      scenarioEntry={scenarioEntry}
      trackEntry={trackEntry}
      trackId={trackId}
      customSprite={customSprite}
      onExit={resetAll}
    />
  );
}
