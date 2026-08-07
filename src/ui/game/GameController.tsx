// src/ui/game/GameController.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameState } from "../../engine/types";
import { newGame, getMinMovesToGoal, tryMove, attemptMoveToSlot } from "../../engine/api";
import type { MoveResult } from "../../engine/api";

import { ROW_LENS, enterLayer, revealHex } from "../../engine/board";
import { neighborIdsSameLayer } from "../../engine/neighbors";
import { facingFromMove, hexIdAtSlot, rowShiftLabel, clockwiseOrderFrom } from "../../engine/layout";

import { resolveTileVisualType, tileArtRelPath } from "../tileArt";
import { getBestScore, saveBestScore } from "../bestScore";
import type {
  LogEntry,
  ScenarioEntry,
  Track,
  VillainKey,
  VillainTrigger,
  Encounter,
  CardKey,
  CardTrigger,
} from "../types";
import { PlayerToken } from "../../features/sprite-builder/PlayerToken";
import type { SavedPixelSprite } from "../../features/sprite-builder/spriteTypes";
import type { AnimatedSpriteSheet } from "../../features/sprite-builder/animatedSpriteSheets";
import { CloudCover, MoveOverlay, StormWeather, cloudAtmosphereClass, computeCloudVisibility } from "../cloud";
import {
  REACH_PULSE_INTERVAL_MS,
  shouldShowFullCloudMovePulse,
  shouldUseButtonReachPulse,
} from "../cloud/cloudBoardLayering";
import type { ScenarioDocument, TrackTransformSelection } from "../../engine/layerTransform/types";
import {
  buildRuntimeScenario,
  formatLayerTransformDebug,
  loadTrackVariationState,
  parseForcedLayerTransforms,
  resolveTrackRunOptions,
  saveTrackVariationState,
} from "../../engine/layerTransform";
import { isDevMode } from "../../features/puzzle-studio/devMode";
import {
  scenarioRef,
  ensureScenario,
  idToCoord,
  toPublicUrl,
  fetchJson,
  getHexFromState,
  isBlockedOrMissing,
  layerCssVar,
  reachPulseGlow,
  nowHHMM,
  findGoalId,
  findFirstPlayableHexId,
  hexGridPlacement,
  parseCardTriggersFromScenario,
  pickRiskVillain,
  portalTransitionAt,
  parseVillainsFromScenario,
} from "./helpers";
import {
  selectHexTileArtUrl,
  shouldUseSolidGoldGoal,
} from "./hexTileVisual";
import { playGoalLandSound, playPlayerMoveSound, playPortalLandSound, playFailedMoveSound, preloadSoundEffects } from "../audio/soundEffects";
import { preloadThunderSound } from "../audio/stormAudio";
import { ReachSparkle } from "./ReachSparkle";
import "./citadelFrame.css";
import { startBackgroundMusic, stopBackgroundMusic } from "../audio/backgroundMusic";
import type { MoveAttemptResult } from "../../engine/moveAttempt";

type GoalAchievedState = {
  moves: number;
  least: number | null;
  best: number | null;
};

export type GameControllerProps = {
  scenarioEntry: ScenarioEntry;
  trackEntry: Track | null;
  trackId: string | null;
  customSprite?: SavedPixelSprite | null;
  playerSpriteSheet?: AnimatedSpriteSheet;
  onExit: () => void;
  onGoHome: () => void;
  onPlayNextTrack: (trackId: string) => void;
};

