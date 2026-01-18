// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, type ReachMap } from "../engine/api";
import { ROW_LENS, enterLayer, revealHex } from "../engine/board";
import { neighborIdsSameLayer } from "../engine/neighbors";

/* =========================================================
   Template Flow
   Start -> World -> Character -> Scenario -> Game
========================================================= */
type Screen = "start" | "world" | "character" | "scenario" | "game";

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
    backgroundGame?: string;

    backgroundLayers?: Partial<{
      L1: string;
      L2: string;
      L3: string;
      L4: string;
      L5: string;
      L6: string;
      L7: string;
    }>;

    diceFacesBase: string;
    diceCornerBorder: string;
    villainsBase: string;

    hexTile?: string;
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

/** If scenario/newGame doesn't provide a start tile, choose a safe one. */
function findFirstPlayableHexId(st: GameState, layer: number): string {
  for (let r = 0; r < ROW_LENS.length; r++) {
    const len = ROW_LENS[r] ?? 7;
    for (let c = 0; c < len; c++) {
      const id = `L${layer}-R${r}-C${c}`;
      const hex = getHexFromState(st, id) as any;
      if (!hex) continue;
      if (hex.missing) continue;
      if (hex.blocked) continue;
      return id;
    }
  }
  return `L${layer}-R0-C0`;
}

/** Facing from movement direction (for sprite rows). */
function facingFromMove(fromId: string | null, toId: string | null): "down" | "up" | "left" | "right" {
  const a = fromId ? idToCoord(fromId) : null;
  const b = toId ? idToCoord(toId) : null;
  if (!a || !b) return "down";
  if (a.layer !== b.layer) return "down";

  const dRow = b.row - a.row;
  const dCol = b.col - a.col;

  if (Math.abs(dCol) >= Math.abs(dRow)) return dCol > 0 ? "right" : dCol < 0 ? "left" : "down";
  return dRow > 0 ? "down" : "up";
}

