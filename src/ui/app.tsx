// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, type ReachMap } from "../engine/api";
import { ROW_LENS, enterLayer, revealHex } from "../engine/board";
import { neighborIdsSameLayer } from "../engine/neighbors";

/* =========================================================
   Template Flow
   Start -> World -> Character -> Scenario -> Difficulty? -> Game
========================================================= */
type Screen = "start" | "world" | "character" | "scenario" | "difficulty" | "game";

type PlayerChoice =
  | { kind: "preset"; id: string; name: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

type Coord = { layer: number; row: number; col: number };
type LogEntry = { n: number; t: string; msg: string; kind?: "ok" | "bad" | "info" };

/* =========================================================
   World / Scenario auto-discovery
========================================================= */
type LayerPalette = { L1: string; L2: string; L3: string; L4: string; L5: string; L6: string; L7: string };

type ScenarioTheme = {
  palette: LayerPalette;
  assets: {
    backgroundGame: string;
    diceFacesBase: string;
    diceCornerBorder: string;
    villainsBase: string;
  };
};

type Track = { id: string; name: string; scenarioJson: string };
type ScenarioEntry = {
  id: string;
  name: string;
  desc?: string;
  scenarioJson: string;
  theme: ScenarioTheme;
  tracks?: Track[];
};

type WorldEntry = {
  id: string;
  name: string;
  desc?: string;
  menu: { solidColor?: string };
  scenarios: ScenarioEntry[];
};

// Auto-load all world modules under src/worlds/**/world.ts
const worldModules = import.meta.glob("../worlds/**/world.ts", { eager: true });

function loadWorlds(): WorldEntry[] {
  const list: WorldEntry[] = [];
  for (const [path, mod] of Object.entries(worldModules as any)) {
    const w = (mod as any)?.default ?? (mod as any)?.world ?? null;
    if (!w) continue;
    if (!w.id) {
      const m = /..\/worlds\/([^/]+)\/world\.ts$/.exec(path);
      w.id = m?.[1] ?? "world";
    }
    list.push(w as WorldEntry);
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/* =========================================================
   Villain triggers (loaded from scenario.json, NOT hardcoded)
========================================================= */
type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";

type VillainTrigger = {
  key: VillainKey;
  layer: number;
  row: number;
  cols?: "any" | number[];
};

type Encounter = null | { villainKey: VillainKey; tries: number };

/* =========================================================
   Helpers
========================================================= */
function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

/** GitHub Pages-safe public URL helper (respects Vite BASE_URL). */
function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const clean = String(p).replace(/^\/+/, "");
  return base + clean;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(toPublicUrl(path));
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

async function loadScenario(path: string): Promise<Scenario> {
  const s = await fetchJson<Scenario>(path);
  assertScenario(s as any);
  return s;
}

function getHexFromState(state: GameState | null, id: string): Hex | undefined {
  if (!state) return undefined;
  const m: any = (state as any).hexesById;
  if (m?.get) return m.get(id);
  return (state as any).hexesById?.[id];
}

function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
  if (!hex) return { blocked: true, missing: true };
  return { missing: !!hex.missing, blocked: !!hex.blocked };
}

function layerCssVar(n: number) {
  const clamped = Math.max(1, Math.min(7, Math.floor(n || 1)));
  return `var(--L${clamped})`;
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Best-effort goal id discovery (safe if scenario doesn’t define it). */
function findGoalId(s: any, fallbackLayer: number): string | null {
  const direct =
    s?.goalHexId ??
    s?.goalId ??
    s?.exitHexId ??
    s?.exitId ??
    s?.targetHexId ??
    s?.targetId ??
    s?.winHexId ??
    s?.winId ??
    null;

  if (typeof direct === "string" && /^L\d+-R\d+-C\d+$/.test(direct)) return direct;

  const gc = s?.goal ?? s?.exit ?? s?.target ?? null;
  if (gc && typeof gc === "object") {
    const layer = Number(gc.layer ?? fallbackLayer);
    const row = Number(gc.row ?? gc.r);
    const col = Number(gc.col ?? gc.c);
    if (Number.isFinite(layer) && Number.isFinite(row) && Number.isFinite(col)) return `L${layer}-R${row}-C${col}`;
  }
  return null;
}

/* =========================================================
   Minimal players (template)
========================================================= */
const PLAYER_PRESETS = [
  { id: "p1", name: "Aeris" },
  { id: "p2", name: "Devlan" },
];

/* =========================================================
   Dice mapping
========================================================= */
function rotForRoll(n: number) {
  // Convention: 1=top, 6=bottom, 2=front, 5=back, 3=right, 4=left
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

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");

  // auto worlds
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);
  const world = useMemo(() => worlds.find((w) => w.id === worldId) ?? null, [worlds, worldId]);

  // scenario / track selection
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioEntry = useMemo(() => world?.scenarios.find((s) => s.id === scenarioId) ?? null, [world, scenarioId]);

  const [trackId, setTrackId] = useState<string | null>(null);
  const trackEntry = useMemo(() => {
    const tracks = scenarioEntry?.tracks;
    if (!tracks || tracks.length <= 0) return null;
    return tracks.find((t) => t.id === trackId) ?? null;
  }, [scenarioEntry, trackId]);

  // player
  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  // game state
  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reachMap, setReachMap] = useState<ReachMap>({} as ReachMap);
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(reachMap as any)) if ((v as any)?.reachable) set.add(k);
    return set;
  }, [reachMap]);

  // villain triggers loaded from scenario.json
  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const encounterActive = !!encounter;

  // ✅ 6-glow + quick reset to BASE pose (mini cube returns to initial position)
  const [sixGlow, setSixGlow] = useState(false);
  const [sixGlowVsVillain, setSixGlowVsVillain] = useState(false);
  const sixTimersRef = useRef<number[]>([]);
  const clearSixTimers = useCallback(() => {
    for (const t of sixTimersRef.current) window.clearTimeout(t);
    sixTimersRef.current = [];
  }, []);
  const triggerSixCinematic = useCallback(
    (opts: { vsVillain: boolean; clearEncounter?: () => void }) => {
      clearSixTimers();

      setSixGlow(true);
      setSixGlowVsVillain(opts.vsVillain);

      const t1 = window.setTimeout(() => {
        setDiceRot(BASE_DICE_VIEW);
      }, 900);

      const t2 = window.setTimeout(() => {
        setSixGlow(false);
        setSixGlowVsVillain(false);
        opts.clearEncounter?.();
      }, 1200);

      sixTimersRef.current.push(t1, t2);
    },
    [clearSixTimers]
  );

  useEffect(() => {
    return () => clearSixTimers();
  }, [clearSixTimers]);

  // palette + assets for the active scenario (used in CSS vars + images)
  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME_BG_URL = activeTheme?.assets.backgroundGame ?? "";
  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "";

  // layer count from scenario JSON (loaded when starting)
  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------
     Move counter + optimal
  -------------------------- */
  const [movesTaken, setMovesTaken] = useState(0);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [optimalAtStart, setOptimalAtStart] = useState<number | null>(null);
  const [optimalFromNow, setOptimalFromNow] = useState<number | null>(null);

  /* --------------------------
     Story log
  -------------------------- */
  const [log, setLog] = useState<LogEntry[]>([]);
  const logNRef = useRef(0);
  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    logNRef.current += 1;
    const e: LogEntry = { n: logNRef.current, t: nowHHMM(), msg, kind };
    setLog((prev) => [e, ...prev].slice(0, 24));
  }, []);

  /* --------------------------
     Inventory / power ups (simple)
  -------------------------- */
  type ItemId = "reroll" | "revealRing" | "peek";
  type Item = { id: ItemId; name: string; icon: string; charges: number };
  const [items, setItems] = useState<Item[]>([
    { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
    { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
    { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
  ]);

  /* --------------------------
     Dice state
  -------------------------- */
  const [rollValue, setRollValue] = useState<number>(1);

  // Default view shows TOP+FRONT+RIGHT (3 faces)
  const BASE_DICE_VIEW = { x: -28, y: -36 };

  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>(BASE_DICE_VIEW);
  const [diceSpinning, setDiceSpinning] = useState(false);

  // drag rotation state (disabled during encounter)
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startRotX: 0,
    startRotY: 0,
    pointerId: -1,
  });
  const [diceDragging, setDiceDragging] = useState(false);

  const belowLayer = currentLayer - 1;
  const aboveLayer = currentLayer + 1;

  useEffect(() => {
    setWorlds(loadWorlds());
  }, []);

  function diceImg(n: number) {
    return toPublicUrl(`${DICE_FACES_BASE}/D20_${n}.png`);
  }

  function villainImg(key: VillainKey) {
    return toPublicUrl(`${VILLAINS_BASE}/${key}.png`);
  }

  function findTriggerForHex(id: string): VillainKey | null {
    const c = idToCoord(id);
    if (!c) return null;
    for (const t of villainTriggers) {
      if (t.layer !== c.layer) continue;
      if (t.row !== c.row) continue;
      if (!t.cols || t.cols === "any") return t.key;
      if (Array.isArray(t.cols) && t.cols.includes(c.col)) return t.key;
    }
    return null;
  }

  const rollDice = useCallback(() => {
    // dice roll counts as a turn
    setMovesTaken((m) => m + 1);

    const n = 1 + Math.floor(Math.random() * 6);
    setRollValue(n);

    const targetFace = rotForRoll(n);
    const final = { x: BASE_DICE_VIEW.x + targetFace.x, y: BASE_DICE_VIEW.y + targetFace.y };

    setDiceSpinning(true);

    const extraX = 360 * (1 + Math.floor(Math.random() * 2));
    const extraY = 360 * (2 + Math.floor(Math.random() * 2));

    setDiceRot({ x: final.x - extraX, y: final.y - extraY });
    window.setTimeout(() => {
      setDiceRot(final);
      window.setTimeout(() => setDiceSpinning(false), 650);
    }, 40);

    pushLog(`Rolled ${n}`, n === 6 ? "ok" : "info");

    // encounter: only 6 clears it
    if (encounterActive && n === 6) {
      triggerSixCinematic({
        vsVillain: true,
        clearEncounter: () => {
          setEncounter(null);
          pushLog(`Encounter cleared (${encounter!.villainKey})`, "ok");
        },
      });
      return;
    }

    if (!encounterActive && n === 6) {
      triggerSixCinematic({ vsVillain: false });
      return;
    }

    // Encounter: non-6 increments tries (unchanged)
    setEncounter((prev) => {
      if (!prev) return prev;
      return { ...prev, tries: prev.tries + 1 };
    });
  }, [pushLog, encounterActive, triggerSixCinematic, encounter]);

  // Manual drag rotation ONLY when NOT in encounter
  const onDicePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (diceSpinning) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      dragRef.current.active = true;
      dragRef.current.pointerId = e.pointerId;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.startRotX = diceRot.x;
      dragRef.current.startRotY = diceRot.y;

      setDiceDragging(true);
    },
    [diceRot.x, diceRot.y, diceSpinning, encounterActive]
  );

  const onDicePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const sens = 0.35;
      const nextY = dragRef.current.startRotY + dx * sens;
      const nextX = dragRef.current.startRotX - dy * sens;

      setDiceRot({ x: nextX, y: nextY });
    },
    [encounterActive]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = -1;
      setDiceDragging(false);
    },
    [encounterActive]
  );

  /* --------------------------
     Game helpers
  -------------------------- */
  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        revealHex(st, `L${layer}-R${r}-C${c}`);
      }
    }
  }, []);

  const revealRing = useCallback((st: GameState, centerId: string) => {
    revealHex(st, centerId);
    for (const nbId of neighborIdsSameLayer(st, centerId)) {
      revealHex(st, nbId);
    }
  }, []);

  const computeOptimalFromReachMap = useCallback((rm: ReachMap, gid: string | null) => {
    if (!gid) return null;
    const info: any = (rm as any)[gid];
    return info?.reachable ? (info.distance as number) : null;
  }, []);

  const parseVillainsFromScenario = useCallback((s: any): VillainTrigger[] => {
    if (Array.isArray(s?.villainTriggers)) {
      return s.villainTriggers
        .map((t: any) => ({
          key: t.key as VillainKey,
          layer: Number(t.layer),
          row: Number(t.row),
          cols: t.cols ?? "any",
        }))
        .filter((t: any) => t.key && Number.isFinite(t.layer) && Number.isFinite(t.row));
    }

    if (Array.isArray(s?.villains?.triggers)) {
      return s.villains.triggers
        .map((t: any) => ({
          key: String(t.id) as VillainKey,
          layer: Number(t.layer),
          row: Number(t.row),
          cols: "any" as const,
        }))
        .filter((t: any) => t.key && Number.isFinite(t.layer) && Number.isFinite(t.row));
    }

    return [];
  }, []);

  const startScenario = useCallback(async () => {
    if (!scenarioEntry) return;

    const tracks = scenarioEntry.tracks ?? [];
    const hasTracks = tracks.length > 1;
    const chosenJson = hasTracks ? trackEntry?.scenarioJson ?? scenarioEntry.scenarioJson : scenarioEntry.scenarioJson;

    const s = (await loadScenario(chosenJson)) as any;

    setVillainTriggers(parseVillainsFromScenario(s));
    setEncounter(null);

    const st = newGame(s);
    const pid = st.playerHexId ?? null;
    const layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;

    const gid = findGoalId(s, layer);
    setGoalId(gid);

    const layerCount = Number(s?.layers ?? 1);
    setScenarioLayerCount(layerCount);

    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    const rm = getReachability(st) as any;
    setReachMap(rm);

    setState(st);
    setSelectedId(pid);
    setCurrentLayer(layer);

    setRollValue(1);
    setDiceRot(BASE_DICE_VIEW);
    setDiceSpinning(false);
    setDiceDragging(false);

    clearSixTimers();
    setSixGlow(false);
    setSixGlowVsVillain(false);

    setMovesTaken(0);
    setOptimalAtStart(computeOptimalFromReachMap(rm as any, gid));
    setOptimalFromNow(computeOptimalFromReachMap(rm as any, gid));

    logNRef.current = 0;
    setLog([]);
    pushLog(`Started: ${scenarioEntry.name}`, "ok");
    if (gid) pushLog(`Goal: ${gid}`, "info");
    else pushLog(`Goal: (not set in scenario JSON)`, "bad");

    setItems([
      { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
      { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
      { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
    ]);

    window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 0);

    setScreen("game");
  }, [scenarioEntry, trackEntry, parseVillainsFromScenario, revealWholeLayer, computeOptimalFromReachMap, pushLog, clearSixTimers]);

  /* --------------------------
     Board click
     - ✅ change #4: only successful moves increment movesTaken
     - Triggers villain encounter if scenario.json says so
  -------------------------- */
  const tryMoveToId = useCallback(
    (id: string) => {
      // ignore board interaction during encounter
      if (encounterActive) return;

      const vk = findTriggerForHex(id);
      if (vk) {
        setEncounter({ villainKey: vk, tries: 0 });
        setDiceRot(BASE_DICE_VIEW);
        setDiceSpinning(false);
        setDiceDragging(false);
        pushLog(`Encounter: ${vk} — roll a 6 to continue`, "bad");
        return;
      }

      if (!state) return;

      setSelectedId(id);

      const res = tryMove(state, id);

      const rm = getReachability(state) as any;
      setReachMap(rm);

      if (res.ok) {
        // ✅ only count successful moves
        setMovesTaken((m) => m + 1);

        const newPlayerId = (state as any).playerHexId;
        const newLayer = newPlayerId ? idToCoord(newPlayerId)?.layer ?? currentLayer : currentLayer;

        if (!res.won) {
          enterLayer(state, newLayer);
          revealWholeLayer(state, newLayer);
        }

        setCurrentLayer(newLayer);
        setSelectedId(newPlayerId ?? id);

        setOptimalFromNow(computeOptimalFromReachMap(rm as any, goalId));

        setState({ ...(state as any) });

        const c = newPlayerId ? idToCoord(newPlayerId) : null;
        pushLog(c ? `Move OK → R${c.row + 1}C${c.col + 1} (L${c.layer})` : `Move OK`, "ok");
      } else {
        setState({ ...(state as any) });
        pushLog(`Move blocked`, "bad");
      }
    },
    [state, currentLayer, pushLog, goalId, computeOptimalFromReachMap, encounterActive, villainTriggers, revealWholeLayer]
  );

  /* --------------------------
     Inventory use (simple)
  -------------------------- */
  const useItem = useCallback(
    (id: "reroll" | "revealRing" | "peek") => {
      const it = items.find((x) => x.id === id);
      if (!it || it.charges <= 0) return;

      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, charges: Math.max(0, x.charges - 1) } : x)));

      if (id === "reroll") {
        pushLog("Used: Reroll", "info");
        rollDice();
        return;
      }

      if (!state) return;

      const pid = (state as any).playerHexId ?? null;
      if (!pid) return;

      if (id === "revealRing") {
        revealRing(state, pid);
        setReachMap(getReachability(state) as any);
        setState({ ...(state as any) });
        pushLog("Used: Reveal (ring)", "ok");
        return;
      }

      if (id === "peek") {
        const up = Math.min(scenarioLayerCount, currentLayer + 1);
        const dn = Math.max(1, currentLayer - 1);

        const upId = pid.replace(/^L\d+-/, `L${up}-`);
        const dnId = pid.replace(/^L\d+-/, `L${dn}-`);

        revealRing(state, upId);
        revealRing(state, dnId);

        setReachMap(getReachability(state) as any);
        setState({ ...(state as any) });
        pushLog("Used: Peek (above/below ring)", "info");
        return;
      }
    },
    [items, state, currentLayer, scenarioLayerCount, rollDice, pushLog, revealRing]
  );

  const stripeBelow = belowLayer < 1 ? "rgba(0,0,0,.90)" : layerCssVar(belowLayer);
  const stripeCurr = layerCssVar(currentLayer);
  const stripeAbove = aboveLayer > scenarioLayerCount ? "rgba(0,0,0,.90)" : layerCssVar(aboveLayer);

  function filterReachForLayer(layer: number, rmAll: ReachMap) {
    const prefix = `L${layer}-`;
    const rm = {} as ReachMap;
    const set = new Set<string>();
    for (const [k, v] of Object.entries(rmAll as any)) {
      if (!k.startsWith(prefix)) continue;
      (rm as any)[k] = v;
      if ((v as any)?.reachable) set.add(k);
    }
    return { reachMap: rm, reachable: set };
  }

  const miniAboveLayer = Math.min(scenarioLayerCount, Math.max(1, aboveLayer));
  const miniCurrLayer = currentLayer;
  const miniBelowLayer = Math.max(1, belowLayer);
  const miniAboveReach = useMemo(() => filterReachForLayer(miniAboveLayer, reachMap), [miniAboveLayer, reachMap]);
  const miniCurrReach = useMemo(() => filterReachForLayer(miniCurrLayer, reachMap), [miniCurrLayer, reachMap]);
  const miniBelowReach = useMemo(() => filterReachForLayer(miniBelowLayer, reachMap), [miniBelowLayer, reachMap]);

  const delta = useMemo(() => {
    if (optimalAtStart == null || optimalFromNow == null) return null;
    return movesTaken + optimalFromNow - optimalAtStart;
  }, [movesTaken, optimalAtStart, optimalFromNow]);

  const stepBgBlue = "linear-gradient(180deg, rgba(40,120,255,.95), rgba(10,40,120,.95))";

  const cssVars = useMemo(() => {
    const vars: any = {
      ["--diceBorderImg"]: DICE_BORDER_IMG ? `url("${toPublicUrl(DICE_BORDER_IMG)}")` : "none",
      ["--menuSolidBg"]: stepBgBlue,
    };
    if (palette) {
      vars["--L1"] = palette.L1;
      vars["--L2"] = palette.L2;
      vars["--L3"] = palette.L3;
      vars["--L4"] = palette.L4;
      vars["--L5"] = palette.L5;
      vars["--L6"] = palette.L6;
      vars["--L7"] = palette.L7;
    }
    return vars;
  }, [palette, DICE_BORDER_IMG]);

  const playerId = (state as any)?.playerHexId ?? null;
  const playerCoord = playerId ? idToCoord(playerId) : null;
  const playerPosText = playerCoord ? `R${playerCoord.row + 1} C${playerCoord.col + 1} (L${playerCoord.layer})` : "—";

  return (
    <div className="appRoot" style={cssVars}>
      <style>{CSS}</style>

      {screen === "game" ? (
        <>
          <div className="globalBg" aria-hidden="true" style={{ backgroundImage: `url("${toPublicUrl(GAME_BG_URL)}")` }} />
          <div className="globalBgOverlay" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="menuBg" aria-hidden="true" />
          <div className="globalBgOverlay" aria-hidden="true" />
        </>
      )}

      {/* START */}
      {screen === "start" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitleBig">Hex Layers</div>
            <div className="cardMeta">Template</div>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setWorldId(null);
                  setScenarioId(null);
                  setTrackId(null);
                  setChosenPlayer(null);
                  setScreen("world");
                }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* WORLD SELECT */}
      {screen === "world" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Select world</div>
            <div className="selectList">
              {worlds.map((w) => {
                const selected = w.id === worldId;
                return (
                  <div
                    key={w.id}
                    className={"selectTile" + (selected ? " selected" : "")}
                    onClick={() => {
                      setWorldId(w.id);
                      setScenarioId(null);
                      setTrackId(null);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{w.name}</div>
                    <div className="selectTileDesc">{w.desc ?? ""}</div>
                  </div>
                );
              })}
              {!worlds.length ? <div className="selectTileDesc">No worlds found. Add src/worlds/&lt;world&gt;/world.ts</div> : null}
            </div>

            <div className="row rowBetween">
              <button className="btn" onClick={() => setScreen("start")}>
                Back
              </button>
              <button className="btn primary" disabled={!worldId} onClick={() => setScreen("character")}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CHARACTER SELECT */}
      {screen === "character" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Choose character</div>

            <div className="selectList">
              {PLAYER_PRESETS.map((p) => {
                const isSel = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={"selectTile" + (isSel ? " selected" : "")}
                    onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{p.name}</div>
                    <div className="selectTileDesc">Preset</div>
                  </div>
                );
              })}
            </div>

            <div className="row rowBetween">
              <button className="btn" onClick={() => setScreen("world")}>
                Back
              </button>
              <button className="btn primary" disabled={!chosenPlayer || !world} onClick={() => setScreen("scenario")}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SCENARIO SELECT */}
      {screen === "scenario" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Select scenario</div>
            <div className="cardMeta">{world ? `World: ${world.name}` : ""}</div>

            <div className="selectList">
              {(world?.scenarios ?? []).map((s) => {
                const selected = s.id === scenarioId;
                return (
                  <div
                    key={s.id}
                    className={"selectTile" + (selected ? " selected" : "")}
                    onClick={() => {
                      setScenarioId(s.id);
                      setTrackId(null);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{s.name}</div>
                    <div className="selectTileDesc">{s.desc ?? ""}</div>
                  </div>
                );
              })}
              {!world?.scenarios?.length ? <div className="selectTileDesc">This world has no scenarios yet.</div> : null}
            </div>

            <div className="row rowBetween">
              <button className="btn" onClick={() => setScreen("character")}>
                Back
              </button>
              <button
                className="btn primary"
                disabled={!scenarioEntry}
                onClick={() => {
                  const tracks = scenarioEntry?.tracks ?? [];
                  if (tracks.length > 1) setScreen("difficulty");
                  else {
                    setTrackId(null);
                    startScenario().catch((e) => alert(String((e as any)?.message ?? e)));
                  }
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* DIFFICULTY (tracks) */}
      {screen === "difficulty" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Choose difficulty</div>
            <div className="cardMeta">{scenarioEntry ? scenarioEntry.name : ""}</div>

            <div className="selectList">
              {(scenarioEntry?.tracks ?? []).map((t) => {
                const selected = t.id === trackId;
                return (
                  <div
                    key={t.id}
                    className={"selectTile" + (selected ? " selected" : "")}
                    onClick={() => setTrackId(t.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{t.name}</div>
                    <div className="selectTileDesc">Track: {t.id}</div>
                  </div>
                );
              })}
              {!scenarioEntry?.tracks?.length ? <div className="selectTileDesc">No tracks found. (This screen should normally be skipped.)</div> : null}
            </div>

            <div className="row rowBetween">
              <button className="btn" onClick={() => setScreen("scenario")}>
                Back
              </button>
              <button className="btn primary" disabled={!trackId} onClick={() => startScenario().catch((e) => alert(String((e as any)?.message ?? e)))}>
                Start game
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* GAME */}
      {screen === "game" ? (
        <div className="shell shellGame">
          {encounterActive ? <div className="blackout" aria-hidden="true" /> : null}

          {encounterActive ? (
            <div className="villainCenter">
              <img className={"villainImg" + (sixGlow && sixGlowVsVillain ? " glowSix" : "")} src={villainImg(encounter!.villainKey)} alt={encounter!.villainKey} />
              <div className="villainText">Roll a 6 to continue</div>
              <button className="btn primary" onClick={rollDice}>
                🎲 Roll
              </button>
              <div className="villainSmall">Tries: {encounter!.tries}</div>
            </div>
          ) : null}

          <div className="scrollStage" ref={scrollRef}>
            <div className="scrollInner">
              <div className="gameLayout">
                <SideBar side="left" currentLayer={currentLayer} segments={barSegments} />

                <div className="mainBoardWrap">
                  <HexBoard
                    kind="main"
                    activeLayer={currentLayer}
                    maxLayer={scenarioLayerCount}
                    state={state}
                    selectedId={selectedId}
                    reachable={reachable}
                    reachMap={reachMap}
                    onCellClick={tryMoveToId}
                    showCoords
                    showPlayerOnMini={false}
                  />
                </div>

                <SideBar side="right" currentLayer={currentLayer} segments={barSegments} />

                {/* Cube / Dice */}
                <div className="diceArea">
                  <div className="diceCubeWrap" aria-label="Layer dice">
                    <div
                      className={
                        "diceCube" +
                        (diceSpinning ? " isSpinning" : "") +
                        (diceDragging ? " isDragging" : "") +
                        (sixGlow ? " glowSix" : "")
                      }
                      onPointerDown={onDicePointerDown}
                      onPointerMove={onDicePointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      style={{
                        // ✅ change #6: move cube up
                        transform: `translateY(30px) rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)`,
                        touchAction: encounterActive ? "auto" : "none",
                        cursor: encounterActive ? "default" : diceDragging ? "grabbing" : "grab",
                      }}
                    >
                      {encounterActive ? (
                        <>
                          <FaceImage cls="diceFace faceTop" src={diceImg(1)} alt="Dice 1" />
                          <FaceImage cls="diceFace faceFront" src={diceImg(2)} alt="Dice 2" />
                          <FaceImage cls="diceFace faceRight" src={diceImg(3)} alt="Dice 3" />
                          <FaceImage cls="diceFace faceLeft" src={diceImg(4)} alt="Dice 4" />
                          <FaceImage cls="diceFace faceBack" src={diceImg(5)} alt="Dice 5" />
                          <FaceImage cls="diceFace faceBottom" src={diceImg(6)} alt="Dice 6" />
                        </>
                      ) : (
                        <>
                          {/* MINI BOARD MODE (3 faces) */}
                          <div className="diceFace faceTop">
                            <div className="faceStripe" style={{ background: stripeAbove }} />
                            <div className="diceFaceInnerFixed">
                              <div className="miniFit">
                                <HexBoard
                                  kind="mini"
                                  activeLayer={miniAboveLayer}
                                  maxLayer={scenarioLayerCount}
                                  state={state}
                                  selectedId={null}
                                  reachable={miniAboveReach.reachable}
                                  reachMap={miniAboveReach.reachMap}
                                  showCoords={false}
                                  onCellClick={undefined}
                                  showPlayerOnMini={true}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="diceFace faceFront">
                            <div className="faceStripe" style={{ background: stripeCurr }} />
                            <div className="diceFaceInnerFixed">
                              <div className="miniFit">
                                <HexBoard
                                  kind="mini"
                                  activeLayer={miniCurrLayer}
                                  maxLayer={scenarioLayerCount}
                                  state={state}
                                  selectedId={null}
                                  reachable={miniCurrReach.reachable}
                                  reachMap={miniCurrReach.reachMap}
                                  showCoords={false}
                                  onCellClick={undefined}
                                  showPlayerOnMini={true}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="diceFace faceRight">
                            <div className="faceStripe" style={{ background: stripeBelow }} />
                            <div className="diceFaceInnerFixed">
                              {belowLayer < 1 ? (
                                <div className="miniInvalid">NO LAYER BELOW</div>
                              ) : (
                                <div className="miniFit">
                                  <HexBoard
                                    kind="mini"
                                    activeLayer={miniBelowLayer}
                                    maxLayer={scenarioLayerCount}
                                    state={state}
                                    selectedId={null}
                                    reachable={miniBelowReach.reachable}
                                    reachMap={miniBelowReach.reachMap}
                                    showCoords={false}
                                    onCellClick={undefined}
                                    showPlayerOnMini={true}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* HUD faces */}
                          <div className="diceFace faceBack">
                            <div className="diceHud">
                              <div className="hudTitle">Moves</div>
                              <div className="hudRow">
                                <span className="hudKey">Taken</span>
                                <span className="hudVal">{movesTaken}</span>
                              </div>
                              <div className="hudRow">
                                <span className="hudKey">Optimal start</span>
                                <span className="hudVal">{optimalAtStart == null ? "—" : optimalAtStart}</span>
                              </div>
                              <div className="hudRow">
                                <span className="hudKey">Optimal now</span>
                                <span className="hudVal">{optimalFromNow == null ? "—" : optimalFromNow}</span>
                              </div>
                              <div className="hudRow">
                                <span className="hudKey">Δ</span>
                                <span className={"hudVal " + (delta == null ? "" : delta <= 0 ? "ok" : "bad")}>
                                  {delta == null ? "—" : delta}
                                </span>
                              </div>

                              {/* ✅ modest change: show current position at bottom */}
                              <div className="hudNote">
                                Pos: <span className="mono">{playerPosText}</span>
                              </div>
                              <div className="hudNote">
                                Goal: <span className="mono">{goalId ?? "not set"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="diceFace faceLeft">
                            <div className="diceHud">
                              <div className="hudTitle">Story</div>
                              <div className="hudLog">
                                {log.slice(0, 7).map((e) => (
                                  <div key={e.n} className={"hudLogLine " + (e.kind ?? "info")}>
                                    <span className="hudTime">{e.t}</span>
                                    <span className="hudMsg">{e.msg}</span>
                                  </div>
                                ))}
                                {!log.length ? <div className="hudLogEmpty">No events yet…</div> : null}
                              </div>
                            </div>
                          </div>

                          <div className="diceFace faceBottom">
                            <div className="diceHud">
                              <div className="hudTitle">Power</div>
                              <div className="invGrid">
                                {items.map((it) => (
                                  <button
                                    key={it.id}
                                    className="invSlot"
                                    onClick={() => useItem(it.id)}
                                    disabled={it.charges <= 0}
                                    title={`${it.name} (${it.charges})`}
                                  >
                                    <div className="invIcon">{it.icon}</div>
                                    <div className="invMeta">
                                      <div className="invName">{it.name}</div>
                                      <div className="invCharges">{it.charges}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="hudNote">Drag cube or  • Tap items to use</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ✅ stationary “” control (trackball) */}
                    <div
                      className={"orbit" + (diceDragging ? " isDragging" : "")}
                      onPointerDown={onDicePointerDown}
                      onPointerMove={onDicePointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      title="Drag to rotate cube"
                      role="button"
                      tabIndex={0}
                      style={{
                        cursor: encounterActive ? "default" : diceDragging ? "grabbing" : "grab",
                        touchAction: encounterActive ? "auto" : "none",
                      }}
                    />
                  </div>

                  <div className="diceControls">
                    {encounterActive ? <div className="diceReadout">Roll = {rollValue}</div> : <div className="diceReadout subtle">Drag to rotate</div>}
                  </div>

                  <div className="dragHint">{encounterActive ? "Encounter: roll a 6 to continue" : "Board Mode: Drag rotation only"}</div>

                  <div className="row rowBetween" style={{ marginTop: 12 }}>
                    <button
                      className="btn"
                      onClick={() => {
                        setScreen("scenario");
                        setState(null);
                        setEncounter(null);
                      }}
                    >
                      Back to Scenarios
                    </button>
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

/* =========================================================
   Dice corners (4x per face)
========================================================= */
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

/* =========================================================
   Dice image face component
========================================================= */
function FaceImage(props: { cls: string; src: string; alt: string }) {
  return (
    <div className={props.cls}>
      <DiceCorners />
      <div className="diceImgWrap">
        <img className="diceImg" src={props.src} alt={props.alt} draggable={false} />
      </div>
    </div>
  );
}

/* =========================================================
   Side bar
========================================================= */
function SideBar(props: { side: "left" | "right"; currentLayer: number; segments: number[] }) {
  const { side, currentLayer, segments } = props;
  return (
    <div className={"barWrap " + (side === "left" ? "barLeft" : "barRight")} aria-label={`Layer bar ${side}`}>
      <div className="layerBar">
        {segments.map((layerVal) => {
          const active = layerVal === currentLayer;
          return <div key={layerVal} className={"barSeg" + (active ? " isActive" : "")} data-layer={layerVal} title={`Layer ${layerVal}`} />;
        })}
      </div>
    </div>
  );
}

/* =========================================================
   Hex Board
========================================================= */
function HexBoard(props: {
  kind: "main" | "mini";
  activeLayer: number;
  maxLayer: number;
  state: GameState | null;
  selectedId: string | null;
  reachable: Set<string>;
  reachMap: ReachMap;
  onCellClick?: (id: string) => void;
  showCoords: boolean;
  showPlayerOnMini?: boolean;
}) {
  const { kind, activeLayer, maxLayer, state, selectedId, reachable, reachMap, onCellClick, showCoords, showPlayerOnMini } = props;
  const playerId = (state as any)?.playerHexId ?? null;

  const hasAbove = activeLayer < maxLayer;
  const hasBelow = activeLayer > 1;

  const layerColor = layerCssVar(activeLayer);
  const rimTop = hasAbove ? layerColor : "rgba(0,0,0,.92)";
  const rimBottom = hasBelow ? layerColor : "rgba(0,0,0,.92)";

  return (
    <div
      className={"hexBoard " + (kind === "main" ? "hexBoardMain" : "hexBoardMini")}
      data-layer={activeLayer}
      style={
        {
          ["--rimTop" as any]: rimTop,
          ["--rimBottom" as any]: rimBottom,
        } as any
      }
    >
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx;
        const isEvenRow = (row + 1) % 2 === 0;

        return (
          <div key={row} className={"hexRow" + (isEvenRow ? " even" : "")} data-row={row}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx;
              const id = `L${activeLayer}-R${row}-C${col}`;

              const hex = getHexFromState(state, id) as any;
              const { blocked, missing } = isBlockedOrMissing(hex);

              const isSel = selectedId === id;
              const isPlayer = playerId === id && (kind === "main" || !!showPlayerOnMini);
              const canMove = !!(reachMap as any)?.[id]?.reachable;
              const isReach = reachable.has(id);

              return (
                <div
                  key={id}
                  className={
                    "hex" +
                    (isSel ? " sel" : "") +
                    (isPlayer ? " player" : "") +
                    (isReach ? " reach" : "") +
                    (!canMove && kind === "main" && !isPlayer ? " notReach" : "") +
                    (blocked ? " blocked" : "") +
                    (missing ? " missing" : "")
                  }
                  data-row={row}
                  onClick={onCellClick ? () => onCellClick(id) : undefined}
                  role={onCellClick ? "button" : undefined}
                  tabIndex={onCellClick ? 0 : undefined}
                  title={showCoords ? `L${activeLayer} R${row + 1} C${col + 1}` : undefined}
                >
                  <span className="hexRim hexRimTop" aria-hidden="true" />
                  <span className="hexRim hexRimBottom" aria-hidden="true" />

                  {showCoords ? (
                    <span className="hexLabel">
                      <div>R{row + 1}</div>
                      <div>C{col + 1}</div>
                    </span>
                  ) : null}

                  {kind === "mini" ? <span className="miniNum">{col + 1}</span> : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */
const CSS = `
:root{
  --ink: rgba(255,255,255,.92);

  /* Defaults (overridden via inline CSS vars from scenario theme) */
  --L1: #FF4D7D;
  --L2: #FF9A3D;
  --L3: #FFD35A;
  --L4: #4BEE9C;
  --L5: #3ED7FF;
  --L6: #5C7CFF;
  --L7: #B66BFF;
}

*{ box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

.appRoot{
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: var(--ink);
}

.globalBg{
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: saturate(1.08) contrast(1.02);
  z-index: 0;
}

.menuBg{
  position:absolute;
  inset:0;
  background: var(--menuSolidBg, linear-gradient(180deg, rgba(40,120,255,.95), rgba(10,40,120,.95)));
  z-index:0;
}

.globalBgOverlay{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 600px at 50% 50%, rgba(255,255,255,.18), transparent 55%),
    linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.24));
  z-index: 1;
}

.blackout{
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.85);
  z-index: 50;
}

.villainCenter{
  position: fixed;
  left: 38%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 60;
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
}
.villainImg{
  width: min(340px, 40vw);
  height: auto;
  border-radius: 16px;
  box-shadow: 0 30px 80px rgba(0,0,0,.45);
}
.villainImg.glowSix{
  box-shadow:
    0 0 18px rgba(220,245,255,.95),
    0 0 42px rgba(120,210,255,.85),
    0 0 80px rgba(255,255,255,.65),
    0 30px 80px rgba(0,0,0,.45);
  filter:
    drop-shadow(0 0 12px rgba(160,230,255,.95))
    drop-shadow(0 0 22px rgba(255,255,255,.75));
}

.villainText{ font-weight: 1000; opacity: .96; }
.villainSmall{ font-weight: 900; opacity: .8; font-size: 12px; }

.shell{ position: relative; z-index: 2; padding: 22px; }
.shellCard{ display: grid; place-items: center; min-height: 100vh; }

.card{
  width: min(980px, calc(100vw - 44px));
  border-radius: 22px;
  padding: 18px;
  background: rgba(255,255,255,.12);
  box-shadow: 0 0 0 1px rgba(255,255,255,.16) inset, 0 25px 70px rgba(0,0,0,.18);
  backdrop-filter: blur(10px);
}
.cardTitleBig{ font-weight: 1000; font-size: 34px; letter-spacing: .2px; }
.cardTitle{ font-weight: 1000; font-size: 18px; letter-spacing: .2px; margin-bottom: 10px; }
.cardMeta{ margin-top: 6px; opacity: .82; font-weight: 900; }

.row{ display:flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.rowBetween{ justify-content: space-between; }

.btn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.20);
  color: rgba(255,255,255,.92);
  font-weight: 950;
  cursor:pointer;
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.16);
}
.btn:hover{ filter: brightness(1.06); border-color: rgba(255,255,255,.28); }
.btn:disabled{ opacity: .55; cursor: not-allowed; }
.btn.primary{
  border-color: rgba(255,255,255,.30);
  background: linear-gradient(135deg, rgba(200,140,255,.45), rgba(120,220,255,.30));
}

.selectList{ display:grid; gap: 10px; margin-top: 12px; }
.selectTile{
  border-radius: 16px;
  padding: 12px;
  background: rgba(0,0,0,.16);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
  cursor: pointer;
}
.selectTile.selected{
  border-color: rgba(255,255,255,.30);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.14);
}
.selectTileTitle{ font-weight: 1000; }
.selectTileDesc{ margin-top: 4px; opacity: .80; line-height: 1.25; }

/* GAME */
.shellGame{ min-height: 100vh; display: grid; place-items: start center; padding-top: 18px; }

.scrollStage{
  width: calc(100vw - 44px);
  max-width: 100vw;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 16px;
  scrollbar-gutter: stable both-edges;
}
.scrollInner{ min-width: 1380px; }

.dragHint{
  margin-top: 10px;
  opacity: .78;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 8px 20px rgba(0,0,0,.18);
}

.gameLayout{
  --rows: 7;
  --hexWMain: 82px;
  --hexHMain: calc(var(--hexWMain) * 0.8660254);

  display: grid;
  grid-template-columns: 62px auto 62px 420px;
  gap: 18px;
  align-items: start;
  justify-content: center;
}

/* BARS */
.barWrap{ display:flex; align-items: flex-start; justify-content: center; }
.layerBar{
  width: 18px;
  height: calc(var(--hexHMain) * var(--rows));
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0,0,0,.22);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 40px rgba(0,0,0,.18);
  display: grid;
  grid-template-rows: repeat(7, 1fr);
}
.barSeg{ opacity: .95; position: relative; }
.barSeg[data-layer="1"]{ background: var(--L1); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="7"]{ background: var(--L7); }

.barSeg.isActive{ outline: 1px solid rgba(255,255,255,.30); z-index: 3; }
.barSeg.isActive::after{
  content: "";
  position: absolute;
  inset: -10px;
  background: inherit;
  filter: blur(14px);
  opacity: .95;
  border-radius: 999px;
}

/* ✅ modest change: RIGHT bar active segment = layer + white glow */
.barRight .barSeg.isActive{
  outline: 1px solid rgba(255,255,255,.95);
  box-shadow:
    0 0 18px rgba(255,255,255,.70),
    0 0 44px rgba(255,255,255,.25);
  z-index: 2;
    
}
.barRight .barSeg.isActive::after{
  opacity: 1;
  filter: blur(18px);
  z-index: 2;
  
}

/* HEX BOARD */
.hexBoard{
  --hexW: 74px;
  --hexH: calc(var(--hexW) * 0.8660254);
  --hexGap: 10px;
  --hexOverlap: 0.0;
  --hexPitch: calc(var(--hexW) * (1 - var(--hexOverlap)) + var(--hexGap));
  --maxCols: 7;

  width: calc(var(--hexW) + (var(--maxCols) - 1) * var(--hexPitch));
  display: grid;
  justify-content: center;
  user-select: none;
}
.hexBoardMain{ --hexW: var(--hexWMain); --hexH: var(--hexHMain); }
.hexBoardMini{ --hexW: 24px; --hexGap: 2px; --hexOverlap: 0.0; }

.hexRow{ display:flex; width: 100%; height: var(--hexH); align-items: center; justify-content: flex-start; }
.hexRow.even{ padding-left: calc(var(--hexPitch) / 2); }

.hex{
  width: var(--hexW);
  height: var(--hexH);
  margin-right: calc(var(--hexPitch) - var(--hexW));
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  position: relative;
  /* ✅ change #1: less transparent tiles */
  background: rgba(255,255,255,.26);
  border: 1px solid rgba(0,0,0,.75);
  box-shadow: 0 0 0 1px rgba(0,0,0,.35) inset, 0 6px 16px rgba(0,0,0,.10);
  cursor: default;
}
.hexBoardMain .hex{ cursor: pointer; }

.hexRim{
  position:absolute;
  left: 14%;
  right: 14%;
  height: 2px;
  border-radius: 999px;
  opacity: .95;
  pointer-events:none;
  filter: drop-shadow(0 1px 4px rgba(0,0,0,.30));
  z-index: 2;
}
.hexRimTop{ top: 8%; background: var(--rimTop, rgba(0,0,0,.85)); }
.hexRimBottom{ bottom: 8%; background: var(--rimBottom, rgba(0,0,0,.85)); }

.hexLabel{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-weight: 1000;
  letter-spacing: .2px;
  line-height: 1.05;
  text-align: center;
  color: rgba(255,255,255,.98);
  z-index: 3;
  pointer-events: none;
  -webkit-text-stroke: 1px rgba(0,0,0,.75);
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.75),
     1px -1px 0 rgba(0,0,0,.75),
    -1px  1px 0 rgba(0,0,0,.75),
     1px  1px 0 rgba(0,0,0,.75),
     0 0 12px rgba(0,0,0,.45);
}
/* ✅ change #3: smaller / less dominant coords */
.hexBoardMain .hexLabel{ font-size: 11px; opacity: .92; }

.miniNum{
  position:absolute;
  inset: 0;
  display:grid;
  place-items:center;
  z-index: 4;
  pointer-events:none;
  font-weight: 1000;
  font-size: 9px;
  color: rgba(0,0,0,.92);
  text-shadow: 0 0 6px rgba(255,255,255,.35);
}

/* Only MAIN board overlays; mini stays uniform */
.hex::before{ content:""; position:absolute; inset:0; pointer-events:none; z-index:1; opacity:0; }
.hexBoardMain .hex.notReach{ cursor: not-allowed; }

/* ✅ change #2: overlays less dark */
.hexBoardMain .hex.notReach::before{ background: rgba(0,0,0,.18); opacity: 1; }
.hexBoardMain .hex.blocked::before{ background: rgba(0,0,0,.22); opacity: 1; }
.hexBoardMain .hex.missing::before{ background: rgba(0,0,0,.32); opacity: 1; }

.hexBoardMini .hex::before{ opacity: 0 !important; }

/* ✅ modest change: BIG blue+white reachable glow */
.hex.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.22) inset,
    0 0 18px rgba(255,255,255,.55),
    0 0 44px rgba(140,220,255,.55),
    0 0 110px rgba(120,210,255,.35);
  filter: brightness(1.70);
  z-index: 20;
}

/* ✅ modest change: BIG green+white player glow */
.hex.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.26) inset,
    0 0 18px rgba(255,255,255,.50),
    0 0 52px rgba(120,255,170,.62),
    0 0 120px rgba(120,255,170,.38);
  filter: brightness(1.75);
  z-index: 20;
}
.hex.sel{ outline: 2px solid rgba(255,255,255,.55); outline-offset: 2px; }

/* DICE */
.diceArea{ display:grid; justify-items:center; gap: 14px; padding-top: 0; position: relative; z-index: 70; }

.diceCubeWrap{
  width: 460px;
  height: 360px;
  display:grid;
  place-items:center;
  perspective: 1000px;
  position: relative;
}
.diceCube{
  --s: 294px;
  width: var(--s);
  height: var(--s);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 650ms cubic-bezier(.2,.9,.2,1);
}
.diceCube.glowSix{
  box-shadow:
    0 0 18px rgba(220,245,255,.95),
    0 0 42px rgba(120,210,255,.85),
    0 0 80px rgba(255,255,255,.65);
  filter:
    drop-shadow(0 0 12px rgba(160,230,255,.95))
    drop-shadow(0 0 22px rgba(255,255,255,.75));
}

.diceCube.isSpinning{ transition: transform 900ms cubic-bezier(.12,.85,.18,1); }
.diceCube.isDragging{ transition: none !important; }

.diceFace{
  position:absolute;
  inset:0;
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 22px 50px rgba(0,0,0,.16);
  backdrop-filter: blur(8px);
  overflow:hidden;
}

/* Stationary  control */
.orbit{
  position: absolute;
  right: 22px;
  bottom: 18px;
  width: 74px;
  height: 74px;
  border-radius: 999px;
  z-index: 5; /* ✅ slightly above cube if overlap */
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.85), rgba(160,220,255,.50) 40%, rgba(40,120,255,.20) 70%, rgba(0,0,0,.10) 100%);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.22) inset,
    0 18px 40px rgba(0,0,0,.22),
    0 0 30px rgba(160,220,255,.28);
  backdrop-filter: blur(6px);
}
.orbitSphere:hover{
  filter: brightness(1.05);
}
.orbitSphere.isDragging{
  box-shadow:
    0 0 0 1px rgba(255,255,255,.26) inset,
    0 22px 50px rgba(0,0,0,.26),
    0 0 44px rgba(180,235,255,.40);
}

/* FLAME BORDER CORNERS */
.diceCorner{
  position:absolute;
  width: 46%;
  aspect-ratio: 1 / 1;
  pointer-events:none;
  z-index: 20;

  background-image: var(--diceBorderImg);
  background-repeat: no-repeat;
  background-size: contain;
  background-position: top left;

  opacity: 0.92;
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 10px rgba(255,60,0,.30));
}
.diceCorner.tl{ top: 0; left: 0; transform: rotate(0deg); }
.diceCorner.tr{ top: 0; right: 0; transform: rotate(90deg); }
.diceCorner.br{ bottom: 0; right: 0; transform: rotate(180deg); }
.diceCorner.bl{ bottom: 0; left: 0; transform: rotate(270deg); }

.faceStripe{
  position:absolute;
  left: 18px;
  right: 18px;
  top: 14px;
  height: 6px;
  border-radius: 999px;
  opacity: .95;
  z-index: 6;
  pointer-events:none;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,.25));
}

.diceFaceInnerFixed{
  position:absolute;
  width: 260px;
  height: 260px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 14px;
  background: rgba(0,0,0,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
  display:grid;
  place-items:center;
  overflow:hidden;
}

/* ✅ change #5: mini scale slightly reduced */
.miniFit{
  transform: scale(var(--miniScale, 1.42));
  transform-origin: center;
  display: grid;
  place-items: center;
}

.faceFront { transform: translateZ(calc(var(--s) / 2)); }
.faceBack  { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.faceRight { transform: rotateY(90deg) translateZ(calc(var(--s) / 2)); }
.faceLeft  { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.faceTop   { transform: rotateX(90deg) translateZ(calc(var(--s) / 2)); }
.faceBottom{ transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }

.diceControls{
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255,255,255,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 40px rgba(0,0,0,.14);
  backdrop-filter: blur(10px);
}
.diceReadout{ font-weight: 1000; font-size: 16px; color: rgba(255,255,255,.92); }
.diceReadout.subtle{ opacity: .85; }

.miniInvalid{
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.16);
  color: rgba(255,255,255,.88);
  font-weight: 1000;
}

/* HUD faces */
.diceHud{
  position:absolute;
  inset: 14px;
  border-radius: 14px;
  background: rgba(0,0,0,.16);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
  padding: 12px;
  color: rgba(255,255,255,.92);
  display:flex;
  flex-direction: column;
  gap: 10px;
  overflow:hidden;
  z-index: 5;
}
.hudTitle{ font-weight: 1000; letter-spacing: .2px; opacity: .95; }
.hudRow{ display:flex; justify-content: space-between; align-items:center; gap: 10px; font-weight: 900; }
.hudKey{ opacity: .85; }
.hudVal{ font-weight: 1000; }
.hudVal.ok{ color: rgba(140,255,170,.95); }
.hudVal.bad{ color: rgba(255,160,160,.95); }
.hudNote{ margin-top: 2px; opacity: .82; font-weight: 900; font-size: 12px; }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.hudLog{ display:flex; flex-direction: column; gap: 6px; overflow:hidden; }
.hudLogLine{ display:grid; grid-template-columns: 46px 1fr; gap: 8px; font-size: 12px; line-height: 1.15; font-weight: 900; opacity: .95; }
.hudTime{ opacity: .75; }
.hudLogLine.ok .hudMsg{ color: rgba(140,255,170,.95); }
.hudLogLine.bad .hudMsg{ color: rgba(255,160,160,.95); }
.hudLogEmpty{ opacity: .75; font-weight: 900; font-size: 12px; }

.invGrid{ display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.invSlot{
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 1px rgba(0,0,0,.22) inset;
  padding: 10px;
  cursor: pointer;
  color: rgba(255,255,255,.92);
  display:flex;
  gap: 10px;
  align-items:center;
}
.invSlot:disabled{ opacity: .55; cursor: not-allowed; }
.invIcon{ font-size: 22px; }
.invMeta{ display:flex; flex-direction: column; gap: 2px; }
.invName{ font-weight: 1000; font-size: 12px; }
.invCharges{ font-weight: 1000; opacity: .80; font-size: 12px; }

/* Dice images */
.diceImgWrap{
  position:absolute;
  inset: 16px;
  border-radius: 14px;
  background: rgba(0,0,0,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
  display:grid;
  place-items:center;
}
.diceImg{
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select:none;
  pointer-events:none;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,.20));
}

@media (max-width: 980px){
  .scrollInner{ min-width: 1200px; }
}
`;
