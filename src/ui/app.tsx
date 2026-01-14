// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./appBase.css";
import "./app.css";


import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, type ReachMap } from "../engine/api";
import { ROW_LENS, enterLayer, revealHex } from "../engine/board";
import { neighborIdsSameLayer } from "../engine/neighbors";

/* =========================================================
   Template Flow
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
   Villain triggers
========================================================= */
type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";

type VillainTrigger = {
  key: VillainKey;
  layer: number;
  row: number; // 0-based
  cols?: "any" | number[]; // 0-based
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

const PLAYER_PRESETS = [
  { id: "p1", name: "Aeris" },
  { id: "p2", name: "Devlan" },
];

function rotForRoll(n: number) {
  switch (n) {
    case 1: return { x: -90, y: 0 };
    case 2: return { x: 0, y: 0 };
    case 3: return { x: 0, y: -90 };
    case 4: return { x: 0, y: 90 };
    case 5: return { x: 0, y: 180 };
    case 6: return { x: 90, y: 0 };
    default: return { x: 0, y: 0 };
  }
}

/** ✅ 3-second hold on rolling a 6 */
const SIX_HOLD_MS = 3000;

/** ✅ Start pose: shows (above / current / below) like at game start */
const BASE_DICE_VIEW = { x: -28, y: -36 };

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");

  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);
  const world = useMemo(() => worlds.find((w) => w.id === worldId) ?? null, [worlds, worldId]);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioEntry = useMemo(() => world?.scenarios.find((s) => s.id === scenarioId) ?? null, [world, scenarioId]);

  const [trackId, setTrackId] = useState<string | null>(null);
  const trackEntry = useMemo(() => {
    const tracks = scenarioEntry?.tracks;
    if (!tracks || tracks.length <= 0) return null;
    return tracks.find((t) => t.id === trackId) ?? null;
  }, [scenarioEntry, trackId]);

  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reachMap, setReachMap] = useState<ReachMap>({} as ReachMap);
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(reachMap as any)) if ((v as any)?.reachable) set.add(k);
    return set;
  }, [reachMap]);

  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const encounterActive = !!encounter;

  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME_BG_URL = activeTheme?.assets.backgroundGame ?? "";
  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "";

  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [movesTaken, setMovesTaken] = useState(0);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [optimalAtStart, setOptimalAtStart] = useState<number | null>(null);
  const [optimalFromNow, setOptimalFromNow] = useState<number | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);
  const logNRef = useRef(0);
  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    logNRef.current += 1;
    const e: LogEntry = { n: logNRef.current, t: nowHHMM(), msg, kind };
    setLog((prev) => [e, ...prev].slice(0, 24));
  }, []);

  type ItemId = "reroll" | "revealRing" | "peek";
  type Item = { id: ItemId; name: string; icon: string; charges: number };
  const [items, setItems] = useState<Item[]>([
    { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
    { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
    { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
  ]);

  const [rollValue, setRollValue] = useState<number>(1);

  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>(BASE_DICE_VIEW);
  const [diceSpinning, setDiceSpinning] = useState(false);

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

  // ---------------------------------------------------------
  // 🎬 SIX CINEMATIC STATE
  // ---------------------------------------------------------
  const [sixHoldActive, setSixHoldActive] = useState(false);
  const [sixVsVillain, setSixVsVillain] = useState(false);
  const sixTimerRef = useRef<number | null>(null);

  const cancelSixHold = useCallback(() => {
    if (sixTimerRef.current) {
      window.clearTimeout(sixTimerRef.current);
      sixTimerRef.current = null;
    }
    setSixHoldActive(false);
    setSixVsVillain(false);
  }, []);

  const beginSixHold = useCallback(
    (opts: { vsVillain: boolean }) => {
      cancelSixHold();

      setSixHoldActive(true);
      setSixVsVillain(opts.vsVillain);

      sixTimerRef.current = window.setTimeout(() => {
        // end cinematic
        setSixHoldActive(false);
        setSixVsVillain(false);

        // reset cube to start pose (above/current/below)
        setDiceRot(BASE_DICE_VIEW);
        setDiceSpinning(false);
        setDiceDragging(false);

        // clear encounter AFTER the 3s overwhelm if it was vs villain
        if (opts.vsVillain) setEncounter(null);

        sixTimerRef.current = null;
      }, SIX_HOLD_MS);
    },
    [cancelSixHold]
  );

  useEffect(() => {
    return () => {
      if (sixTimerRef.current) window.clearTimeout(sixTimerRef.current);
    };
  }, []);

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
    if (sixHoldActive) return;

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

    // ✅ 6: pause 3s showing the 6, and if vs villain do glow/fade/overwhelm
    if (n === 6) {
      beginSixHold({ vsVillain: encounterActive });
      return;
    }

    // Encounter: non-6 increments tries
    setEncounter((prev) => {
      if (!prev) return prev;
      return { ...prev, tries: prev.tries + 1 };
    });
  }, [beginSixHold, encounterActive, pushLog, sixHoldActive]);

  const onDicePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (diceSpinning) return;
      if (sixHoldActive) return;

      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      dragRef.current.active = true;
      dragRef.current.pointerId = e.pointerId;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      dragRef.current.startRotX = diceRot.x;
      dragRef.current.startRotY = diceRot.y;

      setDiceDragging(true);
    },
    [diceRot.x, diceRot.y, diceSpinning, encounterActive, sixHoldActive]
  );

  const onDicePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (sixHoldActive) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const sens = 0.35;
      const nextY = dragRef.current.startRotY + dx * sens;
      const nextX = dragRef.current.startRotX - dy * sens;

      setDiceRot({ x: nextX, y: nextY });
    },
    [encounterActive, sixHoldActive]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (encounterActive) return;
      if (sixHoldActive) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = -1;
      setDiceDragging(false);
    },
    [encounterActive, sixHoldActive]
  );

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

    cancelSixHold();

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
  }, [scenarioEntry, trackEntry, parseVillainsFromScenario, revealWholeLayer, computeOptimalFromReachMap, pushLog, cancelSixHold]);

  const tryMoveToId = useCallback(
    (id: string) => {
      setMovesTaken((m) => m + 1);

      if (sixHoldActive) return;
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
    [state, currentLayer, encounterActive, revealWholeLayer, pushLog, computeOptimalFromReachMap, goalId, villainTriggers, sixHoldActive]
  );

  const useItem = useCallback(
    (id: "reroll" | "revealRing" | "peek") => {
      if (sixHoldActive) return;

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
    [items, state, currentLayer, scenarioLayerCount, rollDice, pushLog, revealRing, sixHoldActive]
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

  return (
    <div className="appRoot" style={cssVars}>
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
                  if (tracks.length > 1) {
                    setScreen("difficulty");
                  } else {
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

      {screen === "game" ? (
        <div className="shell shellGame">
          {/* blackout z-layer (fade out ONLY during 6-vs-villain hold) */}
          {encounterActive ? <div className={"blackout" + (sixHoldActive && sixVsVillain ? " fadeOut" : "")} aria-hidden="true" /> : null}

          {encounterActive ? (
            <div className="villainCenter">
              <img className={"villainImg" + (sixHoldActive && sixVsVillain ? " glowIn" : "")} src={villainImg(encounter!.villainKey)} alt={encounter!.villainKey} />
              <div className="villainText">Roll a 6 to continue</div>

              <button className="btn primary" onClick={rollDice} disabled={sixHoldActive}>
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

                <DicePanel
                  encounterActive={encounterActive}
                  diceSpinning={diceSpinning}
                  diceDragging={diceDragging}
                  diceRot={diceRot}
                  onDicePointerDown={onDicePointerDown}
                  onDicePointerMove={onDicePointerMove}
                  endDrag={endDrag}
                  diceImg={diceImg}
                  rollValue={rollValue}
                  stripeAbove={stripeAbove}
                  stripeCurr={stripeCurr}
                  stripeBelow={stripeBelow}
                  belowLayer={belowLayer}
                  miniAboveLayer={miniAboveLayer}
                  miniCurrLayer={miniCurrLayer}
                  miniBelowLayer={miniBelowLayer}
                  scenarioLayerCount={scenarioLayerCount}
                  state={state}
                  miniAboveReach={miniAboveReach}
                  miniCurrReach={miniCurrReach}
                  miniBelowReach={miniBelowReach}
                  movesTaken={movesTaken}
                  optimalAtStart={optimalAtStart}
                  optimalFromNow={optimalFromNow}
                  delta={delta}
                  goalId={goalId}
                  log={log}
                  items={items}
                  useItem={useItem}
                  setScreen={setScreen}
                  setState={setState}
                  setEncounter={setEncounter}
                  sixHoldActive={sixHoldActive}
                  sixVsVillain={sixVsVillain}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   DicePanel
========================================================= */
function DicePanel(props: any) {
  const {
    encounterActive,
    diceSpinning,
    diceDragging,
    diceRot,
    onDicePointerDown,
    onDicePointerMove,
    endDrag,
    diceImg,
    rollValue,
    stripeAbove,
    stripeCurr,
    stripeBelow,
    belowLayer,
    miniAboveLayer,
    miniCurrLayer,
    miniBelowLayer,
    scenarioLayerCount,
    state,
    miniAboveReach,
    miniCurrReach,
    miniBelowReach,
    movesTaken,
    optimalAtStart,
    optimalFromNow,
    delta,
    goalId,
    log,
    items,
    useItem,
    setScreen,
    setState,
    setEncounter,
    sixHoldActive,
    sixVsVillain,
  } = props;

  return (
    <div className="diceArea">
      <div className="diceCubeWrap" aria-label="Layer dice">
        <div
          className={
            "diceCube" +
            (diceSpinning ? " isSpinning" : "") +
            (diceDragging ? " isDragging" : "") +
            (sixHoldActive && sixVsVillain ? " glowCube" : "")
          }
          onPointerDown={onDicePointerDown}
          onPointerMove={onDicePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            transform: `translateY(70px) rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)`,
            touchAction: encounterActive || sixHoldActive ? "auto" : "none",
            cursor: encounterActive || sixHoldActive ? "default" : diceDragging ? "grabbing" : "grab",
            pointerEvents: sixHoldActive ? "none" : "auto",
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
              <div className="diceFace faceTop">
                <div className="faceStripe" style={{ background: stripeAbove }} />
                <div className="diceFaceInnerFixed">
                  <div className="miniFit">
                    <HexBoard kind="mini" activeLayer={miniAboveLayer} maxLayer={scenarioLayerCount} state={state} selectedId={null} reachable={miniAboveReach.reachable} reachMap={miniAboveReach.reachMap} showCoords={false} onCellClick={undefined} showPlayerOnMini />
                  </div>
                </div>
              </div>

              <div className="diceFace faceFront">
                <div className="faceStripe" style={{ background: stripeCurr }} />
                <div className="diceFaceInnerFixed">
                  <div className="miniFit">
                    <HexBoard kind="mini" activeLayer={miniCurrLayer} maxLayer={scenarioLayerCount} state={state} selectedId={null} reachable={miniCurrReach.reachable} reachMap={miniCurrReach.reachMap} showCoords={false} onCellClick={undefined} showPlayerOnMini />
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
                      <HexBoard kind="mini" activeLayer={miniBelowLayer} maxLayer={scenarioLayerCount} state={state} selectedId={null} reachable={miniBelowReach.reachable} reachMap={miniBelowReach.reachMap} showCoords={false} onCellClick={undefined} showPlayerOnMini />
                    </div>
                  )}
                </div>
              </div>

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
                    <span className={"hudVal " + (delta == null ? "" : delta <= 0 ? "ok" : "bad")}>{delta == null ? "—" : delta}</span>
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
                    {log.slice(0, 7).map((e: any) => (
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
                    {items.map((it: any) => (
                      <button key={it.id} className="invSlot" onClick={() => useItem(it.id)} disabled={it.charges <= 0 || sixHoldActive} title={`${it.name} (${it.charges})`}>
                        <div className="invIcon">{it.icon}</div>
                        <div className="invMeta">
                          <div className="invName">{it.name}</div>
                          <div className="invCharges">{it.charges}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="hudNote">Drag to rotate • Tap items to use</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ✅ 3-second pause: big “6” overlay */}
        {sixHoldActive ? (
          <div className={"diceSixOverlay" + (sixVsVillain ? " glow" : "")} aria-hidden="true">
            <div className="diceSixCard">
              <img className="diceSixImg" src={diceImg(6)} alt="Rolled 6" draggable={false} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="diceControls">
        {encounterActive ? <div className="diceReadout">Roll = {rollValue}</div> : <div className="diceReadout subtle">Drag to rotate</div>}
      </div>

      <div className="dragHint">{sixHoldActive ? "Showing roll…" : encounterActive ? "Encounter: roll a 6 to continue" : "Board Mode: Drag rotation onlyotation only"}</div>

      <div className="row rowBetween" style={{ marginTop: 12 }}>
        <button
          className="btn"
          disabled={sixHoldActive}
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
  );
}

/* =========================================================
   Dice corners
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