export function GameController({
  scenarioEntry,
  trackEntry,
  trackId,
  customSprite = null,
  playerSpriteSheet,
  onExit,
  onGoHome,
  onPlayNextTrack,
}: GameControllerProps) {
  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const pendingEncounterMoveIdRef = useRef<string | null>(null);
  const encounterActive = !!encounter;
  const [goalAchieved, setGoalAchieved] = useState<GoalAchievedState | null>(null);
  const goalAchievedActive = !!goalAchieved;
  const startScenarioOptionsRef = useRef<{
    intent?: import("../../engine/layerTransform").TrackRunIntent;
  }>({});

  /* =========================
     Core game state
  ========================= */
  const [state, setState] = useState<GameState | null>(null);
  const [uiTick, forceRender] = useState(0);

  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);
  const canGoDown = currentLayer > 1;
  const canGoUp = currentLayer < scenarioLayerCount;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startHexId, setStartHexId] = useState<string | null>(null);

  const [showGhost, setShowGhost] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const cloudMode = scenarioEntry.cloudMode;
  const isCloudScenario = cloudMode === "cloudy" || cloudMode === "full_cloud";

  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const playerBtnRef = useRef<HTMLButtonElement | null>(null);

  const deckRefs = useRef<Record<CardKey, HTMLDivElement | null>>({
    cosmic: null,
    risk: null,
    terrain: null,
    shadow: null,
  });


  /* =========================
     Player id / coord
  ========================= */
  const playerId = useMemo(() => {
    const pid = (state as any)?.playerHexId;
    return typeof pid === "string" ? pid : null;
  }, [state, uiTick]);

  const playerCoord = useMemo(() => {
    return playerId ? idToCoord(playerId) : null;
  }, [playerId]);

  const playerLayer = playerCoord?.layer ?? null;

  function setUiTickSafe(setter: React.Dispatch<React.SetStateAction<number>>) {
    setter((n) => n + 1);
  }

  const findTriggerForHex = useCallback(
    (id: string): VillainKey | null => {
      const c = idToCoord(id);
      if (!c) return null;

      for (const v of villainTriggers) {
        if (v.layer !== c.layer) continue;
        if (v.row !== c.row) continue;

        if (v.cols === "any" || !v.cols) return v.key;
        if (Array.isArray(v.cols) && v.cols.includes(c.col)) return v.key;
      }

      return null;
    },
    [villainTriggers]
  );

  /* =========================
     Render helpers/components (INSIDE App)
  ========================= */

  const rows = useMemo(() => Array.from({ length: ROW_LENS.length }, (_, i) => i), []);

  function GhostGrid(props: { layer: number }) {
    const layer = props.layer;

    return (
      <div className="ghostGrid" aria-hidden="true">
        {rows.map((r) => {
          const cols = ROW_LENS[r] ?? 0;

          return (
            <div key={"ghost-row-" + layer + "-" + r} className="ghostRow">
              {Array.from({ length: cols }, (_, c) => (
                <div
                  key={"g-" + layer + "-" + r + "-" + c}
                  className="ghostSlot"
                  style={hexGridPlacement(r, c)}
                >
                  <div className="ghostHex" />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  function SideBar(props: { side: "left" | "top"; currentLayer: number }) {
    const side = props.side;
    const currentLayerLocal = props.currentLayer;

    if (side === "top") {
      const segments = [1, 2, 3, 4, 5, 6, 7];

      const goalLayer = goalId ? idToCoord(goalId)?.layer ?? null : null;
      const playerLayerBar = playerId ? idToCoord(playerId)?.layer ?? null : null;

      const markerLeftPct = (layer: number) => `${((layer - 0.5) / 7) * 100}%`;

      return (
        <div className="barWrap barTop">
          <div className="layerBar layerBarHorizontal">
            {segments.map((layerVal) => {
              const active = layerVal === currentLayerLocal;
              return (
                <div
                  key={layerVal}
                  className={"barSeg" + (active ? " isActive" : "")}
                  data-layer={layerVal}
                />
              );
            })}

            {playerLayerBar && playerLayerBar >= 1 && playerLayerBar <= 7 ? (
              <div className="barPlayerMini" style={{ left: markerLeftPct(playerLayerBar) }}>
                <PlayerToken
                  variant="mini"
                  customSprite={customSprite}
                  walkFrame={walkFrame}
                  playerFacing={playerFacing}
                  spriteSheetUrl={spriteSheetUrl()}
                  frameW={FRAME_W}
                  frameH={FRAME_H}
                  cols={SPRITE_COLS}
                  rows={SPRITE_ROWS}
                />
              </div>
            ) : null}

            {goalLayer && goalLayer >= 1 && goalLayer <= 7 ? (
              <div className="goalMarker" style={{ left: markerLeftPct(goalLayer) }}>
                G
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="barWrap barLeft">
        <div className="layerBar rowShiftBar">
          {rows.map((r) => {
            const label = state ? rowShiftLabel(state, currentLayerLocal, r) : "";

            return (
              <div key={"rowSeg-" + r} className="barSeg rowSeg">
                {label ? <span className="rowShiftLabel">{label}</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function HexDeckCardsRow(props: { glowVar: string }) {
    const rowStyle = {
      ["--cardGlow" as any]: props.glowVar,
    } as React.CSSProperties;

    const cards: CardKey[] = ["cosmic", "risk", "terrain", "shadow"];

    return (
      <div className="mobileDeckRow" style={rowStyle}>
        {cards.map((card) => (
          <div
            key={card}
            className={"mobileDeckCard hexDeckCard " + card}
            ref={(el) => (deckRefs.current[card] = el)}
          >
            <div className="deckFx" />
          </div>
        ))}
      </div>
    );
  }

  /* =========================
     Moves / optimal / log
  ========================= */

  const [movesTaken, setMovesTaken] = useState(0);

  const [goalId, setGoalId] = useState<string | null>(null);
  const [optimalAtStart, setOptimalAtStart] = useState<number | null>(null);
  const [optimalFromNow, setOptimalFromNow] = useState<number | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);

  const computeOptimalMoves = useCallback((st: GameState | null) => {
    if (!st) return null;
    return getMinMovesToGoal(st);
  }, []);

  const [log, setLog] = useState<LogEntry[]>([]);
  const logNRef = useRef(0);

  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    logNRef.current += 1;
    const e: LogEntry = { n: logNRef.current, t: nowHHMM(), msg, kind };
    setLog((prev) => [e, ...prev].slice(0, 24));
  }, []);

  const recordWin = useCallback(
    (moveCount: number) => {
      let best: number | null = bestScore;
      if (scenarioEntry) {
        best = saveBestScore(scenarioEntry.id, moveCount, trackId);
        setBestScore(best);
        pushLog(`Goal reached in ${moveCount} moves! Best: ${best}`, "ok");
      } else {
        pushLog("Goal reached!", "ok");
      }
      setGoalAchieved({
        moves: moveCount,
        least: optimalAtStart,
        best,
      });
    },
    [scenarioEntry, trackId, pushLog, optimalAtStart, bestScore]
  );

  const playMoveOutcomeSound = useCallback(
    (res: MoveResult, landedId: string, moved: boolean) => {
      if (!moved) return;
      if (goalId && landedId === goalId) {
        playGoalLandSound();
      } else if (res.triggeredTransition) {
        playPortalLandSound();
      } else {
        playPlayerMoveSound();
      }
    },
    [goalId]
  );

  const nextTrack = useMemo(() => {
    const tracks = scenarioEntry.tracks ?? [];
    if (tracks.length <= 1) return null;
    const idx = trackId ? tracks.findIndex((t) => t.id === trackId) : 0;
    if (idx < 0 || idx >= tracks.length - 1) return null;
    return tracks[idx + 1];
  }, [scenarioEntry, trackId]);

  /* =========================
     Reachability (1-step neighbors)
  ========================= */

  const reachable = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    if (!playerId) return set;

    if (playerLayer !== currentLayer) return set;

    for (const nbId of neighborIdsSameLayer(state, playerId)) {
      const hex = getHexFromState(state, nbId) as any;
      const bm = isBlockedOrMissing(hex);
      if (!bm.missing && !bm.blocked) set.add(nbId);
    }

    return set;
  }, [state, playerId, playerLayer, currentLayer]);

  const reachableOrdered = useMemo(() => {
    if (!state || !playerId || playerLayer !== currentLayer || reachable.size === 0) return [];
    return clockwiseOrderFrom(state, currentLayer, playerId, reachable);
  }, [state, playerId, playerLayer, currentLayer, reachable]);

  const reachableKey = reachableOrdered.join("|");

  const [reachPulseIdx, setReachPulseIdx] = useState(0);

  useEffect(() => {
    setReachPulseIdx(0);
  }, [reachableKey]);

  useEffect(() => {
    const count = reachableOrdered.length;
    if (count === 0) return;

    const timer = window.setInterval(() => {
      setReachPulseIdx((i) => (i + 1) % count);
    }, REACH_PULSE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reachableKey, reachableOrdered.length]);

  const reachPulseId = reachableOrdered[reachPulseIdx] ?? null;

  const terrainHexIdsOnLayer = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        const id = hexIdAtSlot(state, currentLayer, r, c);
        if (!id) continue;
        const hex = getHexFromState(state, id);
        const bm = isBlockedOrMissing(hex);
        if (!bm.missing) set.add(id);
      }
    }
    return set;
  }, [state, currentLayer, uiTick]);

  const missingHexIdsOnLayer = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        const id = hexIdAtSlot(state, currentLayer, r, c);
        if (!id) continue;
        const hex = getHexFromState(state, id);
        if (isBlockedOrMissing(hex).missing) set.add(id);
      }
    }
    return set;
  }, [state, currentLayer, uiTick]);

  const portalHexIdsOnLayer = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;
    for (const id of terrainHexIdsOnLayer) {
      const tr = portalTransitionAt(state as any, id);
      if (tr) set.add(id);
    }
    if (startHexId && movesTaken === 0) {
      const sc = idToCoord(startHexId);
      if (sc?.layer === currentLayer) set.add(startHexId);
    }
    return set;
  }, [state, terrainHexIdsOnLayer, startHexId, movesTaken, currentLayer]);

  const cloudVisibilityMap = useMemo(() => {
    if (!isCloudScenario || !cloudMode || !state || !playerId) return null;
    if (playerLayer !== currentLayer) return null;
    return computeCloudVisibility({
      mode: cloudMode,
      currentHexId: playerId,
      legalMoveHexIds: reachable,
      allTerrainHexIds: terrainHexIdsOnLayer,
      missingHexIds: missingHexIdsOnLayer,
      goalHexId: goalId,
      portalHexIds: portalHexIdsOnLayer,
      adjacency: (hexId) => new Set(neighborIdsSameLayer(state, hexId)),
    });
  }, [
    isCloudScenario,
    cloudMode,
    state,
    playerId,
    playerLayer,
    currentLayer,
    reachable,
    reachableKey,
    terrainHexIdsOnLayer,
    missingHexIdsOnLayer,
    goalId,
    portalHexIdsOnLayer,
  ]);

  const [cloudTransitions, setCloudTransitions] = useState<Record<string, "revealing" | "concealing">>({});
  const prevPlayerForCloudRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCloudScenario || !playerId) {
      prevPlayerForCloudRef.current = playerId;
      return;
    }
    const prev = prevPlayerForCloudRef.current;
    if (prev && prev !== playerId) {
      setCloudTransitions({ [prev]: "concealing", [playerId]: "revealing" });
      const timer = window.setTimeout(() => setCloudTransitions({}), 700);
      prevPlayerForCloudRef.current = playerId;
      return () => window.clearTimeout(timer);
    }
    prevPlayerForCloudRef.current = playerId;
  }, [playerId, isCloudScenario]);

  useEffect(() => {
    if (!isCloudScenario) setCloudTransitions({});
  }, [scenarioEntry.id, trackId, isCloudScenario]);

  /* =========================
     Theme / assets
  ========================= */

  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME__URL = activeTheme?.assets.backgroundGame ?? "";

  const backgroundLayers: any = (activeTheme && activeTheme.assets && activeTheme.assets.backgroundLayers) || {};
  const BOARD_LAYER_ = backgroundLayers["L" + currentLayer] || "";

  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "images/dice";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "images/villains";
  const HEX_TILE = activeTheme?.assets.hexTile ?? "";
  const HEX_TILE_MOVABLE = activeTheme?.assets.hexTileMovable ?? "";
  const SOLID_GOLD_GOAL = activeTheme?.assets.solidGoldGoal ?? false;
  const BACKGROUND_MUSIC = activeTheme?.assets.backgroundMusic ?? "";
  const citadelFrame = activeTheme?.presentation === "citadel_frame";

  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const prevLayerRef = useRef(currentLayer);

  useEffect(() => {
    if (!citadelFrame) return;
    if (prevLayerRef.current === currentLayer) return;
    prevLayerRef.current = currentLayer;
    const el = boardWrapRef.current;
    if (!el) return;
    el.classList.add("citadelLayerShift");
    const timer = window.setTimeout(() => el.classList.remove("citadelLayerShift"), 520);
    return () => window.clearTimeout(timer);
  }, [citadelFrame, currentLayer]);

  const themeVars = useMemo(() => {
    const p = palette;
    return {
      ["--L1" as any]: p?.L1 ?? "#19ffb4",
      ["--L2" as any]: p?.L2 ?? "#67a5ff",
      ["--L3" as any]: p?.L3 ?? "#ffd36a",
      ["--L4" as any]: p?.L4 ?? "#ff7ad1",
      ["--L5" as any]: p?.L5 ?? "#a1ff5a",
      ["--L6" as any]: p?.L6 ?? "#a58bff",
      ["--L7" as any]: p?.L7 ?? "#ff5d7a",
    } as React.CSSProperties;
  }, [palette]);

  useEffect(() => {
    if (!HEX_TILE_MOVABLE) return;
    const img = new Image();
    img.src = toPublicUrl(HEX_TILE_MOVABLE);
  }, [HEX_TILE_MOVABLE]);

  useEffect(() => {
    void preloadSoundEffects(["playerMove", "portalLand", "goalLand", "failedMove"]);
    if (cloudMode === "full_cloud") {
      void preloadThunderSound();
    }
  }, [cloudMode]);

  useEffect(() => {
    if (!BACKGROUND_MUSIC) return;
    void startBackgroundMusic(BACKGROUND_MUSIC);
    return () => {
      void stopBackgroundMusic();
    };
  }, [BACKGROUND_MUSIC]);

  function diceImg(n: number) {
    return toPublicUrl(DICE_FACES_BASE + "/D20_" + n + ".png");
  }

  function villainImg(key: VillainKey) {
    return toPublicUrl(VILLAINS_BASE + "/" + key + ".png");
  }

  function DiceCorners() {
    return (
      <>
        <span className="diceCorner tl" />
        <span className="diceCorner tr" />
        <span className="diceCorner bl" />
        <span className="diceCorner br" />
      </>
    );
  }

  /* =========================
     Sprite
  ========================= */

  type Facing = "down" | "up" | "left" | "right";

  const [playerFacing, setPlayerFacing] = useState<Facing>("down");
  const [isWalking, setIsWalking] = useState(false);

  const SPRITE_COLS = playerSpriteSheet?.cols ?? 4;
  const SPRITE_ROWS = playerSpriteSheet?.rows ?? 5;

  const FRAME_W = playerSpriteSheet?.frameWidth ?? 128;
  const FRAME_H = playerSpriteSheet?.frameHeight ?? 128;

  function spriteSheetUrl() {
    return toPublicUrl(
      playerSpriteSheet?.path ?? "images/players/sprite_sheet_20.png"
    );
  }

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const [walkFrame, setWalkFrame] = useState(0);

  const WALK_FPS = 10;
  const IDLE_FPS = 4;

  useEffect(() => {
    const fps = isWalking ? WALK_FPS : IDLE_FPS;
    const frameDuration = 1000 / fps;

    lastRef.current = performance.now();

    const tick = (t: number) => {
      if (t - lastRef.current >= frameDuration) {
        setWalkFrame((f) => (f + 1) % SPRITE_COLS);
        lastRef.current = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isWalking]);

  const walkTimer = useRef<number | null>(null);
  const boardInputLockedRef = useRef(false);
  const [failedSlotFeedback, setFailedSlotFeedback] = useState<{
    layer: number;
    row: number;
    col: number;
    kind: MoveAttemptResult;
  } | null>(null);
  useEffect(() => {
    return () => {
      if (walkTimer.current) window.clearTimeout(walkTimer.current);
    };
  }, []);

  function facingRow(f: Facing) {
    return f === "down" ? 0 : f === "left" ? 1 : f === "right" ? 2 : 3;
  }

  /* =========================
     Dice
  ========================= */
  const BASE_DICE_VIEW = { x: -28, y: -36 };
  const [diceValue, setDiceValue] = useState<number>(2);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>(BASE_DICE_VIEW);
  const diceTimer = useRef<number | null>(null);

  const lastRollValueRef = useRef<number>(2);

  useEffect(() => {
    return () => {
      if (diceTimer.current) window.clearTimeout(diceTimer.current);
    };
  }, []);

  function rotForRoll(n: number) {
    switch (n) {
      case 1:
        return { x: -90, y: 0 };
      case 2:
        return { x: 0, y: 0 };
      case 3:
        return { x: 0, y: -90 };
      case 4:
        return { x: 0, y: 90 };
      case 5:
        return { x: 0, y: 180 };
      case 6:
        return { x: 90, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }

  const rollDice = useCallback(() => {
    if (diceRolling) return;

    setDiceRolling(true);

    const start = performance.now();
    const duration = 650;

    const tick = () => {
      const elapsed = performance.now() - start;

      const flicker = 1 + Math.floor(Math.random() * 6);
      setDiceValue(flicker);
      setDiceRot(rotForRoll(flicker));

      if (elapsed < duration) {
        diceTimer.current = window.setTimeout(tick, 55);
      } else {
        const final = 1 + Math.floor(Math.random() * 6);

        lastRollValueRef.current = final;
        setDiceValue(final);
        setDiceRot(rotForRoll(final));

        setDiceRolling(false);
      }
    };

    tick();
  }, [diceRolling]);

  /* =========================
     Reveal helpers
  ========================= */

  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        revealHex(st, "L" + layer + "-R" + r + "-C" + c);
      }
    }
  }, []);

  const revealRing = useCallback((st: GameState, centerId: string) => {
    revealHex(st, centerId);

    let nbs: string[] = [];
    try {
      nbs = (neighborIdsSameLayer as any)(st, centerId) as string[];
    } catch {
      try {
        nbs = (neighborIdsSameLayer as any)(centerId) as string[];
      } catch {
        nbs = [];
      }
    }
    for (const nbId of nbs) revealHex(st, nbId);
  }, []);

  /* =========================
     Items
  ========================= */

  type ItemId = "reroll" | "revealRing" | "peek";
  type Item = { id: ItemId; name: string; icon: string; charges: number };

  const [items, setItems] = useState<Item[]>([
    { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
    { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
    { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
  ]);

  const useItem = useCallback(
    (id: ItemId) => {
      const it = items.find((x) => x.id === id);
      if (!it || it.charges <= 0) return;

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, charges: Math.max(0, x.charges - 1) } : x))
      );

      if (id === "reroll") {
        rollDice();
        pushLog("Reroll used — rolling…", "info");
        return;
      }

      if (!state) return;
      const pid = (state as any).playerHexId ?? null;
      if (!pid) return;

      if (id === "revealRing") {
        revealRing(state, pid);
        forceRender((n) => n + 1);
        pushLog("Used: Reveal (ring)", "ok");
        return;
      }

      if (id === "peek") {
        const up = Math.min(scenarioLayerCount, currentLayer + 1);
        const dn = Math.max(1, currentLayer - 1);

        const upId = pid.replace(/^L\d+-/, "L" + up + "-");
        const dnId = pid.replace(/^L\d+-/, "L" + dn + "-");

        revealRing(state, upId);
        revealRing(state, dnId);

        forceRender((n) => n + 1);
        pushLog("Used: Peek (above/below ring)", "info");
        return;
      }
    },
    [items, rollDice, pushLog, state, revealRing, scenarioLayerCount, currentLayer]
  );

  /* =========================
     Encounter resolution
  ========================= */

  const prevRollingRef = useRef(false);

  useEffect(() => {
    const wasRolling = prevRollingRef.current;
    prevRollingRef.current = diceRolling;

    if (!encounter) return;
    if (diceRolling) return;
    if (!wasRolling) return;

    try {
      setEncounter((e) => (e ? { ...e, tries: e.tries + 1 } : e));

      const rolled = lastRollValueRef.current;
      if (rolled !== 6) return;

      const targetId = pendingEncounterMoveIdRef.current;

      if (!targetId) {
        pushLog("Encounter cleared — risk event passed.", "ok");
        setEncounter(null);
        return;
      }

      if (!state) {
        pushLog("Encounter error: game state missing.", "bad");
        return;
      }

      const pendingHex = getHexFromState(state, targetId) as any;
      if (!pendingHex || pendingHex.missing || pendingHex.blocked) {
        pushLog("Encounter target is invalid now — click another tile.", "bad");
        pendingEncounterMoveIdRef.current = null;
        return;
      }

      const pidBefore = state.playerHexId;

      const res: MoveResult = tryMove(state, targetId);
      ensureScenario(res.state);

      if (!res.ok) {
        setState(res.state);
        forceRender((n) => n + 1);
        const msg =
          res.reason === "BLOCKED"
            ? "Move failed after rolling a 6 — blocked tile wasted the turn."
            : "Move failed after rolling a 6 — click another tile and roll again.";
        pushLog(msg, "bad");
        pendingEncounterMoveIdRef.current = null;
        return;
      }

      const nextState = res.state;
      const pidAfter = nextState.playerHexId;
      const landedId = pidAfter;

      pendingEncounterMoveIdRef.current = null;
      setEncounter(null);

      const moved = !!pidBefore && pidAfter !== pidBefore;
      if (moved) {
        playMoveOutcomeSound(res, landedId, moved);
        setIsWalking(true);
        if (walkTimer.current) window.clearTimeout(walkTimer.current);
        walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);
        setPlayerFacing(facingFromMove(state, pidBefore, pidAfter));
      }

      const newMoveCount = movesTaken + 1;
      setMovesTaken(newMoveCount);

      const c2 = idToCoord(pidAfter);
      const nextLayerEnc = c2?.layer ?? currentLayer;

      setState(nextState);
      forceRender((n) => n + 1);

      if (Number.isFinite(nextLayerEnc)) {
        enterLayer(nextState, nextLayerEnc);

        if (nextLayerEnc !== currentLayer) {
          setCurrentLayer(nextLayerEnc);
          revealWholeLayer(nextState, nextLayerEnc);
        }
      }

      setOptimalFromNow(computeOptimalMoves(nextState));

      pushLog("Encounter cleared — moved to " + pidAfter, "ok");
      if (goalId && pidAfter === goalId) recordWin(newMoveCount);
    } catch (err: any) {
      console.error("Encounter resolution crashed:", err);
      pushLog("Encounter crashed: " + String(err?.message ?? err), "bad");
    }
  }, [
    encounter,
    diceRolling,
    state,
    movesTaken,
    diceValue,
    currentLayer,
    goalId,
    revealWholeLayer,
    computeOptimalMoves,
    recordWin,
    playMoveOutcomeSound,
    pushLog,
  ]);

  /* =========================
     Card triggers + overlays
  ========================= */

  const [cardTriggers, setCardTriggers] = useState<CardTrigger[]>([]);
  const [cardFlip, setCardFlip] = useState<
    null | {
      key: number;
      card: CardKey;
      durMs: number;
      villainKey?: VillainKey;
      mode?: "flash" | "riskEncounter";
    }
  >(null);

  const cardFlipTimerRef = useRef<number | null>(null);

  const triggerCardFlip = useCallback(
    (card: CardKey, opts?: { durMs?: number; villainKey?: VillainKey; mode?: "flash" | "riskEncounter" }) => {
      if (cardFlipTimerRef.current) window.clearTimeout(cardFlipTimerRef.current);

      const key = Date.now();
      const durMs = opts?.durMs ?? 1400;
      const mode = opts?.mode ?? "flash";

      setCardFlip({ key, card, durMs, villainKey: opts?.villainKey, mode });

      if (mode !== "riskEncounter") {
        cardFlipTimerRef.current = window.setTimeout(() => {
          setCardFlip(null);
          cardFlipTimerRef.current = null;
        }, durMs);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (cardFlipTimerRef.current) window.clearTimeout(cardFlipTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!encounter) {
      setCardFlip((cf) => (cf?.mode === "riskEncounter" ? null : cf));
    }
  }, [encounter]);

  const findCardTriggerAt = useCallback(
    (id: string): CardKey | null => {
      const c = idToCoord(id);
      if (!c) return null;
      for (const t of cardTriggers) {
        if (t.layer === c.layer && t.row === c.row && t.col === c.col) return t.card;
      }
      return null;
    },
    [cardTriggers]
  );

  type FlyCard = {
    key: number;
    card: CardKey;
    from: { x: number; y: number; w: number; h: number; borderRadius: string };
  };

  const [flyCard, setFlyCard] = useState<FlyCard | null>(null);
  const flyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flyTimerRef.current) window.clearTimeout(flyTimerRef.current);
    };
  }, []);

  const triggerCardFlyout = useCallback(
    (card: CardKey, opts?: { then?: "flip" | "encounter" }) => {
      const then = opts?.then ?? "flip";

      const afterFly = () => {
        if (then === "encounter") {
          const vkr = pickRiskVillain();
          pendingEncounterMoveIdRef.current = null;
          setEncounter({ villainKey: vkr, tries: 0 });
          setDiceRot(BASE_DICE_VIEW);
          triggerCardFlip("risk", { villainKey: vkr, mode: "riskEncounter" });
          pushLog("Risk triggered — encounter: " + vkr + " (roll a 6)", "bad");
          return;
        }
        triggerCardFlip(card);
      };

      const el =
        deckRefs.current[card] ??
        (typeof document !== "undefined"
          ? (document.querySelector(".mobileDeckRow .mobileDeckCard." + card) as HTMLDivElement | null)
          : null);
      if (!el) {
        afterFly();
        return;
      }

      const r = el.getBoundingClientRect();
      const borderRadius = window.getComputedStyle(el).borderRadius || "10px";

      const key = Date.now();
      setFlyCard({
        key,
        card,
        from: { x: r.left, y: r.top, w: r.width, h: r.height, borderRadius },
      });

      flyTimerRef.current = window.setTimeout(afterFly, 520);

      window.setTimeout(() => {
        setFlyCard(null);
      }, 1200);
    },
    [triggerCardFlip, pushLog]
  );

  const clearEncounter = useCallback(() => {
    pendingEncounterMoveIdRef.current = null;
    setEncounter(null);
    setCardFlip(null);
    if (cardFlipTimerRef.current) {
      window.clearTimeout(cardFlipTimerRef.current);
      cardFlipTimerRef.current = null;
    }
  }, []);

  /* =========================
     Start scenario
  ========================= */

  const startScenario = useCallback(async () => {
    if (!scenarioEntry) return;

    const tracks = scenarioEntry.tracks ?? [];
    const hasTracks = tracks.length > 1;

    const chosenJson = hasTracks ? trackEntry?.scenarioJson ?? scenarioEntry.scenarioJson : scenarioEntry.scenarioJson;

    setGoalAchieved(null);

    const cacheKey = "20260801e";
    const url = chosenJson + (chosenJson.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(cacheKey);
    const authored = await fetchJson<ScenarioDocument>(url);

    const trackKey = trackEntry?.id ?? trackId ?? scenarioEntry.id;
    const startOpts = startScenarioOptionsRef.current;
    const intent = startOpts.intent ?? "fresh";
    startScenarioOptionsRef.current = {};

    const forced = typeof window !== "undefined" ? parseForcedLayerTransforms(window.location.search) : null;
    const stored = loadTrackVariationState(trackKey);

    const variationParam =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("variation") : null;

    const runOptions = resolveTrackRunOptions({
      trackId: trackKey,
      intent,
      stored,
      forcedSelection: forced,
      variationParam,
      devMode: isDevMode(),
    });

    let s: import("../../engine/types").Scenario;
    let selection: TrackTransformSelection;
    try {
      ({ scenario: s, selection } = buildRuntimeScenario(authored, runOptions));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Layer transform failed", err);
      ({ scenario: s, selection } = buildRuntimeScenario(authored, {
        trackId: trackKey,
        mode: "fixed",
      }));
      pushLog("Board layout could not be applied — using standard layout.", "bad");
    }

    saveTrackVariationState({ trackId: trackKey, runSeed: selection.seed, selection });

    const runtimeDoc = s as ScenarioDocument;
    const cts = parseCardTriggersFromScenario(runtimeDoc);
    setCardTriggers(cts);
    pushLog("Card triggers loaded: " + cts.length, "info");

    const vts = parseVillainsFromScenario(runtimeDoc);
    setVillainTriggers(vts);
    pushLog("Villain triggers loaded: " + vts.length, "info");

    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.info(formatLayerTransformDebug(trackKey, selection));
      pushLog(formatLayerTransformDebug(trackKey, selection), "info");
    }

    setEncounter(null);
    pendingEncounterMoveIdRef.current = null;
    boardInputLockedRef.current = false;
    setFailedSlotFeedback(null);

    scenarioRef.current = s;

    const st: any = newGame(s);
    st.scenario = s;
    ensureScenario(st);

    const layerCount = Math.max(1, Number(s?.layers ?? 1));
    setScenarioLayerCount(layerCount);

    let pid = (st as any).playerHexId as string | null;
    let layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;
    layer = Math.max(1, Math.min(layerCount, layer));

    if (!pid || !/^L\d+-R\d+-C\d+$/.test(pid)) {
      pid = findFirstPlayableHexId(st, layer);
      (st as any).playerHexId = pid;
    }

    const pidCoord = pid ? idToCoord(pid) : null;
    if (pidCoord) layer = Math.max(1, Math.min(layerCount, pidCoord.layer));

    const gid = findGoalId(s, layer);
    setGoalId(gid);

    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    setState(st);
    setSelectedId(pid);
    setStartHexId(pid);
    setCurrentLayer(layer);
    setPlayerFacing("down");

    setMovesTaken(0);

    const startOptimal = computeOptimalMoves(st);
    setOptimalAtStart(startOptimal);
    setOptimalFromNow(startOptimal);
    setBestScore(getBestScore(scenarioEntry.id, trackEntry?.id ?? trackId));

    logNRef.current = 0;
    setLog([]);
    pushLog("Started: " + scenarioEntry.name, "ok");
    if (pid) pushLog("Start: " + pid, "info");
    if (gid) pushLog("Goal: " + gid, "info");

    setItems([
      { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
      { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
      { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
    ]);

    window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 0);
  }, [scenarioEntry, trackEntry, trackId, revealWholeLayer, computeOptimalMoves, pushLog]);

  useEffect(() => {
    startScenario();
  }, [startScenario]);

  const handleGoalReplay = useCallback(() => {
    setGoalAchieved(null);
    startScenarioOptionsRef.current = { intent: "replayAfterWin" };
    void startScenario();
  }, [startScenario]);

  const handleGoalNext = useCallback(() => {
    if (!nextTrack) return;
    setGoalAchieved(null);
    onPlayNextTrack(nextTrack.id);
  }, [nextTrack, onPlayNextTrack]);

  /* =========================
     Movement
  ========================= */

  const releaseBoardInput = useCallback((delayMs: number) => {
    window.setTimeout(() => {
      boardInputLockedRef.current = false;
      setFailedSlotFeedback(null);
    }, delayMs);
  }, []);

  const attemptMoveAtSlot = useCallback(
    (row: number, col: number) => {
      if (!state) return;
      if (boardInputLockedRef.current || encounterActive || goalAchievedActive) return;

      const hexId = hexIdAtSlot(state, currentLayer, row, col);
      if (!hexId) return;

      const vk = findTriggerForHex(hexId);
      if (vk) {
        pendingEncounterMoveIdRef.current = hexId;
        setEncounter((prev) => (prev ? { ...prev, villainKey: vk } : { villainKey: vk, tries: 0 }));
        pushLog("Encounter: " + vk + " — roll a 6 to continue", "bad");
        return;
      }

      boardInputLockedRef.current = true;
      const pidBefore = state.playerHexId;
      const outcome = attemptMoveToSlot(state, { layer: currentLayer, row, col });

      if (outcome.result === "IGNORED") {
        boardInputLockedRef.current = false;
        return;
      }

      ensureScenario(state);
      const newMoveCount = movesTaken + 1;
      setMovesTaken(newMoveCount);
      setOptimalFromNow(computeOptimalMoves(state));

      if (outcome.result === "MOVED") {
        const landedId = state.playerHexId;
        const moved = landedId !== pidBefore;
        const fromLayer = (pidBefore ? idToCoord(pidBefore)?.layer : currentLayer) ?? currentLayer;
        const landedCoord = idToCoord(landedId);
        const finalLayer = landedCoord?.layer ?? fromLayer;

        if (moved) {
          playMoveOutcomeSound(
            { ok: true, state, triggeredTransition: outcome.triggeredTransition ?? false, won: outcome.won ?? false },
            landedId,
            moved
          );
          setIsWalking(true);
          if (walkTimer.current) window.clearTimeout(walkTimer.current);
          walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);
          setPlayerFacing(facingFromMove(state, pidBefore, landedId));
        }

        setState(state);
        setSelectedId(landedId);
        forceRender((n) => n + 1);

        enterLayer(state, finalLayer);
        if (finalLayer !== currentLayer) {
          setCurrentLayer(finalLayer);
          revealWholeLayer(state, finalLayer);
        }

        const landedCard = findCardTriggerAt(landedId);
        if (landedCard) {
          triggerCardFlyout(landedCard, landedCard === "risk" ? { then: "encounter" } : undefined);
          pushLog("Card triggered: " + landedCard, landedCard === "risk" ? "bad" : "info");
        }

        pushLog("Moved to " + landedId, "ok");
        if (goalId && landedId === goalId) recordWin(newMoveCount);
        releaseBoardInput(420);
        return;
      }

      playFailedMoveSound();
      setFailedSlotFeedback({ layer: currentLayer, row, col, kind: outcome.result });
      if (pidBefore) {
        setPlayerFacing(facingFromMove(state, pidBefore, hexId));
      }
      const logMsg =
        outcome.result === "MISSING"
          ? "Missing space — lost turn."
          : outcome.result === "BLOCKED"
            ? "Blocked tile — lost turn."
            : "Unreachable — lost turn.";
      pushLog(logMsg, "bad");
      setState(state);
      setSelectedId(null);
      forceRender((n) => n + 1);
      releaseBoardInput(reducedMotion ? 280 : 450);
    },
    [
      state,
      encounterActive,
      goalAchievedActive,
      currentLayer,
      goalId,
      movesTaken,
      pushLog,
      revealWholeLayer,
      computeOptimalMoves,
      recordWin,
      findTriggerForHex,
      findCardTriggerAt,
      triggerCardFlyout,
      playMoveOutcomeSound,
      releaseBoardInput,
      reducedMotion,
    ]
  );

  const handleSlotPointerUp = useCallback(
    (e: React.PointerEvent, row: number, col: number) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      attemptMoveAtSlot(row, col);
    },
    [attemptMoveAtSlot]
  );
  return (
    <div
      className={["appRoot", "game", isCloudScenario ? "cloudScenarioActive" : "", citadelFrame ? "citadelFrame" : ""]
        .filter(Boolean)
        .join(" ")}
      style={themeVars}
    >
      <div
        className="gameBg"
        style={{
          backgroundImage: GAME__URL ? "url(" + toPublicUrl(GAME__URL) + ")" : undefined,
        }}
      />
      {isCloudScenario && cloudMode ? (
        <div className={cloudAtmosphereClass(cloudMode, "scene")} aria-hidden="true" />
      ) : null}

      <div className="topbar">
        <div className="items">
          {items.map((it) => (
            <button
              key={it.id}
              className={"itemBtn " + (it.charges <= 0 ? "off" : "")}
              disabled={it.charges <= 0 || !state || goalAchievedActive || (encounterActive && it.id !== "reroll")}
              onClick={() => useItem(it.id)}
              title={it.name + " (" + it.charges + ")"}
            >
              <span className="itemIcon">{it.icon}</span>
              <span className="itemName">{it.name}</span>
              <span className="itemCharges">{it.charges}</span>
            </button>
          ))}
        </div>

        <button className="btn" disabled={!state} onClick={() => setShowGhost((v) => !v)}>
          {showGhost ? "Hide Ghost" : "Show Ghost"}
        </button>

        <button
          className="btn"
          disabled={!state || !canGoDown || encounterActive || goalAchievedActive}
          onClick={() => {
            if (!state) return;
            const next = Math.max(1, currentLayer - 1);

            const st2: any = ensureScenario(state);
            setCurrentLayer(next);
            enterLayer(st2, next);
            revealWholeLayer(st2, next);

            forceRender((n) => n + 1);
            pushLog("Layer " + next, "info");
          }}
        >
          − Layer
        </button>

        <button
          className="btn"
          disabled={!state || !canGoUp || encounterActive || goalAchievedActive}
          onClick={() => {
            if (!state) return;
            const next = Math.min(scenarioLayerCount, currentLayer + 1);

            const st2: any = ensureScenario(state);
            setCurrentLayer(next);
            enterLayer(st2, next);
            revealWholeLayer(st2, next);

            forceRender((n) => n + 1);
            pushLog("Layer " + next, "info");
          }}
        >
          + Layer
        </button>

        <div className="spacer" />

        <button className="btn" onClick={onExit}>
          Reset
        </button>
      </div>

      <div className="gameLayout">
        <div className="playColumn">
          <div
            className="boardWrap"
            ref={boardWrapRef}
            data-layer-depth={citadelFrame ? currentLayer : undefined}
          >
            {citadelFrame ? (
              <div className="citadelTunnelDecor" aria-hidden="true">
                <div className="citadelTunnelLight" />
                <div className="citadelTunnelDepth" />
                <div className="citadelTunnelWall citadelTunnelWall--left" />
                <div className="citadelTunnelWall citadelTunnelWall--right" />
              </div>
            ) : null}
            {isCloudScenario && cloudMode ? (
              <div className={cloudAtmosphereClass(cloudMode, "board")} aria-hidden="true" />
            ) : null}
            {cloudMode === "full_cloud" ? (
              <StormWeather scenarioId={scenarioEntry.id} reducedMotion={reducedMotion} />
            ) : null}
            <SideBar side="top" currentLayer={currentLayer} />
            <SideBar side="left" currentLayer={currentLayer} />

            <div
              key={currentLayer}
              className="boardLayerBg"
              style={{
                backgroundImage: BOARD_LAYER_ ? "url(" + toPublicUrl(BOARD_LAYER_) + ")" : undefined,
              }}
            />

            <div className="boardScroll" ref={scrollRef}>
            <div className="board" ref={boardRef}>
              <div className="hexGrid">
                {showGhost ? <GhostGrid layer={currentLayer} /> : null}

                {/* REAL HEX BOARD */}
                {rows.map((r) => {
                  const cols = ROW_LENS[r] ?? 0;

                  return (
                    <div key={"row-" + r} className="hexRow">
                      {Array.from({ length: cols }, (_, c) => {
                        const id = state ? hexIdAtSlot(state, currentLayer, r, c) : null;
                        const cellStyle = hexGridPlacement(r, c);

                        if (!id) {
                          return <div key={"empty-" + r + "-" + c} className="hexSlot empty" style={cellStyle} />;
                        }

                        const tr = portalTransitionAt(state as any, id);

                        const isPortalUp = tr?.type === "UP";
                        const isPortalDown = tr?.type === "DOWN";

                        const portalTargetLayer = tr?.to?.layer ?? null;
                        const portalColor = portalTargetLayer ? layerCssVar(portalTargetLayer) : null;

                        const hex = getHexFromState(state, id) as any;
                        const bm = isBlockedOrMissing(hex);
                        const failedHere =
                          failedSlotFeedback &&
                          failedSlotFeedback.layer === currentLayer &&
                          failedSlotFeedback.row === r &&
                          failedSlotFeedback.col === c;
                        const failedClass = failedHere
                          ? reducedMotion
                            ? "failedMoveStatic"
                            : "failedMovePulse"
                          : "";

                        if (bm.missing) {
                          const missingCv = cloudVisibilityMap?.get(id);
                          const missingCloudActive = isCloudScenario && missingCv;
                          const missingCloudVis = missingCv?.visibility;
                          const showMissingCloudCover =
                            missingCloudActive &&
                            (missingCloudVis === "partial" || missingCloudVis === "cloud");
                          const missingCloudDensity = missingCloudVis === "partial" ? "partial" : "full";

                          return (
                            <div
                              key={id}
                              className={["hexSlot", "missingSlotWrap", isCloudScenario ? "cloudScenario" : ""]
                                .filter(Boolean)
                                .join(" ")}
                              style={cellStyle}
                            >
                              <button
                                type="button"
                                className={["hex", "missingSlot", failedClass].filter(Boolean).join(" ")}
                                onPointerUp={(e) => handleSlotPointerUp(e, r, c)}
                                disabled={!state || encounterActive || goalAchievedActive}
                                aria-label="Missing hex. Selecting this space consumes a move."
                                title="Missing hex"
                              />
                              {showMissingCloudCover ? (
                                <CloudCover
                                  scenarioId={scenarioEntry.id}
                                  layerId={"L" + currentLayer}
                                  hexId={id}
                                  density={missingCloudDensity}
                                  reducedMotion={reducedMotion}
                                  transitioning={cloudTransitions[id] ?? null}
                                />
                              ) : null}
                            </div>
                          );
                        }

                        const isSel = selectedId === id;
                        const isPlayer = playerId === id;
                        const isStart = startHexId === id;
                        const showStartPortal = isStart && movesTaken === 0;

                        const cardHere = findCardTriggerAt(id);
                        const isReach = playerLayer === currentLayer && !isPlayer && reachable.has(id);
                        const isReachPulse = isReach && reachPulseId === id;
                        const isReachPulseCard = isReachPulse && !!cardHere;
                        const isGoal = goalId === id;
                        const isTrigger = !!findTriggerForHex(id);

                        const cv = cloudVisibilityMap?.get(id);
                        const cloudActive = isCloudScenario && cv;
                        const cloudVis = cv?.visibility;
                        const showCloudCover =
                          cloudActive && (cloudVis === "partial" || cloudVis === "cloud");
                        const cloudDensity = cloudVis === "partial" ? "partial" : "full";
                        const hideSpecialTileArt =
                          cloudActive &&
                          cloudVis !== "visible" &&
                          (isGoal || isPortalUp || isPortalDown || showStartPortal);
                        const showGoalOverlay = cloudActive && cv?.hasGoal && cloudVis !== "visible";
                        const useSolidGoldGoal = shouldUseSolidGoldGoal(
                          SOLID_GOLD_GOAL,
                          isGoal,
                          hideSpecialTileArt
                        );
                        const showPortalOverlay =
                          cloudActive &&
                          cloudVis !== "visible" &&
                          (isPortalUp || isPortalDown || showStartPortal);
                        const portalInInner =
                          (isPortalUp || isPortalDown || showStartPortal) && !showPortalOverlay;
                        const showMovePulseOverlay = shouldShowFullCloudMovePulse(isReachPulse, cloudMode);
                        const useReachPulse = shouldUseButtonReachPulse(isReachPulse, cloudMode);

                        const tileVisual = resolveTileVisualType({
                          revealed: !!hex?.revealed,
                          blocked: bm.blocked,
                          isGoal: hideSpecialTileArt ? false : isGoal,
                          isStart: hideSpecialTileArt ? false : showStartPortal,
                          isPortalUp: hideSpecialTileArt ? false : isPortalUp,
                          isPortalDown: hideSpecialTileArt ? false : isPortalDown,
                        });
                        // White movable image only during active reach-pulse flash; otherwise regular tile.
                        const tileArtUrl = selectHexTileArtUrl(
                          HEX_TILE ? toPublicUrl(HEX_TILE) : toPublicUrl(tileArtRelPath(tileVisual)),
                          HEX_TILE_MOVABLE ? toPublicUrl(HEX_TILE_MOVABLE) : undefined,
                          isReach,
                          isReachPulse
                        );
                        const hexInnerStyle = {
                          ["--tileArt" as any]: `url(${tileArtUrl})`,
                        } as React.CSSProperties;

                        const hexInnerContent = (
                          <>
                            <div className="hexCoords">
                              <div className="hexId">{r + "," + c}</div>
                            </div>
                            {portalInInner && (isPortalUp || isPortalDown) ? (
                              <div className="portalFx">
                                <div className="pAura" />
                                <div className="pOrbs" />
                                <div className="pRim" />
                                <div className="pOval" />
                              </div>
                            ) : null}
                            {portalInInner && showStartPortal ? (
                              <div className="portalFx">
                                <div className="pAura" />
                                <div className="pRunes" />
                                <div className="pVortex" />
                                <div className="pWell" />
                                <div className="pShine" />
                              </div>
                            ) : null}
                            <div className="hexMarks">
                              {portalInInner && isPortalUp ? <span className="mark">↑</span> : null}
                              {portalInInner && isPortalDown ? <span className="mark">↓</span> : null}
                              {!showGoalOverlay && isGoal ? <span className="mark g">G</span> : null}
                              {isTrigger ? <span className="mark t">!</span> : null}
                            </div>
                          </>
                        );

                        return (
                          <div
                            key={"v-" + r + "-" + c}
                            className={["hexSlot", isCloudScenario ? "cloudScenario" : ""].filter(Boolean).join(" ")}
                            style={cellStyle}
                          >
                            <button
                              ref={isPlayer ? playerBtnRef : undefined}
                              className={[
                                "hex",
                                isSel ? "sel" : "",
                                useReachPulse ? "reachPulse" : "",
                                useReachPulse && isReachPulseCard ? "reachPulseCard" : "",
                                bm.blocked ? "blocked" : "",
                                failedClass,
                                isPlayer ? "player" : "",
                                isGoal ? "goal" : "",
                                useSolidGoldGoal ? "solidGoldGoal" : "",
                                isTrigger ? "trigger" : "",
                                showStartPortal ? "portalStart" : "",
                                isPortalUp ? "portalUp" : "",
                                isPortalDown ? "portalDown" : "",
                              ].join(" ")}
                              onPointerUp={(e) => handleSlotPointerUp(e, r, c)}
                              disabled={!state || encounterActive || goalAchievedActive}
                              style={
                                {
                                  ["--hexGlow" as any]: useReachPulse
                                    ? reachPulseGlow(currentLayer, cardHere)
                                    : layerCssVar(currentLayer),
                                  ...(portalColor ? { ["--portalC" as any]: portalColor } : {}),
                                } as any
                              }
                              title={id}
                            >
                              <div className="hexAnchor">
                                {isCloudScenario ? (
                                  <div className="hexTerrainClip">
                                    <div className="hexInner" style={hexInnerStyle}>{hexInnerContent}</div>
                                  </div>
                                ) : (
                                  <div className="hexInner" style={hexInnerStyle}>{hexInnerContent}</div>
                                )}
                              </div>
                            </button>

                            {isReach ? (
                              <ReachSparkle hexId={id} reducedMotion={reducedMotion} />
                            ) : null}

                            {cardHere ? (
                              <div className={["cardLayer", isCloudScenario ? "cardLayerUnderCloud" : ""].filter(Boolean).join(" ")}>
                                <div className={"cardBadge hexDeckCard " + cardHere} title={cardHere}>
                                  <div className="deckFx" />
                                </div>
                              </div>
                            ) : null}

                            {showCloudCover ? (
                              <CloudCover
                                scenarioId={scenarioEntry.id}
                                layerId={"L" + currentLayer}
                                hexId={id}
                                density={cloudDensity}
                                reducedMotion={reducedMotion}
                                transitioning={cloudTransitions[id] ?? null}
                              />
                            ) : null}

                            {showMovePulseOverlay ? (
                              <div className="hexOverlayAnchor movePulseAnchor">
                                <MoveOverlay
                                  glowVar={reachPulseGlow(currentLayer, cardHere)}
                                  pulse={!reducedMotion}
                                  cardPulse={isReachPulseCard}
                                />
                              </div>
                            ) : null}

                            {showGoalOverlay ? (
                              <div className="hexOverlayAnchor goalOverlayAnchor">
                                <div className="cloudGoalOverlay">
                                  <span className="mark g">G</span>
                                </div>
                              </div>
                            ) : null}

                            {showPortalOverlay ? (
                              <div className="hexOverlayAnchor portalOverlayAnchor">
                                <div className="cloudPortalLayer">
                                  {isPortalUp || isPortalDown ? (
                                    <div className="portalFx">
                                      <div className="pAura" />
                                      <div className="pOrbs" />
                                      <div className="pRim" />
                                      <div className="pOval" />
                                    </div>
                                  ) : null}
                                  {showStartPortal ? (
                                    <div className="portalFx">
                                      <div className="pAura" />
                                      <div className="pRunes" />
                                      <div className="pVortex" />
                                      <div className="pWell" />
                                      <div className="pShine" />
                                    </div>
                                  ) : null}
                                  <div className="hexMarks">
                                    {isPortalUp ? <span className="mark">↑</span> : null}
                                    {isPortalDown ? <span className="mark">↓</span> : null}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {isPlayer ? (
                              <PlayerToken
                                variant="board"
                                customSprite={customSprite}
                                isWalking={isWalking}
                                walkFrame={walkFrame}
                                playerFacing={playerFacing}
                                spriteSheetUrl={spriteSheetUrl()}
                                frameW={FRAME_W}
                                frameH={FRAME_H}
                                cols={SPRITE_COLS}
                                rows={SPRITE_ROWS}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>

          <HexDeckCardsRow glowVar={layerCssVar(currentLayer)} />

          {/* SIDE PANEL */}
          <div className="side">
            <div className="panelMini statusPanel">
              <div className="miniTitle">Status</div>
              <div className="statusGrid">
                <div className="miniRow">
                  <span className="k">Layer</span>
                  <span className="v">
                    {currentLayer}/{scenarioLayerCount}
                  </span>
                </div>
                <div className="miniRow">
                  <span className="k">Moves</span>
                  <span className="v">{movesTaken}</span>
                </div>
                <div className="miniRow">
                  <span className="k">Optimal (start)</span>
                  <span className="v">{optimalAtStart ?? "-"}</span>
                </div>
                <div className="miniRow">
                  <span className="k">Optimal (now)</span>
                  <span className="v">{optimalFromNow ?? "-"}</span>
                </div>
                <div className="miniRow">
                  <span className="k">Best</span>
                  <span className="v">{bestScore ?? "-"}</span>
                </div>
              </div>
            </div>

            <div className="panelMini logPanel">
              <div className="miniTitle">Log</div>
              <div className="log">
                {log.map((e) => (
                  <div key={e.n} className={"logRow " + (e.kind ?? "")}>
                    <div className="lt">{e.t}</div>
                    <div className="lm">{e.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fly-out card overlay */}
      {flyCard ? (
        <div className="flyCardOverlay" aria-hidden="true">
          <div
            key={flyCard.key}
            className={"flyCard hexDeckCard " + flyCard.card}
            style={
              {
                ["--fromX" as any]: flyCard.from.x + "px",
                ["--fromY" as any]: flyCard.from.y + "px",
                ["--fromW" as any]: flyCard.from.w + "px",
                ["--fromH" as any]: flyCard.from.h + "px",
                ["--fromRadius" as any]: flyCard.from.borderRadius,
              } as any
            }
          >
            <div className="flyFace flyFront">
              <div className="deckFx" />
            </div>
            <div className="flyFace flyBack">
              <div className="deckFx" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Card flip overlay */}
      {cardFlip && cardFlip.mode === "riskEncounter" && encounter ? (
        <div
          key={cardFlip.key}
          className="cardFlipOverlay riskEncounter"
          role="dialog"
          aria-modal="true"
          style={
            {
              ["--flipDur" as any]: cardFlip.durMs + "ms",
              ["--diceBorderUrl" as any]: DICE_BORDER_IMG ? "url(" + toPublicUrl(DICE_BORDER_IMG) + ")" : "none",
            } as any
          }
        >
          <div className="riskEncounterStack">
            <div className="cardFlipCard risk riskReveal">
              <div className="cardFlipFace front">
                <div className="riskCardFx" />
              </div>
              <div className="cardFlipFace back">
                <img src={villainImg(encounter.villainKey)} alt={encounter.villainKey} />
              </div>
            </div>

            <div className="riskEncounterControls">
              <div className="encounterActionRow">
                <div className={"dice3d diceLg " + (diceRolling ? "rolling" : "")}>
                  <div className="cube" style={{ transform: "rotateX(" + diceRot.x + "deg) rotateY(" + diceRot.y + "deg)" }}>
                    <div className="face face-front" style={{ backgroundImage: "url(" + diceImg(diceValue) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-back" style={{ backgroundImage: "url(" + diceImg(5) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-right" style={{ backgroundImage: "url(" + diceImg(3) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-left" style={{ backgroundImage: "url(" + diceImg(4) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-top" style={{ backgroundImage: "url(" + diceImg(1) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-bottom" style={{ backgroundImage: "url(" + diceImg(6) + ")" }}>
                      <DiceCorners />
                    </div>
                  </div>
                </div>

                <div className="encounterInfo">
                  <div className="encounterTitle">ENCOUNTER!</div>
                  <div className="encounterSub">
                    Roll a <b>6</b> to continue
                    <span className="encounterTries">
                      Tries: <b>{encounter.tries}</b>
                    </span>
                  </div>

                  <div className="encounterButtons">
                    <button className="btn primary" disabled={diceRolling} onClick={rollDice}>
                      {diceRolling ? "Rolling…" : "Roll"}
                    </button>

                    <button
                      className="btn"
                      disabled={diceRolling}
                      onClick={() => {
                        clearEncounter();
                        pushLog("Encounter dismissed (debug)", "info");
                      }}
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="encounterRollPill">
                    Roll = <b>{diceValue}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : cardFlip ? (
        <div
          key={cardFlip.key}
          className="cardFlipOverlay"
          aria-hidden="true"
          style={
            {
              ["--flipDur" as any]: cardFlip.durMs + "ms",
            } as any
          }
        >
          <div className={"cardFlipCard " + cardFlip.card}>
            <div className="cardFlipLabel">{cardFlip.card}</div>
          </div>
        </div>
      ) : null}

      {/* Encounter overlay (villain hex triggers — not risk card Step B) */}
      {encounter && cardFlip?.mode !== "riskEncounter" ? (
        <div
          className="encounterScene"
          role="dialog"
          aria-modal="true"
          style={
            {
              ["--diceBorderUrl" as any]: DICE_BORDER_IMG ? "url(" + toPublicUrl(DICE_BORDER_IMG) + ")" : "none",
            } as any
          }
        >
          <div className="encounterGrid">
            <div className="encounterCard riskCard">
              <div className="riskCardFx" />
              <img className="riskVillainImg" src={villainImg(encounter.villainKey)} alt={encounter.villainKey} />
            </div>

            <div className="encounterRight">
              <div className="encounterActionRow">
                <div className={"dice3d diceLg " + (diceRolling ? "rolling" : "")}>
                  <div className="cube" style={{ transform: "rotateX(" + diceRot.x + "deg) rotateY(" + diceRot.y + "deg)" }}>
                    <div className="face face-front" style={{ backgroundImage: "url(" + diceImg(diceValue) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-back" style={{ backgroundImage: "url(" + diceImg(5) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-right" style={{ backgroundImage: "url(" + diceImg(3) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-left" style={{ backgroundImage: "url(" + diceImg(4) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-top" style={{ backgroundImage: "url(" + diceImg(1) + ")" }}>
                      <DiceCorners />
                    </div>
                    <div className="face face-bottom" style={{ backgroundImage: "url(" + diceImg(6) + ")" }}>
                      <DiceCorners />
                    </div>
                  </div>
                </div>

                <div className="encounterInfo">
                  <div className="encounterTitle">ENCOUNTER!</div>
                  <div className="encounterSub">
                    Roll a <b>6</b> to continue
                    <span className="encounterTries">
                      Tries: <b>{encounter.tries}</b>
                    </span>
                  </div>

                  <div className="encounterButtons">
                    <button className="btn primary" disabled={diceRolling} onClick={rollDice}>
                      {diceRolling ? "Rolling…" : "Roll"}
                    </button>

                    <button
                      className="btn"
                      disabled={diceRolling}
                      onClick={() => {
                        clearEncounter();
                        pushLog("Encounter dismissed (debug)", "info");
                      }}
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="encounterRollPill">
                    Roll = <b>{diceValue}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {goalAchieved ? (
        <div className="encounterScene goalScene" role="dialog" aria-modal="true" aria-labelledby="goalAchievedTitle">
          <div className="goalScenePanel">
            <div className="goalSceneBadge" aria-hidden="true">
              ★
            </div>
            <div className="encounterTitle" id="goalAchievedTitle">
              Goal Achieved
            </div>
            <div className="goalScoreGrid">
              <div className="goalScoreItem">
                <span className="goalScoreLabel">Least</span>
                <span className="goalScoreValue">{goalAchieved.least ?? "—"}</span>
              </div>
              <div className="goalScoreVs">vs</div>
              <div className="goalScoreItem">
                <span className="goalScoreLabel">Moves</span>
                <span className="goalScoreValue">{goalAchieved.moves}</span>
              </div>
            </div>
            {goalAchieved.best != null ? (
              <div className="goalBestNote">
                Your best: <b>{goalAchieved.best}</b>
              </div>
            ) : null}
            <div className="encounterButtons goalSceneButtons">
              <button type="button" className="btn" onClick={handleGoalReplay}>
                Replay
              </button>
              <button type="button" className="btn primary" disabled={!nextTrack} onClick={handleGoalNext}>
                Play next level
              </button>
              <button type="button" className="btn" onClick={onGoHome}>
                Home
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