/* =========================================================
   Minimal players (template)
========================================================= */
const PLAYER_PRESETS: Array<{ id: string; name: string }> = [
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
  const [, forceRender] = useState(0);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // sprite facing
  const [playerFacing, setPlayerFacing] = useState<"down" | "up" | "left" | "right">("down");

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

  // palette + assets for the active scenario
  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME_BG_URL = activeTheme?.assets.backgroundGame ?? "";
  const BOARD_LAYER_BG = (activeTheme?.assets.backgroundLayers as any)?.[`L${currentLayer}`] ?? "";
  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "";
  const HEX_TILE = activeTheme?.assets.hexTile ?? "";

  // layer count from scenario JSON (loaded when starting)
  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);

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

  const belowLayer = currentLayer - 1;
  const aboveLayer = currentLayer + 1;

  useEffect(() => {
    setWorlds(loadWorlds());
  }, []);

  /* --------------------------
     Helpers that use theme assets
  -------------------------- */
  function diceImg(n: number) {
    // Your assets look like: `${diceFacesBase}/D20_1.png` etc
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

  /* --------------------------
     Game helpers (reveal / optimal / parse villains)
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

    // NOTE: your engine may be neighborIdsSameLayer(centerId) or neighborIdsSameLayer(st, centerId)
    // We try both to be safe.
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

  /* --------------------------
     Start scenario
  -------------------------- */
  const startScenario = useCallback(async () => {
    if (!scenarioEntry) return;

    const tracks = scenarioEntry.tracks ?? [];
    const hasTracks = tracks.length > 1;
    const chosenJson = hasTracks ? trackEntry?.scenarioJson ?? scenarioEntry.scenarioJson : scenarioEntry.scenarioJson;

    const s = (await loadScenario(chosenJson)) as any;

    setVillainTriggers(parseVillainsFromScenario(s));
    setEncounter(null);

    const st = newGame(s);

    // ensure layer count
    const layerCount = Math.max(1, Number(s?.layers ?? 1));
    setScenarioLayerCount(layerCount);

    // ensure player start exists
    let pid = (st as any).playerHexId as string | null;
    let layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;
    layer = Math.max(1, Math.min(layerCount, layer));

    if (!pid || !/^L\d+-R\d+-C\d+$/.test(pid)) {
      pid = findFirstPlayableHexId(st, layer);
      (st as any).playerHexId = pid;
    }

    // clamp pid to valid layer
    const pidCoord = idToCoord(pid);
    if (pidCoord) layer = Math.max(1, Math.min(layerCount, pidCoord.layer));

    const gid = findGoalId(s, layer);
    setGoalId(gid);

    // enter/reveal before reachability
    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    // compute reachability AFTER player start is guaranteed
    const rm = getReachability(st) as any;
    setReachMap(rm);

    setState(st);
    setSelectedId(pid);
    setCurrentLayer(layer);
    setPlayerFacing("down");

    setMovesTaken(0);
    setOptimalAtStart(computeOptimalFromReachMap(rm as any, gid));
    setOptimalFromNow(computeOptimalFromReachMap(rm as any, gid));

    logNRef.current = 0;
    setLog([]);
    pushLog(`Started: ${scenarioEntry.name}`, "ok");
    if (pid) pushLog(`Start: ${pid}`, "info");
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
  }, [scenarioEntry, trackEntry, parseVillainsFromScenario, revealWholeLayer, computeOptimalFromReachMap, pushLog]);

  /* --------------------------
     Dice state
  -------------------------- */
  const [diceValue, setDiceValue] = useState<number>(2);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const diceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (diceTimer.current) window.clearTimeout(diceTimer.current);
    };
  }, []);

  const rollDice = useCallback(
    (opts?: { reason?: "normal" | "encounter" | "reroll" }) => {
      if (diceRolling) return;
      setDiceRolling(true);

      const reason = opts?.reason ?? "normal";
      if (reason === "reroll") pushLog("Reroll used — rolling…", "info");
      else if (reason === "encounter") pushLog("Encounter roll…", "bad");
      else pushLog("Rolling…", "info");

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
          setDiceValue(final);
          setDiceRot(rotForRoll(final));
          setDiceRolling(false);
          pushLog(`Dice: ${final}`, "ok");

          // resolve encounter if active
          if (encounterActive) {
            if (final === 6) {
              pushLog(`Success — you may continue.`, "ok");
              setEncounter(null);
            } else {
              setEncounter((prev) => (prev ? { ...prev, tries: prev.tries + 1 } : prev));
              pushLog(`Need a 6. Try again.`, "bad");
            }
          }
        }
      };

      tick();
    },
    [diceRolling, pushLog, encounterActive]
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
        rollDice({ reason: "reroll" });
        return;
      }

      if (!state) return;
      const pid = (state as any).playerHexId ?? null;
      if (!pid) return;

      if (id === "revealRing") {
        revealRing(state, pid);
        setReachMap(getReachability(state) as any);
        forceRender((n) => n + 1);
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
        forceRender((n) => n + 1);
        pushLog("Used: Peek (above/below ring)", "info");
        return;
      }
    },
    [items, state, currentLayer, scenarioLayerCount, pushLog, revealRing, rollDice]
  );

  /* --------------------------
     Board click / move
  -------------------------- */
  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;
      if (encounterActive) return;

      const hex = getHexFromState(state, id) as any;
      const { blocked, missing } = isBlockedOrMissing(hex);
      if (missing) {
        pushLog("Missing tile.", "bad");
        return;
      }
      if (blocked) {
        pushLog("Blocked tile.", "bad");
        return;
      }

      // villain encounter tile
      const vk = findTriggerForHex(id);
      if (vk) {
        setEncounter({ villainKey: vk, tries: 0 });
        pushLog(`Encounter: ${vk} — roll a 6 to continue`, "bad");
        return;
      }

      const pidBefore = (state as any).playerHexId as string | null;

      // allow clicking current tile even if not in reachable set
      if (pidBefore !== id && !reachable.has(id)) {
        pushLog("Not reachable.", "bad");
        return;
      }

      const res: any = tryMove(state as any, id);
      const nextState: any = res?.state ?? res ?? null;
      if (!nextState) return;

      const pidAfter = (nextState as any).playerHexId as string | null;

      if (pidBefore && pidAfter && pidAfter !== pidBefore) {
        setMovesTaken((n) => n + 1);
      }

      setPlayerFacing(facingFromMove(pidBefore, pidAfter));

      setState(nextState);
      setSelectedId(pidAfter ?? id);

      const c2 = pidAfter ? idToCoord(pidAfter) : null;
      const nextLayer = c2?.layer ?? currentLayer;

      if (nextLayer !== currentLayer) {
        setCurrentLayer(nextLayer);
        enterLayer(nextState, nextLayer);
        revealWholeLayer(nextState, nextLayer);
      }

      const rm = getReachability(nextState) as any;
      setReachMap(rm);
      setOptimalFromNow(computeOptimalFromReachMap(rm as any, goalId));

      pushLog(`Moved to ${pidAfter ?? id}`, "ok");

      // win check (best effort)
      if (goalId && pidAfter && pidAfter === goalId) {
        pushLog("Goal reached!", "ok");
      }
    },
    [
      state,
      encounterActive,
      pushLog,
      findTriggerForHex,
      reachable,
      currentLayer,
      revealWholeLayer,
      computeOptimalFromReachMap,
      goalId,
    ]
  );

  /* --------------------------
     Navigation / reset
  -------------------------- */
  const resetAll = useCallback(() => {
    setScreen("start");
    setWorldId(null);
    setScenarioId(null);
    setTrackId(null);
    setChosenPlayer(null);

    setState(null);
    setCurrentLayer(1);
    setSelectedId(null);
    setReachMap({} as any);

    setVillainTriggers([]);
    setEncounter(null);

    setGoalId(null);
    setOptimalAtStart(null);
    setOptimalFromNow(null);
    setMovesTaken(0);

    logNRef.current = 0;
    setLog([]);

    setItems([
      { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
      { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
      { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
    ]);
  }, []);

  /* --------------------------
     CSS vars from theme palette
  -------------------------- */
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

  /* =========================================================
     RENDER HELPERS
  ========================================================= */
  const layerRows = useMemo(() => ROW_LENS.length, []);
  const rows = useMemo(() => Array.from({ length: layerRows }, (_, i) => i), [layerRows]);

  function hexId(layer: number, r: number, c: number) {
    return `L${layer}-R${r}-C${c}`;
  }

  function isPlayerHere(id: string) {
    const pid = (state as any)?.playerHexId as string | null;
    return !!pid && pid === id;
  }

  /* =========================================================
     Screens
  ========================================================= */
  if (screen === "start") {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="screen center">
          <div className="panel">
            <div className="title">Hex Game</div>
            <div className="sub">Start → World → Character → Scenario → Game</div>

            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setScreen("world");
                }}
              >
                Start
              </button>
              <button className="btn" onClick={resetAll}>
                Reset
              </button>
            </div>

            <div className="hint">
              Worlds loaded: <b>{worlds.length}</b>
            </div>
          </div>
        </div>

        <style>{baseCss}</style>
      </div>
    );
  }

  if (screen === "world") {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button className="btn" onClick={() => setScreen("start")}>
            ← Back
          </button>
          <div className="spacer" />
          <button className="btn" onClick={resetAll}>
            Reset
          </button>
        </div>

        <div className="screen center">
          <div className="panel wide">
            <div className="title">Choose World</div>
            <div className="grid">
              {worlds.map((w) => {
                const active = w.id === worldId;
                return (
                  <button
                    key={w.id}
                    className={`card ${active ? "active" : ""}`}
                    style={{ borderColor: active ? w.menu?.solidColor ?? "rgba(255,255,255,.2)" : undefined }}
                    onClick={() => {
                      setWorldId(w.id);
                      setScenarioId(null);
                      setTrackId(null);
                    }}
                  >
                    <div className="cardTitle">{w.name}</div>
                    <div className="cardDesc">{w.desc ?? w.id}</div>
                  </button>
                );
              })}
            </div>

            <div className="row">
              <button className="btn" onClick={() => setScreen("start")}>
                Back
              </button>
              <button className="btn primary" disabled={!worldId} onClick={() => setScreen("character")}>
                Continue
              </button>
            </div>
          </div>
        </div>

        <style>{baseCss}</style>
      </div>
    );
  }

  if (screen === "character") {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button className="btn" onClick={() => setScreen("world")}>
            ← Back
          </button>
          <div className="spacer" />
          <button className="btn" onClick={resetAll}>
            Reset
          </button>
        </div>

        <div className="screen center">
          <div className="panel wide">
            <div className="title">Choose Character</div>

            <div className="grid">
              {PLAYER_PRESETS.map((p) => {
                const active = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                return (
                  <button
                    key={p.id}
                    className={`card ${active ? "active" : ""}`}
                    onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                  >
                    <div className="cardTitle">{p.name}</div>
                    <div className="cardDesc">Preset</div>
                  </button>
                );
              })}

              <button
                className={`card ${chosenPlayer?.kind === "custom" ? "active" : ""}`}
                onClick={() => setChosenPlayer({ kind: "custom", name: "Custom", imageDataUrl: null })}
              >
                <div className="cardTitle">Custom</div>
                <div className="cardDesc">Upload an image</div>
              </button>
            </div>

            {chosenPlayer?.kind === "custom" ? (
              <div className="customBox">
                <label className="lbl">Name</label>
                <input
                  className="inp"
                  value={chosenPlayer.name}
                  onChange={(e) => setChosenPlayer((prev) => (prev && prev.kind === "custom" ? { ...prev, name: e.target.value } : prev))}
                />
                <label className="lbl">Portrait (optional)</label>
                <input
                  className="inp"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    const fr = new FileReader();
                    fr.onload = () => {
                      const url = typeof fr.result === "string" ? fr.result : null;
                      setChosenPlayer((prev) => (prev && prev.kind === "custom" ? { ...prev, imageDataUrl: url } : prev));
                    };
                    fr.readAsDataURL(file);
                  }}
                />
                {chosenPlayer.imageDataUrl ? <img className="portrait" src={chosenPlayer.imageDataUrl} alt="portrait" /> : null}
              </div>
            ) : null}

            <div className="row">
              <button className="btn" onClick={() => setScreen("world")}>
                Back
              </button>
              <button className="btn primary" disabled={!chosenPlayer} onClick={() => setScreen("scenario")}>
                Continue
              </button>
            </div>
          </div>
        </div>

        <style>{baseCss}</style>
      </div>
    );
  }

  if (screen === "scenario") {
    const scenarios = world?.scenarios ?? [];
    const tracks = scenarioEntry?.tracks ?? [];
    const showTracks = tracks.length > 1;

    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button className="btn" onClick={() => setScreen("character")}>
            ← Back
          </button>
          <div className="spacer" />
          <button className="btn" onClick={resetAll}>
            Reset
          </button>
        </div>

        <div className="screen center">
          <div className="panel wide">
            <div className="title">Choose Scenario</div>

            <div className="grid">
              {scenarios.map((s) => {
                const active = s.id === scenarioId;
                return (
                  <button
                    key={s.id}
                    className={`card ${active ? "active" : ""}`}
                    onClick={() => {
                      setScenarioId(s.id);
                      setTrackId(null);
                    }}
                  >
                    <div className="cardTitle">{s.name}</div>
                    <div className="cardDesc">{s.desc ?? s.id}</div>
                  </button>
                );
              })}
            </div>

            {scenarioEntry && showTracks ? (
              <div className="tracks">
                <div className="tracksTitle">Tracks</div>
                <div className="tracksRow">
                  {tracks.map((t) => {
                    const active = t.id === trackId;
                    return (
                      <button key={t.id} className={`chip ${active ? "active" : ""}`} onClick={() => setTrackId(t.id)}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="row">
              <button className="btn" onClick={() => setScreen("character")}>
                Back
              </button>
              <button className="btn primary" disabled={!scenarioEntry} onClick={startScenario}>
                Start Game
              </button>
            </div>
          </div>
        </div>

        <style>{baseCss}</style>
      </div>
    );
  }

  /* =========================================================
     GAME SCREEN
  ========================================================= */
  const pid = (state as any)?.playerHexId as string | null;

  const canGoDown = belowLayer >= 1;
  const canGoUp = aboveLayer <= scenarioLayerCount;

  return (
    <div className="appRoot game" style={themeVars}>
      {/* Background */}
      <div
        className="gameBg"
        style={{
          backgroundImage: GAME_BG_URL ? `url(${toPublicUrl(GAME_BG_URL)})` : undefined,
        }}
      />

      <div className="topbar">
        <button className="btn" onClick={() => setScreen("scenario")}>
          ↺ Setup
        </button>
        <button className="btn" onClick={resetAll}>
          Reset
        </button>

        <div className="spacer" />

        <div className="pill">
          <span className="dot" />
          <span className="pillText">
            {world?.name ?? "World"} • {scenarioEntry?.name ?? "Scenario"} • L{currentLayer} • Moves {movesTaken}
          </span>
        </div>

        <div className="spacer" />

        <button
          className="btn"
          disabled={!state || !canGoDown || encounterActive}
          onClick={() => {
            if (!state) return;
            const next = Math.max(1, currentLayer - 1);
            setCurrentLayer(next);
            enterLayer(state, next);
            revealWholeLayer(state, next);
            setReachMap(getReachability(state) as any);
            pushLog(`Layer ${next}`, "info");
          }}
        >
          − Layer
        </button>
        <button
          className="btn"
          disabled={!state || !canGoUp || encounterActive}
          onClick={() => {
            if (!state) return;
            const next = Math.min(scenarioLayerCount, currentLayer + 1);
            setCurrentLayer(next);
            enterLayer(state, next);
            revealWholeLayer(state, next);
            setReachMap(getReachability(state) as any);
            pushLog(`Layer ${next}`, "info");
          }}
        >
          + Layer
        </button>
      </div>

      <div className="gameLayout">
        {/* Board */}
        <div className="boardWrap">
          <div
            className="boardLayerBg"
            style={{
              backgroundImage: BOARD_LAYER_BG ? `url(${toPublicUrl(BOARD_LAYER_BG)})` : undefined,
            }}
          />

          {/* HUD */}
          <div className="hud">
            <div className="hudLeft">
              <button className="btn primary" disabled={!state || diceRolling} onClick={() => rollDice({ reason: encounterActive ? "encounter" : "normal" })}>
                {diceRolling ? "Rolling…" : encounterActive ? "Roll (Need 6)" : "Roll"}
              </button>

              <div className={`dice3d ${diceRolling ? "rolling" : ""}`}>
                <div
                  className="cube"
                  style={{
                    transform: `rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)`,
                  }}
                >
                  <div className="face face-front" style={{ backgroundImage: `url(${diceImg(2)})` }} />
                  <div className="face face-back" style={{ backgroundImage: `url(${diceImg(5)})` }} />
                  <div className="face face-right" style={{ backgroundImage: `url(${diceImg(3)})` }} />
                  <div className="face face-left" style={{ backgroundImage: `url(${diceImg(4)})` }} />
                  <div className="face face-top" style={{ backgroundImage: `url(${diceImg(1)})` }} />
                  <div className="face face-bottom" style={{ backgroundImage: `url(${diceImg(6)})` }} />
                </div>

                {/* optional border overlay */}
                {DICE_BORDER_IMG ? <div className="diceBorder" style={{ backgroundImage: `url(${toPublicUrl(DICE_BORDER_IMG)})` }} /> : null}
              </div>

              <div className="hudStat">
                <div className="k">Dice</div>
                <div className="v">{diceValue}</div>
              </div>

              <div className="hudStat">
                <div className="k">Facing</div>
                <div className="v">{playerFacing}</div>
              </div>

              <div className="hudStat">
                <div className="k">Goal</div>
                <div className="v">{goalId ? goalId : "—"}</div>
              </div>

              <div className="hudStat">
                <div className="k">Optimal</div>
                <div className="v">
                  {optimalFromNow ?? "—"}{" "}
                  <span className="mutedSmall">{optimalAtStart != null ? `(start ${optimalAtStart})` : ""}</span>
                </div>
              </div>
            </div>

            <div className="hudRight">
              <div className="items">
                {items.map((it) => (
                  <button
                    key={it.id}
                    className={`itemBtn ${it.charges <= 0 ? "off" : ""}`}
                    disabled={it.charges <= 0 || !state || (encounterActive && it.id !== "reroll")}
                    onClick={() => useItem(it.id)}
                    title={`${it.name} (${it.charges})`}
                  >
                    <span className="itemIcon">{it.icon}</span>
                    <span className="itemName">{it.name}</span>
                    <span className="itemCharges">{it.charges}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="boardScroll" ref={scrollRef}>
            <div className="board">
              {rows.map((r) => {
                const cols = ROW_LENS[r] ?? 0;
                return (
                  <div key={r} className={`hexRow ${r % 2 === 1 ? "offset" : ""}`}>
                    {Array.from({ length: cols }, (_, c) => {
                      const id = hexId(currentLayer, r, c);
                      const hex = getHexFromState(state, id) as any;
                      const { blocked, missing } = isBlockedOrMissing(hex);

                      if (missing) {
                        return <div key={id} className="hexSlot empty" />;
                      }

                      const isSel = selectedId === id;
                      const isReach = reachable.has(id);
                      const isPlayer = isPlayerHere(id);
                      const isGoal = goalId === id;
                      const isTrigger = !!findTriggerForHex(id);

                      const tileBg = HEX_TILE ? `url(${toPublicUrl(HEX_TILE)})` : "";

                      return (
                        <button
                          key={id}
                          className={[
                            "hex",
                            isSel ? "sel" : "",
                            isReach ? "reach" : "",
                            blocked ? "blocked" : "",
                            isPlayer ? "player" : "",
                            isGoal ? "goal" : "",
                            isTrigger ? "trigger" : "",
                          ].join(" ")}
                          onClick={() => {
                            setSelectedId(id);
                            tryMoveToId(id);
                          }}
                          disabled={!state || blocked || encounterActive}
                          style={{
                            ["--hexGlow" as any]: layerCssVar(currentLayer),
                            backgroundImage: tileBg || undefined,
                          }}
                          title={id}
                        >
                          <div className="hexInner">
                            <div className="hexId">{r},{c}</div>
                            <div className="hexMarks">
                              {isPlayer ? <span className="mark p">P</span> : null}
                              {isGoal ? <span className="mark g">G</span> : null}
                              {isTrigger ? <span className="mark t">!</span> : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="side">
          <div className="panelMini">
            <div className="miniTitle">Status</div>
            <div className="miniRow">
              <span className="k">Player</span>
              <span className="v">{chosenPlayer?.name ?? "—"}</span>
            </div>
            <div className="miniRow">
              <span className="k">Tile</span>
              <span className="v">{pid ?? "—"}</span>
            </div>
            <div className="miniRow">
              <span className="k">Reach</span>
              <span className="v">{reachable.size}</span>
            </div>
            <div className="miniRow">
              <span className="k">Encounter</span>
              <span className="v">{encounterActive ? encounter!.villainKey : "no"}</span>
            </div>
          </div>

          <div className="panelMini">
            <div className="miniTitle">Log</div>
            <div className="log">
              {log.length === 0 ? (
                <div className="mutedSmall">No events yet.</div>
              ) : (
                log.map((e) => (
                  <div key={e.n} className={`logRow ${e.kind ?? "info"}`}>
                    <span className="lt">{e.t}</span>
                    <span className="lm">{e.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Encounter Overlay */}
      {encounterActive ? (
        <div className="overlay">
          <div className="overlayCard">
            <div className="overlayTitle">Encounter</div>
            <div className="overlaySub">
              Villain: <b>{encounter!.villainKey}</b> — roll a <b>6</b> to continue.
            </div>

            <div className="villainBox">
              <img className="villainImg" src={villainImg(encounter!.villainKey)} alt="villain" />
              <div className="villainMeta">
                <div className="miniRow">
                  <span className="k">Tries</span>
                  <span className="v">{encounter!.tries}</span>
                </div>
                <div className="miniRow">
                  <span className="k">Last roll</span>
                  <span className="v">{diceValue}</span>
                </div>
              </div>
            </div>

            <div className="row">
              <button className="btn primary" disabled={diceRolling} onClick={() => rollDice({ reason: "encounter" })}>
                {diceRolling ? "Rolling…" : "Roll"}
              </button>
              <button
                className="btn"
                onClick={() => {
                  // Optional: allow user to close (or keep locked if you want)
                  pushLog("You cannot flee. Roll a 6.", "bad");
                }}
              >
                Flee
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{baseCss}</style>
    </div>
  );
}

/* =========================================================
   Inline CSS for this TSX (single-file friendly)
   You can move this into app.css later.
========================================================= */
const baseCss = `
:root{
  --bg0:#070a10; --bg1:#0b1324;
  --panel: rgba(10,14,24,.72);
  --stroke: rgba(255,255,255,.10);
  --stroke2: rgba(255,255,255,.18);
  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.62);
  --shadow: 0 18px 50px rgba(0,0,0,.45);
  --shadow2: 0 10px 25px rgba(0,0,0,.35);

  --hex: 66px;
  --gapX: 12px;
  --gapY: 14px;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  color: var(--text);
  background:
    radial-gradient(1200px 800px at 20% 10%, rgba(125,255,220,.10), transparent 55%),
    radial-gradient(900px 700px at 80% 20%, rgba(120,150,255,.12), transparent 55%),
    radial-gradient(900px 700px at 50% 90%, rgba(255,220,120,.08), transparent 60%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  overflow:hidden;
}

.appRoot{ height:100vh; width:100vw; position:relative; }

.screen.center{ height: calc(100vh - 64px); display:grid; place-items:center; padding:18px; }
.topbar{
  height:64px; display:flex; align-items:center; gap:10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.08));
  backdrop-filter: blur(10px);
  position:relative; z-index:5;
}
.spacer{ flex:1; }

.panel{
  width: min(980px, 92vw);
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
  backdrop-filter: blur(12px);
}
.panel.wide{ width:min(1040px, 94vw); }

.title{ font-size: 22px; font-weight: 900; letter-spacing: .3px; }
.sub{ margin-top:6px; color: var(--muted); font-size: 13px; }

.row{ display:flex; gap:10px; justify-content:flex-end; margin-top:14px; align-items:center; }
.hint{ margin-top:12px; color: var(--muted); font-size: 13px; }

.btn{
  border: 1px solid var(--stroke);
  background: rgba(255,255,255,.10);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.btn:hover{ background: rgba(255,255,255,.16); border-color: var(--stroke2); transform: translateY(-1px); }
.btn:active{ background: rgba(255,255,255,.22); transform: translateY(0); }
.btn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }

.btn.primary{
  background: rgba(120,220,255,.22);
  border-color: rgba(120,220,255,.35);
}
.btn.primary:hover{ background: rgba(120,220,255,.28); border-color: rgba(120,220,255,.50); }
.btn.primary:active{ background: rgba(120,220,255,.36); }

.grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
@media (max-width: 700px){
  body{ overflow:auto; }
  .grid{ grid-template-columns: 1fr; }
}

.card{
  text-align:left;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}
.card:hover{
  transform: translateY(-1px);
  border-color: rgba(120,220,255,.35);
  background: rgba(0,0,0,.30);
  box-shadow: 0 14px 40px rgba(0,0,0,.32);
}
.card.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12), 0 16px 45px rgba(0,0,0,.42);
}
.cardTitle{ font-weight: 900; }
.cardDesc{ margin-top: 6px; color: var(--muted); font-size: 13px; }

.customBox{ margin-top: 14px; display:grid; gap: 10px; }
.lbl{ font-size: 12px; color: var(--muted); }
.inp{
  width:100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.24);
  color: var(--text);
  outline:none;
}
.portrait{
  width:120px; height:120px; border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  box-shadow: 0 14px 40px rgba(0,0,0,.28);
}

.tracks{ margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.08); }
.tracksTitle{ font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.tracksRow{ margin-top: 10px; display:flex; flex-wrap: wrap; gap: 10px; }
.chip{
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
}
.chip.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12);
}

.pill{
  display:inline-flex; align-items:center; gap:10px;
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  box-shadow: 0 12px 35px rgba(0,0,0,.25);
}
.dot{
  width:10px; height:10px; border-radius:50%;
  background: radial-gradient(circle at 30% 30%, rgba(120,255,210,.95), rgba(120,150,255,.65));
  box-shadow: 0 0 0 3px rgba(120,255,210,.10);
}
.pillText{ font-weight: 800; font-size: 13px; color: rgba(255,255,255,.88); }

.gameBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: .18;
  filter: saturate(1.05) contrast(1.05);
}

.gameLayout{
  position: relative;
  z-index: 3;
  height: calc(100vh - 64px);
  display:grid;
  grid-template-columns: 1fr 340px;
  gap: 14px;
  padding: 14px;
  min-height: 0;
}
@media (max-width: 980px){
  .gameLayout{ grid-template-columns: 1fr; height:auto; }
}

.boardWrap{
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  overflow: hidden;
  min-height: 0;
  background: rgba(0,0,0,.22);
  box-shadow: var(--shadow2);
}
.boardLayerBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: .14;
  transform: scale(1.02);
}

.hud{
  position: relative;
  z-index: 2;
  padding: 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  backdrop-filter: blur(10px);
  background: linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.08));
  display:flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.hudLeft{ display:flex; align-items:center; gap: 12px; flex-wrap: wrap; }
.hudRight{ display:flex; align-items:center; gap: 10px; }

.hudStat{
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  min-width: 86px;
}
/* CONTINUE baseCss FROM:  .hudStat .k{ font-size: 11px ... } */

.hudStat .k{
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .35px;
  text-transform: uppercase;
}
.hudStat .v{
  margin-top: 4px;
  font-weight: 900;
  font-size: 13px;
}
.mutedSmall{
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  margin-left: 6px;
}

/* ===== Items ===== */
.items{
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.itemBtn{
  display:grid;
  grid-template-columns: 20px auto 18px;
  align-items:center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.itemBtn:hover{
  background: rgba(0,0,0,.30);
  border-color: var(--stroke2);
  transform: translateY(-1px);
}
.itemBtn:active{ transform: translateY(0); }
.itemBtn:disabled{
  opacity: .55;
  cursor: not-allowed;
  transform:none;
}
.itemBtn.off{
  opacity: .5;
  filter: grayscale(.2);
}
.itemIcon{ font-size: 16px; line-height: 1; }
.itemName{
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .25px;
}
.itemCharges{
  font-size: 12px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.08);
  text-align:center;
}

/* ===== Dice 3D ===== */
.dice3d{
  width: 58px;
  height: 58px;
  position: relative;
  display:grid;
  place-items:center;
  perspective: 700px;
}
.dice3d .cube{
  width: 46px;
  height: 46px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}
.dice3d.rolling .cube{
  animation: cubeWobble .35s ease-in-out infinite;
}
@keyframes cubeWobble{
  0%{ transform: rotateX(0deg) rotateY(0deg); }
  25%{ transform: rotateX(18deg) rotateY(-16deg); }
  50%{ transform: rotateX(-16deg) rotateY(22deg); }
  75%{ transform: rotateX(14deg) rotateY(16deg); }
  100%{ transform: rotateX(0deg) rotateY(0deg); }
}

.dice3d .face{
  position:absolute;
  inset:0;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    0 10px 22px rgba(0,0,0,.35);
  backface-visibility: hidden;
}

/* Cube geometry: size/2 = 23px (because 46px cube) */
.dice3d .face-front{  transform: rotateY(  0deg) translateZ(23px); }
.dice3d .face-back{   transform: rotateY(180deg) translateZ(23px); }
.dice3d .face-right{  transform: rotateY( 90deg) translateZ(23px); }
.dice3d .face-left{   transform: rotateY(-90deg) translateZ(23px); }
.dice3d .face-top{    transform: rotateX( 90deg) translateZ(23px); }
.dice3d .face-bottom{ transform: rotateX(-90deg) translateZ(23px); }

.diceBorder{
  position:absolute;
  inset: 0;
  pointer-events:none;
  background-size: cover;
  background-position: center;
  opacity: .95;
  transform: translateZ(0);
  filter: drop-shadow(0 10px 22px rgba(0,0,0,.35));
}

/* ===== Board scroll ===== */
.boardScroll{
  position: relative;
  z-index: 2;
  height: calc(100% - 88px); /* HUD height-ish */
  overflow: auto;
  padding: 16px 10px 18px;
}

.board{
  min-width: max(860px, 100%);
  padding: 10px 4px 18px;
}

/* ===== Hex rows ===== */
.hexRow{
  display:flex;
  gap: var(--gapX);
  margin-bottom: var(--gapY);
  justify-content: center;
}
.hexRow.offset{
  transform: translateX(calc(var(--hex) * 0.45));
}

/* ===== Hex slots ===== */
.hexSlot{
  width: calc(var(--hex) * 1.02);
  height: calc(var(--hex) * 1.02);
}
.hexSlot.empty{
  opacity: 0;
}

/* ===== Hex button ===== */
.hex{
  width: calc(var(--hex) * 1.02);
  height: calc(var(--hex) * 1.02);
  padding: 0;
  border: none;
  background: rgba(0,0,0,.0);
  cursor: pointer;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.35));
  transition: transform 140ms ease, filter 140ms ease;
  position: relative;
}
.hexInner{
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}


.hex:hover{
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.45));
}
.hex:disabled{
  opacity: .75;
  cursor: not-allowed;
  transform:none;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.25));
}

/* Inner tile */
.hexInner{
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 10px;

  /* flat-topped hex */
  clip-path: polygon(
    25% 6%,
    75% 6%,
    98% 50%,
    75% 94%,
    25% 94%,
    2% 50%
  );

  border: 1px solid rgba(255,255,255,.12);
  background:
    radial-gradient(circle at 30% 25%, rgba(120,255,210,.12), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(120,150,255,.12), transparent 55%),
    rgba(0,0,0,.34);

  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
  overflow:hidden;
}

/* subtle sheen */
.hexInner::before{
  content:"";
  position:absolute;
  inset:-2px;
  opacity:.18;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,.25), transparent 55%);
  pointer-events:none;
}

/* Layer glow ring */
.hex::after{
  content:"";
  position:absolute;
  inset:-2px;
  border-radius: 12px;
  clip-path: polygon(
    25% 6%,
    75% 6%,
    98% 50%,
    75% 94%,
    25% 94%,
    2% 50%
  );
  box-shadow: 0 0 0 0 rgba(0,0,0,0);
  pointer-events:none;
}

/* reachable pulse */
.hex.reach .hexInner{
  border-color: rgba(70,249,180,.48);
  box-shadow:
    inset 0 0 0 1px rgba(70,249,180,.18),
    0 0 0 3px rgba(70,249,180,.08);
  animation: reachPulse 1.4s ease-in-out infinite;
}
@keyframes reachPulse{
  0%{ filter: brightness(1); }
  50%{ filter: brightness(1.15); }
  100%{ filter: brightness(1); }
}

/* selected */
.hex.sel .hexInner{
  border-color: rgba(255,221,121,.55);
  box-shadow:
    inset 0 0 0 1px rgba(255,221,121,.20),
    0 0 0 3px rgba(255,221,121,.10);
}
.hex.sel .hexInner::after{
  content:"";
  position:absolute;
  inset:0;
  background: radial-gradient(circle at 50% 50%, rgba(255,221,121,.18), transparent 60%);
  pointer-events:none;
}

/* blocked */
.hex.blocked .hexInner{
  border-color: rgba(255,93,122,.22);
  background: rgba(0,0,0,.55);
  filter: grayscale(.15) brightness(.9);
}

/* player marker glow */
.hex.player .hexInner{
  border-color: rgba(120,255,210,.55);
  box-shadow:
    inset 0 0 0 1px rgba(120,255,210,.20),
    0 0 0 3px rgba(120,255,210,.10);
}

/* goal glow */
.hex.goal .hexInner{
  border-color: rgba(255,211,106,.55);
  box-shadow:
    inset 0 0 0 1px rgba(255,211,106,.20),
    0 0 0 3px rgba(255,211,106,.10);
}

/* trigger warning */
.hex.trigger .hexInner{
  border-color: rgba(255,122,209,.40);
  box-shadow:
    inset 0 0 0 1px rgba(255,122,209,.18),
    0 0 0 3px rgba(255,122,209,.08);
}

/* text on hex */
.hexId{
  position:absolute;
  top: 9px;
  left: 9px;
  font-size: 11px;
  color: rgba(255,255,255,.70);
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.20);
}

/* marks */
.hexMarks{
  position:absolute;
  right: 9px;
  bottom: 9px;
  display:flex;
  gap: 6px;
}
.mark{
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display:grid;
  place-items:center;
  font-weight: 900;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
}
.mark.p{
  border-color: rgba(120,255,210,.35);
  color: rgba(120,255,210,.95);
  background: rgba(120,255,210,.10);
}
.mark.g{
  border-color: rgba(255,211,106,.35);
  color: rgba(255,211,106,.95);
  background: rgba(255,211,106,.10);
}
.mark.t{
  border-color: rgba(255,122,209,.35);
  color: rgba(255,122,209,.95);
  background: rgba(255,122,209,.10);
}

/* ===== Sidebar ===== */
.side{
  display:grid;
  grid-auto-rows: min-content;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.panelMini{
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(10,14,24,.88);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(10px);
}
.miniTitle{
  margin: 0 0 10px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .45px;
  color: rgba(255,255,255,.82);
  font-weight: 900;
}
.miniRow{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255,255,255,.08);
}
.miniRow:last-child{ border-bottom: none; }
.miniRow .k{
  color: var(--muted);
  font-size: 12px;
}
.miniRow .v{
  font-weight: 900;
  font-size: 12px;
}

/* log */
.log{
  max-height: 340px;
  overflow:auto;
  padding-right: 6px;
}
.logRow{
  display:grid;
  grid-template-columns: 58px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.logRow:last-child{ border-bottom:none; }
.lt{
  color: rgba(255,255,255,.55);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.lm{
  font-size: 13px;
  color: rgba(255,255,255,.88);
}
.logRow.ok .lm{ color: rgba(70,249,180,.92); }
.logRow.bad .lm{ color: rgba(255,93,122,.92); }
.logRow.info .lm{ color: rgba(119,168,255,.92); }

/* ===== Overlay / Encounter ===== */
.overlay{
  position:absolute;
  inset:0;
  z-index: 50;
  display:grid;
  place-items: center;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(8px);
}
.overlayCard{
  width: min(560px, 92vw);
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(10,14,24,.92);
  box-shadow: 0 24px 70px rgba(0,0,0,.55);
  padding: 16px;
}
.overlayTitle{
  font-size: 16px;
  font-weight: 1000;
  letter-spacing: .35px;
  text-transform: uppercase;
}
.overlaySub{
  margin-top: 8px;
  color: rgba(255,255,255,.78);
  font-size: 13px;
  line-height: 1.35;
}

.villainBox{
  margin-top: 14px;
  display:grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
  align-items:center;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
}
.villainImg{
  width: 120px;
  height: 120px;
  border-radius: 16px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 14px 40px rgba(0,0,0,.35);
  background: rgba(0,0,0,.25);
}
.villainMeta{
  display:grid;
  gap: 10px;
}

/* ===== Scrollbars ===== */
*::-webkit-scrollbar{ width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.12);
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,.25);
}
*::-webkit-scrollbar-thumb:hover{ background: rgba(255,255,255,.18); }
*::-webkit-scrollbar-corner{ background: transparent; }

/* ===== Small responsive tweak ===== */
@media (max-width: 980px){
  .board{ min-width: 0; }
  .boardScroll{ height: auto; }
  .log{ max-height: 240px; }
}
`;

