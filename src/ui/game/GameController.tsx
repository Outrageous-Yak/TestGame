// src/ui/game/GameController.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameState } from "../../engine/types";
import { newGame, getMinMovesToGoal, tryMove } from "../../engine/api";
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
import {
  scenarioRef,
  ensureScenario,
  idToCoord,
  toPublicUrl,
  loadScenario,
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

export type GameControllerProps = {
  scenarioEntry: ScenarioEntry;
  trackEntry: Track | null;
  trackId: string | null;
  onExit: () => void;
};

export function GameController({ scenarioEntry, trackEntry, trackId, onExit }: GameControllerProps) {
  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const pendingEncounterMoveIdRef = useRef<string | null>(null);
  const encounterActive = !!encounter;

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

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 980px)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
     Layer flash overlay
  ========================= */
  const [layerFx, setLayerFx] = useState<null | { key: number; layer: number }>(null);
  const layerFxTimerRef = useRef<number | null>(null);

  const triggerLayerFx = useCallback((layer: number) => {
    if (layerFxTimerRef.current) window.clearTimeout(layerFxTimerRef.current);

    const key = Date.now();
    setLayerFx({ key, layer });

    layerFxTimerRef.current = window.setTimeout(() => {
      setLayerFx(null);
      layerFxTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (layerFxTimerRef.current) window.clearTimeout(layerFxTimerRef.current);
    };
  }, []);

  const layerFxStyle = useMemo(() => {
    if (!layerFx) return {} as React.CSSProperties;
    return {
      ["--layerFxColor" as any]: layerCssVar(layerFx.layer),
    } as React.CSSProperties;
  }, [layerFx]);

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
                <div
                  className="miniSprite"
                  style={
                    {
                      ["--spriteImg" as any]: "url(" + spriteSheetUrl() + ")",
                      ["--frameW" as any]: FRAME_W,
                      ["--frameH" as any]: FRAME_H,
                      ["--cols" as any]: SPRITE_COLS,
                      ["--rows" as any]: SPRITE_ROWS,
                      ["--frameX" as any]: walkFrame,
                      ["--frameY" as any]: facingRow(playerFacing),
                    } as any
                  }
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

  function HexDeckCardsOverlay(props: { glowVar: string }) {
    const overlayStyle = {
      ["--cardGlow" as any]: props.glowVar,
    } as React.CSSProperties;

    return (
      <div className="hexDeckOverlay" style={overlayStyle}>
        <div className="hexDeckCol left">
          <div className="hexDeckCard cosmic" ref={(el) => (deckRefs.current.cosmic = el)}>
            <div className="deckFx" />
          </div>

          <div className="hexDeckCard risk" ref={(el) => (deckRefs.current.risk = el)}>
            <div className="deckFx" />
          </div>
        </div>

        <div className="hexDeckCol right">
          <div className="hexDeckCard terrain" ref={(el) => (deckRefs.current.terrain = el)}>
            <div className="deckFx" />
          </div>

          <div className="hexDeckCard shadow" ref={(el) => (deckRefs.current.shadow = el)}>
            <div className="deckFx" />
          </div>
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
      if (!scenarioEntry) {
        pushLog("Goal reached!", "ok");
        return;
      }
      const best = saveBestScore(scenarioEntry.id, moveCount, trackId);
      setBestScore(best);
      pushLog(`Goal reached in ${moveCount} moves! Best: ${best}`, "ok");
    },
    [scenarioEntry, trackId, pushLog]
  );

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
    }, 850);

    return () => window.clearInterval(timer);
  }, [reachableKey, reachableOrdered.length]);

  const reachPulseId = reachableOrdered[reachPulseIdx] ?? null;

  /* =========================
     Theme / assets
  ========================= */

  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME__URL = activeTheme?.assets.backgroundGame ?? "";

  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "images/dice";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "images/villains";
  const HEX_TILE = activeTheme?.assets.hexTile ?? "";

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

  const SPRITE_COLS = 4;
  const SPRITE_ROWS = 5;

  const FRAME_W = 128;
  const FRAME_H = 128;

  function spriteSheetUrl() {
    return toPublicUrl("images/players/sprite_sheet_20.png");
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

    const s = (await loadScenario(chosenJson)) as any;

    const cts = parseCardTriggersFromScenario(s);
    setCardTriggers(cts);
    pushLog("Card triggers loaded: " + cts.length, "info");

    const vts = parseVillainsFromScenario(s);
    setVillainTriggers(vts);
    pushLog("Villain triggers loaded: " + vts.length, "info");

    setEncounter(null);
    pendingEncounterMoveIdRef.current = null;

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

  /* =========================
     Movement
  ========================= */

  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;
      if (encounterActive) return;

      if (playerLayer && currentLayer !== playerLayer) {
        setCurrentLayer(playerLayer);
        enterLayer(state, playerLayer);
        revealWholeLayer(state, playerLayer);
        forceRender((n) => n + 1);
        pushLog(
          "You were viewing layer " + currentLayer + " but the player is on layer " + playerLayer + " — switched back.",
          "info"
        );
        return;
      }

      const hex = getHexFromState(state, id) as any;
      if (!hex || hex.missing) {
        pushLog("Missing tile.", "bad");
        return;
      }

      const pidBefore = state.playerHexId;

      const vk = findTriggerForHex(id);
      if (vk) {
        pendingEncounterMoveIdRef.current = id;
        setEncounter((prev) => (prev ? { ...prev, villainKey: vk } : { villainKey: vk, tries: 0 }));
        pushLog("Encounter: " + vk + " — roll a 6 to continue", "bad");
        return;
      }

      const res: MoveResult = tryMove(state, id);
      ensureScenario(res.state);

      if (!res.ok) {
        setState(res.state);
        forceRender((n) => n + 1);
        setOptimalFromNow(computeOptimalMoves(res.state));
        if (res.reason === "BLOCKED") pushLog("Blocked tile — lost turn.", "bad");
        else pushLog("Invalid move.", "bad");
        return;
      }

      const nextState = res.state;
      const pidAfter = nextState.playerHexId;
      const landedId = pidAfter;

      const fromLayer = (pidBefore ? idToCoord(pidBefore)?.layer : currentLayer) ?? currentLayer;
      const moved = pidAfter !== pidBefore;

      const newMoveCount = movesTaken + 1;
      setMovesTaken(newMoveCount);

      const landedCoord = idToCoord(landedId);
      const finalLayer = landedCoord?.layer ?? fromLayer;

      if (finalLayer && fromLayer && finalLayer !== fromLayer) {
        triggerLayerFx(finalLayer);
      }

      if (moved) {
        setIsWalking(true);
        if (walkTimer.current) window.clearTimeout(walkTimer.current);
        walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);
        setPlayerFacing(facingFromMove(state, pidBefore, pidAfter));
      }

      setState(nextState);
      setSelectedId(landedId);
      forceRender((n) => n + 1);

      enterLayer(nextState, finalLayer);

      if (finalLayer !== currentLayer) {
        setCurrentLayer(finalLayer);
        revealWholeLayer(nextState, finalLayer);
      }

      const landedCard = findCardTriggerAt(landedId);
      if (landedCard) {
        triggerCardFlyout(landedCard, landedCard === "risk" ? { then: "encounter" } : undefined);
        pushLog("Card triggered: " + landedCard, landedCard === "risk" ? "bad" : "info");
      }

      setOptimalFromNow(computeOptimalMoves(nextState));

      pushLog("Moved to " + landedId, "ok");
      if (goalId && landedId === goalId) recordWin(newMoveCount);
    },
    [
      state,
      encounterActive,
      currentLayer,
      playerLayer,
      goalId,
      movesTaken,
      pushLog,
      revealWholeLayer,
      computeOptimalMoves,
      recordWin,
      findTriggerForHex,
      triggerLayerFx,
      findCardTriggerAt,
      triggerCardFlyout,
    ]
  );
  return (
    <div className="appRoot game" style={themeVars}>
      <div
        className="gameBg"
        style={{
          backgroundImage: GAME__URL ? "url(" + toPublicUrl(GAME__URL) + ")" : undefined,
        }}
      />

      <div className="topbar">
        <div className="items">
          {items.map((it) => (
            <button
              key={it.id}
              className={"itemBtn " + (it.charges <= 0 ? "off" : "")}
              disabled={it.charges <= 0 || !state || (encounterActive && it.id !== "reroll") || layerFx !== null}
              onClick={() => useItem(it.id)}
              title={it.name + " (" + it.charges + ")"}
            >
              <span className="itemIcon">{it.icon}</span>
              <span className="itemName">{it.name}</span>
              <span className="itemCharges">{it.charges}</span>
            </button>
          ))}
        </div>

        <button className="btn" disabled={!state || layerFx !== null} onClick={() => setShowGhost((v) => !v)}>
          {showGhost ? "Hide Ghost" : "Show Ghost"}
        </button>

        <button
          className="btn"
          disabled={!state || !canGoDown || encounterActive || layerFx !== null}
          onClick={() => {
            if (!state) return;
            const next = Math.max(1, currentLayer - 1);

            const st2: any = ensureScenario(state);
            setCurrentLayer(next);
            enterLayer(st2, next);
            revealWholeLayer(st2, next);

            forceRender((n) => n + 1);
            pushLog("Layer " + next, "info");
            triggerLayerFx(next);
          }}
        >
          − Layer
        </button>

        <button
          className="btn"
          disabled={!state || !canGoUp || encounterActive || layerFx !== null}
          onClick={() => {
            if (!state) return;
            const next = Math.min(scenarioLayerCount, currentLayer + 1);

            const st2: any = ensureScenario(state);
            setCurrentLayer(next);
            enterLayer(st2, next);
            revealWholeLayer(st2, next);

            forceRender((n) => n + 1);
            pushLog("Layer " + next, "info");
            triggerLayerFx(next);
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
          <div className="boardWrap">
            <SideBar side="top" currentLayer={currentLayer} />
            <SideBar side="left" currentLayer={currentLayer} />

            <div key={currentLayer} className="boardLayerBg" />

            {isMobile ? null : <HexDeckCardsOverlay glowVar={layerCssVar(currentLayer)} />}

            <div className="boardScroll" ref={scrollRef}>
            <div className="board" ref={boardRef}>
              <div className="hexGrid">
                {showGhost ? <GhostGrid layer={currentLayer} /> : null}

                {layerFx ? (
                  <div key={layerFx.key} className="layerFxOverlay" style={layerFxStyle} aria-live="polite">
                    <div className="layerFxCard">
                      <div className="layerFxTitle">Layer {layerFx.layer}</div>
                    </div>
                  </div>
                ) : null}

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

                        if (bm.missing) return <div key={id} className="hexSlot empty" style={cellStyle} />;

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

                        const tileVisual = resolveTileVisualType({
                          revealed: !!hex?.revealed,
                          blocked: bm.blocked,
                          isGoal,
                          isStart: showStartPortal,
                          isPortalUp,
                          isPortalDown,
                        });
                        // Theme hexTile (if set) overrides per-type art for backward compatibility.
                        const tileArtUrl = HEX_TILE
                          ? toPublicUrl(HEX_TILE)
                          : toPublicUrl(tileArtRelPath(tileVisual));
                        const hexInnerStyle = {
                          ["--tileArt" as any]: `url(${tileArtUrl})`,
                        } as React.CSSProperties;

                        return (
                          <div key={"v-" + r + "-" + c} className="hexSlot" style={cellStyle}>
                            <button
                              ref={isPlayer ? playerBtnRef : undefined}
                              className={[
                                "hex",
                                isSel ? "sel" : "",
                                isReachPulse ? "reachPulse" : "",
                                isReachPulseCard ? "reachPulseCard" : "",
                                bm.blocked ? "blocked" : "",
                                isPlayer ? "player" : "",
                                isGoal ? "goal" : "",
                                isTrigger ? "trigger" : "",
                                showStartPortal ? "portalStart" : "",
                                isPortalUp ? "portalUp" : "",
                                isPortalDown ? "portalDown" : "",
                              ].join(" ")}
                              onClick={() => {
                                if (layerFx !== null) return;
                                if (playerLayer && currentLayer !== playerLayer) {
                                  tryMoveToId(id);
                                  return;
                                }
                                setSelectedId(id);
                                tryMoveToId(id);
                              }}
                              disabled={!state || bm.blocked || bm.missing || encounterActive || layerFx !== null}
                              style={
                                {
                                  ["--hexGlow" as any]: isReachPulse
                                    ? reachPulseGlow(currentLayer, cardHere)
                                    : layerCssVar(currentLayer),
                                  ...(portalColor ? { ["--portalC" as any]: portalColor } : {}),
                                } as any
                              }
                              title={id}
                            >
                              <div className="hexAnchor">
                                <div className="hexInner" style={hexInnerStyle}>
                                  <div className="hexCoords">
                                    <div className="hexId">{r + "," + c}</div>
                                  </div>
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
                                    {isGoal ? <span className="mark g">G</span> : null}
                                    {isTrigger ? <span className="mark t">!</span> : null}
                                  </div>
                                </div>
                              </div>
                            </button>

                            {cardHere ? (
                              <div className={"cardBadge hexDeckCard " + cardHere} title={cardHere}>
                                <div className="deckFx" />
                              </div>
                            ) : null}

                            {isPlayer ? (
                              <span
                                className={"playerSpriteSheet " + (isWalking ? "walking" : "")}
                                style={
                                  {
                                    ["--spriteImg" as any]: "url(" + spriteSheetUrl() + ")",
                                    ["--frameW" as any]: FRAME_W,
                                    ["--frameH" as any]: FRAME_H,
                                    ["--cols" as any]: SPRITE_COLS,
                                    ["--rows" as any]: SPRITE_ROWS,
                                    ["--frameX" as any]: walkFrame,
                                    ["--frameY" as any]: facingRow(playerFacing),
                                  } as any
                                }
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

          {isMobile ? <HexDeckCardsRow glowVar={layerCssVar(currentLayer)} /> : null}

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

    </div>
  );
}
