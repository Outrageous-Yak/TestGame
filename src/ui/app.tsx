// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import "./app.css";
import "./cloud/cloudCover.css";
import "./cloud/cloudAtmosphere.css";
import "./cloud/forkVisibility.css";
import "./cloud/stormWeather.css";
import "./game/reachSparkle.css";
import { StartScreen } from "./screens/StartScreen";
import { MenuScreen } from "./screens/MenuScreen";
import { GameController } from "./game/GameController";
import { loadWorlds } from "./worldsLoader";
import type { Screen, WorldEntry } from "./types";
import { CharactersScreen } from "../features/sprite-builder/CharactersScreen";
import { PuzzleStudioScreen, isDevMode, resolveInitialScreen } from "../features/puzzle-studio";
import { TrackPlannerScreen } from "../studio/trackPlanner";
import { WorldMapScreen } from "../campaign/WorldMapScreen";
import { CampaignBuilderScreen } from "../campaign/builder/CampaignBuilderScreen";
import {
  loadActiveSpriteId,
  loadSprites,
  resolveActiveSprite,
} from "../features/sprite-builder/spriteStorage";
import type { SavedPixelSprite } from "../features/sprite-builder/spriteTypes";
import { resolveAnimatedSpriteSheet } from "../features/sprite-builder/animatedSpriteSheets";

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
  const animatedSpriteSheet = useMemo(
    () => resolveAnimatedSpriteSheet(activeSpriteId),
    [activeSpriteId]
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

  const devMode = isDevMode();

  if (screen === "start") {
    return (
      <StartScreen
        themeVars={themeVars}
        worldsCount={worlds.length}
        devMode={isDevMode()}
        onStart={() => setScreen("worldMap")}
        onCharacters={() => setScreen("characters")}
        onPuzzleStudio={() => setScreen("studio")}
        onTrackPlanner={() => setScreen("trackPlanner")}
        onCampaignBuilder={() => setScreen("campaignBuilder")}
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

  if (screen === "trackPlanner") {
    return (
      <TrackPlannerScreen
        themeVars={themeVars}
        worlds={worlds}
        onBack={() => setScreen("start")}
      />
    );
  }

  if (screen === "campaignBuilder") {
    return (
      <CampaignBuilderScreen
        themeVars={themeVars}
        worlds={worlds}
        onBack={() => setScreen("start")}
      />
    );
  }

  if (screen === "worldMap") {
    return (
      <WorldMapScreen
        themeVars={themeVars}
        worlds={worlds}
        bypassProgressionLocks={devMode}
        onBack={() => setScreen("start")}
        onBrowseList={() => setScreen("world")}
        onLaunchTrack={(target) => {
          setWorldId(target.worldId);
          setScenarioId(target.scenarioId);
          setTrackId(target.trackId);
          setScreen("game");
        }}
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
        bypassProgressionLocks={devMode}
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
        onBack={() => setScreen("worldMap")}
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
    // Missing launch target — return to map on next tick (avoid setState during render).
    queueMicrotask(() => setScreen("worldMap"));
    return null;
  }

  return (
    <GameController
      worldId={worldId ?? "unknown"}
      worlds={worlds}
      scenarioEntry={scenarioEntry}
      trackEntry={trackEntry}
      trackId={trackId}
      customSprite={customSprite}
      playerSpriteSheet={animatedSpriteSheet}
      onExit={() => setScreen("worldMap")}
      onGoHome={() => setScreen("worldMap")}
      onPlayNextTrack={setTrackId}
    />
  );
}
