import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorldEntry } from "../../ui/types";
import type { GameState, Scenario } from "../../engine/types";
import { tryMove } from "../../engine/api";
import { idToCoord } from "../../ui/game/helpers";
import { buildStudioCatalog, type StudioTrackRef } from "./studioCatalog";
import {
  analyzeScenarioAsync,
  compareTracks,
  loadPrismReference,
  loadScenarioForTrack,
  type PrismReference,
  type StudioAnalysisResult,
} from "./studioAnalysis";
import { freshStudioState, stateAfterPath } from "./studioBoard";
import { TrackBrowser } from "./components/TrackBrowser";
import { BoardViewer, type OverlayOptions } from "./components/BoardViewer";
import { StudioToolbar } from "./components/StudioToolbar";
import { BottomTabs, type BottomTab } from "./components/BottomTabs";
import { ReplayPanel } from "./components/ReplayPanel";
import { ValidationPanel } from "./components/ValidationPanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { FitnessPanel } from "./components/FitnessPanel";
import { SimilarityPanel } from "./components/SimilarityPanel";
import { EngineeringPanel } from "./components/EngineeringPanel";
import { ExportPanel } from "./components/ExportPanel";
import "./puzzleStudio.css";

type PuzzleStudioScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  onBack: () => void;
};

export function PuzzleStudioScreen({ themeVars, worlds, onBack }: PuzzleStudioScreenProps) {
  const catalog = useMemo(() => buildStudioCatalog(worlds), [worlds]);
  const [selectedKey, setSelectedKey] = useState<string | null>(catalog[0]?.key ?? null);
  const selectedTrack = catalog.find((t) => t.key === selectedKey) ?? null;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [playState, setPlayState] = useState<GameState | null>(null);
  const [viewLayer, setViewLayer] = useState(1);
  const [analysis, setAnalysis] = useState<StudioAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [prismRef, setPrismRef] = useState<PrismReference[]>([]);
  const [prismReady, setPrismReady] = useState(false);

  const [bottomTab, setBottomTab] = useState<BottomTab>("replay");
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1000);

  const [simAKey, setSimAKey] = useState(catalog[0]?.key ?? "");
  const [simBKey, setSimBKey] = useState(catalog[1]?.key ?? catalog[0]?.key ?? "");
  const [simResult, setSimResult] = useState<ReturnType<typeof compareTracks> | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [overlays, setOverlays] = useState<OverlayOptions>({
    portals: false,
    missing: false,
    blocked: false,
    rowMovement: false,
    heatMap: false,
    animateRows: false,
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadPrismReference().then((ref) => {
      setPrismRef(ref);
      setPrismReady(true);
    });
  }, []);

  const runAnalysis = useCallback(
    async (sc: Scenario) => {
      if (!prismReady) return;
      setAnalyzing(true);
      try {
        const result = await analyzeScenarioAsync(sc, prismRef);
        setAnalysis(result);
        setReplayIndex(0);
      } finally {
        setAnalyzing(false);
      }
    },
    [prismRef, prismReady]
  );

  const loadTrack = useCallback(
    async (track: StudioTrackRef) => {
      setSelectedKey(track.key);
      setAnalyzing(true);
      try {
        const sc = await loadScenarioForTrack(track.scenarioJson);
        const state = freshStudioState(sc);
        setScenario(sc);
        setPlayState(state);
        const startLayer = sc.start.layer;
        setViewLayer(startLayer);
        setReplayMode(false);
        setReplayIndex(0);
        if (prismReady) {
          const result = await analyzeScenarioAsync(sc, prismRef);
          setAnalysis(result);
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAnalyzing(false);
      }
    },
    [prismRef, prismReady]
  );

  useEffect(() => {
    if (selectedTrack && !scenario) {
      loadTrack(selectedTrack);
    }
  }, [selectedTrack, scenario, loadTrack]);

  useEffect(() => {
    if (scenario && prismReady && !analysis && !analyzing) {
      runAnalysis(scenario);
    }
  }, [scenario, prismReady, analysis, analyzing, runAnalysis]);

  const displayState = useMemo(() => {
    if (!scenario || !playState) return null;
    if (replayMode && analysis?.solution.pathHexIds.length) {
      return stateAfterPath(scenario, analysis.solution.pathHexIds, replayIndex);
    }
    return playState;
  }, [scenario, playState, replayMode, analysis, replayIndex]);

  const replayHighlight = useMemo(() => {
    if (!replayMode || !analysis) return null;
    const step = analysis.solution.replay[replayIndex];
    return step?.playerAfter ?? null;
  }, [replayMode, analysis, replayIndex]);

  const boardOverlays = useMemo(
    () => ({
      ...overlays,
      heatMap: overlays.heatMap,
    }),
    [overlays]
  );

  const heatMapData = overlays.heatMap && analysis ? analysis.heatMap : undefined;

  const handleHexClick = useCallback(
    (hexId: string) => {
      if (replayMode || !playState) return;
      const result = tryMove(playState, hexId);
      if (result.ok) {
        setPlayState({ ...playState });
        const coord = idToCoord(playState.playerHexId);
        if (coord) setViewLayer(coord.layer);
      }
    },
    [replayMode, playState]
  );

  useEffect(() => {
    if (!replayPlaying || !analysis) return;
    playIntervalRef.current = window.setInterval(() => {
      setReplayIndex((i) => {
        const max = analysis.solution.replay.length - 1;
        if (i >= max) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, replaySpeed);
    return () => {
      if (playIntervalRef.current) window.clearInterval(playIntervalRef.current);
    };
  }, [replayPlaying, analysis, replaySpeed]);

  const runSimilarity = useCallback(async () => {
    const a = catalog.find((t) => t.key === simAKey);
    const b = catalog.find((t) => t.key === simBKey);
    if (!a || !b) return;
    setSimLoading(true);
    try {
      const scA = await loadScenarioForTrack(a.scenarioJson);
      const scB = await loadScenarioForTrack(b.scenarioJson);
      const solA =
        analysis?.solution.pathHexIds.length && a.key === selectedKey
          ? analysis.solution.pathHexIds
          : await analyzeScenarioAsync(scA, prismRef).then((r) => r.solution.pathHexIds);
      const solB = await analyzeScenarioAsync(scB, prismRef).then((r) => r.solution.pathHexIds);
      setSimResult(compareTracks(scA, solA, scB, solB));
    } finally {
      setSimLoading(false);
    }
  }, [catalog, simAKey, simBKey, prismRef, analysis, selectedKey]);

  useEffect(() => {
    if (bottomTab === "similarity" && prismReady) {
      runSimilarity();
    }
  }, [bottomTab, simAKey, simBKey, prismReady, runSimilarity]);

  const themeForTrack = selectedTrack?.theme;
  const bgUrl = themeForTrack?.assets?.backgroundLayers?.[`L${viewLayer}` as "L1"] ??
    themeForTrack?.assets?.backgroundGame;

  const trackLabel = selectedTrack
    ? `${selectedTrack.worldName} — ${selectedTrack.trackName}`
    : "No track";

  return (
    <div className="appRoot ps-root" style={themeVars}>
      <StudioToolbar
        trackLabel={trackLabel}
        viewLayer={viewLayer}
        onLayerChange={setViewLayer}
        overlays={overlays}
        onOverlayChange={(patch) => setOverlays((o) => ({ ...o, ...patch }))}
        replayMode={replayMode}
        onToggleReplayMode={() => {
          setReplayMode((m) => !m);
          setReplayPlaying(false);
          setReplayIndex(0);
        }}
        onBack={onBack}
        onReanalyze={() => scenario && runAnalysis(scenario)}
        analyzing={analyzing}
      />

      <div className="ps-main">
        <TrackBrowser
          catalog={catalog}
          selectedKey={selectedKey}
          onSelect={(t) => loadTrack(t)}
        />

        <div className="ps-boardColumn">
          <BoardViewer
            state={displayState}
            viewLayer={viewLayer}
            backgroundUrl={bgUrl}
            overlays={boardOverlays}
            heatMap={heatMapData}
            replayHighlightHex={replayHighlight}
            onHexClick={handleHexClick}
            playtestEnabled={!replayMode}
            boardRef={boardRef}
          />
        </div>
      </div>

      <BottomTabs active={bottomTab} onChange={setBottomTab} />

      <div className="ps-bottomPanel">
        {bottomTab === "replay" && analysis ? (
          <ReplayPanel
            replay={analysis.solution.replay}
            stepIndex={replayIndex}
            playing={replayPlaying}
            speed={replaySpeed}
            onPlay={() => setReplayPlaying(true)}
            onPause={() => setReplayPlaying(false)}
            onNext={() =>
              setReplayIndex((i) =>
                Math.min(i + 1, analysis.solution.replay.length - 1)
              )
            }
            onPrev={() => setReplayIndex((i) => Math.max(0, i - 1))}
            onRestart={() => {
              setReplayIndex(0);
              setReplayPlaying(false);
            }}
            onSpeedChange={setReplaySpeed}
          />
        ) : null}

        {bottomTab === "analysis" ? (
          <MetricsPanel analysis={analysis} loading={analyzing} />
        ) : null}

        {bottomTab === "validation" ? (
          <ValidationPanel report={analysis?.validation ?? null} loading={analyzing} />
        ) : null}

        {bottomTab === "metrics" ? (
          <MetricsPanel analysis={analysis} loading={analyzing} />
        ) : null}

        {bottomTab === "fitness" ? (
          <FitnessPanel fitness={analysis?.fitness ?? null} loading={analyzing} />
        ) : null}

        {bottomTab === "similarity" ? (
          <SimilarityPanel
            catalog={catalog}
            trackAKey={simAKey}
            trackBKey={simBKey}
            onTrackAChange={setSimAKey}
            onTrackBChange={setSimBKey}
            similarity={simResult}
            loading={simLoading}
          />
        ) : null}

        {bottomTab === "engineering" ? (
          <EngineeringPanel scenario={scenario} analysis={analysis} />
        ) : null}

        {bottomTab === "export" ? (
          <ExportPanel scenario={scenario} analysis={analysis} boardRef={boardRef} />
        ) : null}
      </div>
    </div>
  );
}
