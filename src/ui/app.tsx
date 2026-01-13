// src/ui/app.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, enterLayer, revealHex } from "../engine/board";

/* =========================================================
   Types
========================================================= */
type Screen = "start" | "select" | "setup" | "game";
type Mode = "regular" | "kids";
type Manifest = { initial: string; files: string[] };

type PlayerChoice =
  | { kind: "preset"; id: string; name: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

type Coord = { layer: number; row: number; col: number };
type LogEntry = { n: number; t: string; msg: string; kind?: "ok" | "bad" | "info" };

/* =========================================================
   Config
========================================================= */
const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";
const GAME_BG_URL = "images/ui/board-bg.png";
const DICE_IMG_BASE = "images/d20"; // ✅ your folder: public/images/d20

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
  assertScenario(s);
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

/** For CSS vars like var(--L2) */
function layerCssVar(n: number) {
  const clamped = Math.max(1, Math.min(7, Math.floor(n || 1)));
  return `var(--L${clamped})`;
}

/** Filter reachability to a specific layer (for dice mini boards). */
function filterReachForLayer(layer: number, reachMap: ReachMap) {
  const prefix = `L${layer}-`;
  const rm = {} as ReachMap;
  const set = new Set<string>();

  for (const [k, v] of Object.entries(reachMap as any)) {
    if (!k.startsWith(prefix)) continue;
    (rm as any)[k] = v;
    if ((v as any)?.reachable) set.add(k);
  }
  return { reachMap: rm, reachable: set };
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function inBounds(row: number, col: number) {
  if (row < 1 || row > ROW_LENS.length) return false;
  const len = ROW_LENS[row - 1] ?? 7;
  return col >= 1 && col <= len;
}

// flat-topped offset rows (your CSS shifts even rows right)
function neighborsFlatTop(row: number, col: number) {
  const even = row % 2 === 0;
  const cand = [
    { row, col: col - 1 }, // W
    { row, col: col + 1 }, // E
    { row: row - 1, col: col + (even ? 0 : -1) }, // NW
    { row: row - 1, col: col + (even ? 1 : 0) }, // NE
    { row: row + 1, col: col + (even ? 0 : -1) }, // SW
    { row: row + 1, col: col + (even ? 1 : 0) }, // SE
  ];
  return cand.filter((p) => inBounds(p.row, p.col));
}

function shortestMovesSameLayer(state: GameState | null, layer: number, startId: string, goalId: string) {
  if (!state) return Infinity;
  if (!startId || !goalId) return Infinity;
  if (startId === goalId) return 0;

  const q: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];
  const seen = new Set<string>([startId]);

  while (q.length) {
    const { id, d } = q.shift()!;
    const c = idToCoord(id);
    if (!c) continue;

    for (const nb of neighborsFlatTop(c.row, c.col)) {
      const nid = `L${layer}-R${nb.row}-C${nb.col}`;
      if (seen.has(nid)) continue;

      const hex = getHexFromState(state, nid) as any;
      const { blocked, missing } = isBlockedOrMissing(hex);
      if (blocked || missing) continue;

      if (nid === goalId) return d + 1;
      seen.add(nid);
      q.push({ id: nid, d: d + 1 });
    }
  }
  return Infinity;
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
   Minimal presets
========================================================= */
const PLAYER_PRESETS_REGULAR = [
  { id: "p1", name: "Aeris" },
  { id: "p2", name: "Devlan" },
];

function scenarioLabel(s: any, i: number) {
  return String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
}

/* =========================================================
   Dice mapping
========================================================= */
function rotForRoll(n: number) {
  // Convention:
  // 1=top, 6=bottom, 2=front, 5=back, 3=right, 4=left
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

function diceImg(n: number) {
  return toPublicUrl(`${DICE_IMG_BASE}/D20_${n}.png`);
}

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

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

  const scenarioLayerCount = useMemo(() => {
    const s: any = scenarios[scenarioIndex];
    return Number(s?.layers ?? 1);
  }, [scenarios, scenarioIndex]);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------
     Dice mode toggle
  -------------------------- */
  const [diceMode, setDiceMode] = useState(false); // ✅ false = mini boards + manual rotation, true = image dice + roll

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
  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>({ x: -26, y: -38 });
  const [diceSpinning, setDiceSpinning] = useState(false);

  // drag rotation state (only active when diceMode === false)
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

  const rollDice = useCallback(() => {
    const n = 1 + Math.floor(Math.random() * 6);
    setRollValue(n);

    const targetFace = rotForRoll(n);
    const base = { x: -26, y: -38 };
    const final = { x: base.x + targetFace.x, y: base.y + targetFace.y };

    setDiceSpinning(true);

    const extraX = 360 * (1 + Math.floor(Math.random() * 2));
    const extraY = 360 * (2 + Math.floor(Math.random() * 2));

    setDiceRot({ x: final.x - extraX, y: final.y - extraY });
    window.setTimeout(() => {
      setDiceRot(final);
      window.setTimeout(() => setDiceSpinning(false), 650);
    }, 40);

    pushLog(`Rolled ${n}`, "ok");
  }, [pushLog]);

  // Manual drag rotation ONLY when NOT in diceMode
  const onDicePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (diceMode) return; // ✅ no manual rotation in dice mode
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
    [diceRot.x, diceRot.y, diceSpinning, diceMode]
  );

  const onDicePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (diceMode) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const sens = 0.35;
      const nextY = dragRef.current.startRotY + dx * sens;
      const nextX = dragRef.current.startRotX - dy * sens;

      setDiceRot({ x: nextX, y: nextY });
    },
    [diceMode]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (diceMode) return;
      if (!dragRef.current.active) return;
      if (e.pointerId !== dragRef.current.pointerId) return;
      dragRef.current.active = false;
      dragRef.current.pointerId = -1;
      setDiceDragging(false);
    },
    [diceMode]
  );

  /* --------------------------
     Load mode content
  -------------------------- */
  const loadModeContent = useCallback(async (nextMode: Mode) => {
    setMode(nextMode);
    setChosenPlayer(null);

    const base = nextMode === "kids" ? "kids/" : "";
    const manifest = await fetchJson<Manifest>(`${base}scenarios/manifest.json`);
    const list = await Promise.all(manifest.files.map((f) => loadScenario(`${base}${f}`)));

    setScenarios(list);

    const initialBase = manifest.initial.split("/").pop()?.replace(".json", "") ?? "";
    const idx = Math.max(
      0,
      list.findIndex(
        (s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase
      )
    );
    setScenarioIndex(idx);
    setScreen("select");
  }, []);

  /* --------------------------
     Game helpers
  -------------------------- */
  const recomputeReachability = useCallback((st: GameState) => {
    setReachMap(getReachability(st) as any);
  }, []);

  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) revealHex(st, `L${layer}-R${r}-C${c}`);
    }
  }, []);

  const revealRing = useCallback((st: GameState, layer: number, centerId: string) => {
    const c = idToCoord(centerId);
    if (!c) return;
    revealHex(st, centerId);
    for (const nb of neighborsFlatTop(c.row, c.col)) {
      revealHex(st, `L${layer}-R${nb.row}-C${nb.col}`);
    }
  }, []);

  const computeOptimal = useCallback((st: GameState, layer: number, startId: string, gid: string | null) => {
    if (!gid) return null;
    const d = shortestMovesSameLayer(st, layer, startId, gid);
    return Number.isFinite(d) ? d : null;
  }, []);

  const startScenario = useCallback(
    (idx: number) => {
      const s = scenarios[idx] as any;
      if (!s) return;

      const st = newGame(s);
      const pid = (st as any).playerHexId ?? null;
      const layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;

      const gid = findGoalId(s, layer);
      setGoalId(gid);

      enterLayer(st, layer);
      revealWholeLayer(st, layer);
      recomputeReachability(st);

      setState(st);
      setSelectedId(pid);
      setCurrentLayer(layer);

      // reset dice view
      setRollValue(1);
      setDiceRot({ x: -26, y: -38 });
      setDiceSpinning(false);
      setDiceDragging(false);

      // moves + optimal
      setMovesTaken(0);
      if (pid && gid) {
        const startOpt = computeOptimal(st, layer, pid, gid);
        setOptimalAtStart(startOpt);
        setOptimalFromNow(startOpt);
      } else {
        setOptimalAtStart(null);
        setOptimalFromNow(null);
      }

      // reset log
      logNRef.current = 0;
      setLog([]);
      pushLog(`Started: ${scenarioLabel(s, idx)}`, "ok");
      if (gid) pushLog(`Goal: ${gid}`, "info");
      else pushLog(`Goal: (not set in scenario JSON)`, "bad");

      // inventory defaults
      setItems([
        { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
        { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
        { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
      ]);

      window.setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = 0;
      }, 0);
    },
    [scenarios, revealWholeLayer, recomputeReachability, computeOptimal, pushLog]
  );

  /* --------------------------
     Board click
  -------------------------- */
  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;

      setSelectedId(id);

      const res = tryMove(state, id);
      if (res.ok) {
        const newPlayerId = (state as any).playerHexId;
        const newLayer = newPlayerId ? idToCoord(newPlayerId)?.layer ?? currentLayer : currentLayer;

        if (!res.won) {
          endTurn(state);
          enterLayer(state, newLayer);
          revealWholeLayer(state, newLayer);
        }

        setCurrentLayer(newLayer);
        setSelectedId(newPlayerId ?? id);

        setMovesTaken((m) => m + 1);

        if (newPlayerId && goalId) {
          const o = computeOptimal(state, newLayer, newPlayerId, goalId);
          setOptimalFromNow(o);
        }

        recomputeReachability(state);
        setState({ ...(state as any) });

        const c = newPlayerId ? idToCoord(newPlayerId) : null;
        pushLog(c ? `Move OK → R${c.row}C${c.col} (L${c.layer})` : `Move OK`, "ok");
      } else {
        recomputeReachability(state);
        setState({ ...(state as any) });
        pushLog(`Move blocked`, "bad");
      }
    },
    [state, currentLayer, recomputeReachability, revealWholeLayer, pushLog, goalId, computeOptimal]
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
        revealRing(state, currentLayer, pid);
        recomputeReachability(state);
        setState({ ...(state as any) });
        pushLog("Used: Reveal (ring)", "ok");
        return;
      }

      if (id === "peek") {
        const up = Math.min(scenarioLayerCount, currentLayer + 1);
        const dn = Math.max(1, currentLayer - 1);
        revealRing(state, up, pid.replace(/^L\d+-/, `L${up}-`));
        revealRing(state, dn, pid.replace(/^L\d+-/, `L${dn}-`));
        recomputeReachability(state);
        setState({ ...(state as any) });
        pushLog("Used: Peek (above/below ring)", "info");
        return;
      }
    },
    [items, state, currentLayer, scenarioLayerCount, rollDice, pushLog, revealRing, recomputeReachability]
  );

  // Stripes (mini-board mode only)
  const stripeBelow = belowLayer < 1 ? "rgba(0,0,0,.90)" : layerCssVar(belowLayer);
  const stripeCurr = layerCssVar(currentLayer);
  const stripeAbove = aboveLayer > scenarioLayerCount ? "rgba(0,0,0,.90)" : layerCssVar(aboveLayer);

  // Align dice top with bar top when rollValue === 1
  const diceAlignY = diceMode ? 60 : 0;

  // Mini boards reachability filtered per layer
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

  return (
    <div className="appRoot" data-mode={mode ?? ""}>
      <style>{CSS}</style>

      <div className="globalBg" aria-hidden="true" style={{ backgroundImage: `url("${toPublicUrl(GAME_BG_URL)}")` }} />
      <div className="globalBgOverlay" aria-hidden="true" />

      {/* START */}
      {screen === "start" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitleBig">Hex Layers</div>
            <div className="cardMeta">Build: {BUILD_TAG}</div>

            <div className="row">
              <button className="btn primary" onClick={() => loadModeContent("regular").catch((e) => alert(String((e as any)?.message ?? e)))}>
                Regular
              </button>
              <button className="btn" onClick={() => loadModeContent("kids").catch((e) => alert(String((e as any)?.message ?? e)))}>
                Kids / Friendly
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SELECT */}
      {screen === "select" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Select scenario</div>

            <div className="selectList">
              {scenarios.map((s: any, i: number) => {
                const selected = i === scenarioIndex;
                return (
                  <div
                    key={i}
                    className={"selectTile" + (selected ? " selected" : "")}
                    onClick={() => setScenarioIndex(i)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{scenarioLabel(s, i)}</div>
                    <div className="selectTileDesc">{String(s?.desc ?? s?.description ?? "")}</div>
                  </div>
                );
              })}
            </div>

            <div className="row rowEnd">
              <button className="btn" onClick={() => setScreen("start")}>
                Back
              </button>
              <button className="btn primary" onClick={() => setScreen("setup")} disabled={!scenarios.length}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SETUP */}
      {screen === "setup" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Choose player</div>

            <div className="selectList">
              {PLAYER_PRESETS_REGULAR.map((p) => {
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
              <button className="btn" onClick={() => setScreen("select")}>
                Back
              </button>
              <button
                className="btn primary"
                disabled={!chosenPlayer || !scenarios.length}
                onClick={() => {
                  startScenario(scenarioIndex);
                  setScreen("game");
                }}
              >
                Start game
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* GAME */}
      {screen === "game" ? (
        <div className="shell shellGame">
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

                {/* Dice OUTER RIGHT */}
                <div className="diceArea">
                  <div className="diceCubeWrap" aria-label="Layer dice">
                    <div
                      className={
                        "diceCube" +
                        (diceSpinning ? " isSpinning" : "") +
                        (diceDragging ? " isDragging" : "") +
                        (diceMode ? " isDiceMode" : "")
                      }
                      onPointerDown={onDicePointerDown}
                      onPointerMove={onDicePointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      style={{
                        transform: `translateY(${diceAlignY}px) rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)`,
                        touchAction: diceMode ? "auto" : "none",
                        cursor: diceMode ? "default" : diceDragging ? "grabbing" : "grab",
                      }}
                    >
                      {/* =========================
                          DICE MODE (images)
                         ========================= */}
                      {diceMode ? (
                        <>
                          {/* faces: top=1 front=2 right=3 left=4 back=5 bottom=6 */}
                          <FaceImage cls="diceFace faceTop" src={diceImg(1)} alt="Dice 1" />
                          <FaceImage cls="diceFace faceFront" src={diceImg(2)} alt="Dice 2" />
                          <FaceImage cls="diceFace faceRight" src={diceImg(3)} alt="Dice 3" />
                          <FaceImage cls="diceFace faceLeft" src={diceImg(4)} alt="Dice 4" />
                          <FaceImage cls="diceFace faceBack" src={diceImg(5)} alt="Dice 5" />
                          <FaceImage cls="diceFace faceBottom" src={diceImg(6)} alt="Dice 6" />
                        </>
                      ) : (
                        <>
                          {/* =========================
                              MINI BOARD MODE (your UI faces)
                             ========================= */}

                          {/* TOP (mini: ABOVE) */}
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

                          {/* FRONT (mini: CURRENT) */}
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

                          {/* RIGHT (mini: BELOW or invalid) */}
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

                          {/* BACK: MOVE COUNTER + OPTIMAL */}
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
                              <div className="hudNote">
                                Goal: <span className="mono">{goalId ?? "not set"}</span>
                              </div>
                            </div>
                          </div>

                          {/* LEFT: STORY LOG */}
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

                          {/* BOTTOM: INVENTORY / POWER UPS */}
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
                              <div className="hudNote">Drag to rotate • Tap items to use</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* CONTROLS */}
                  <div className="diceControls">
                    <button
                      className={"btn " + (diceMode ? "primary" : "")}
                      onClick={() => {
                        setDiceMode((v) => !v);
                        // when switching to mini-board mode, ensure a nice view
                        window.setTimeout(() => {
                          setDiceRot({ x: -26, y: -38 });
                          setDiceSpinning(false);
                          setDiceDragging(false);
                        }, 0);
                      }}
                      title="Toggle Dice Mode"
                    >
                      {diceMode ? "🧊 Boards" : "🎲 Dice Mode"}
                    </button>

                    {/* ✅ In Dice Mode: Roll allowed. In Board Mode: NO roll, rotation only */}
                    {diceMode ? (
                      <>
                        <button className="btn primary" onClick={rollDice}>
                          🎲 Roll
                        </button>
                        <div className="diceReadout">= {rollValue}</div>
                      </>
                    ) : (
                      <div className="diceReadout subtle">Drag to rotate</div>
                    )}
                  </div>

                  <div className="dragHint">
                    {diceMode ? "Dice Mode: Roll only (no drag rotation)" : "Board Mode: Drag rotation only (no roll)"}
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
   Dice image face component
========================================================= */
function FaceImage(props: { cls: string; src: string; alt: string }) {
  return (
    <div className={props.cls}>
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
        const row = rIdx + 1;
        const isEvenRow = row % 2 === 0;

        return (
          <div key={row} className={"hexRow" + (isEvenRow ? " even" : "")} data-row={row}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx + 1;
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
                  title={showCoords ? `L${activeLayer} R${row} C${col}` : undefined}
                >
                  <span className="hexRim hexRimTop" aria-hidden="true" />
                  <span className="hexRim hexRimBottom" aria-hidden="true" />

                  {showCoords ? (
                    <span className="hexLabel">
                      <div>R{row}</div>
                      <div>C{col}</div>
                    </span>
                  ) : null}

                  {kind === "mini" ? <span className="miniNum">{col}</span> : null}
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

  --L1: rgba(255, 92, 120, .95);
  --L2: rgba(255, 150, 90, .95);
  --L3: rgba(255, 220, 120, .95);
  --L4: rgba(120, 235, 170, .95);
  --L5: rgba(120, 220, 255, .95);
  --L6: rgba(135, 170, 255, .95);
  --L7: rgba(200, 140, 255, .95);
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
.globalBgOverlay{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 600px at 50% 50%, rgba(255,255,255,.18), transparent 55%),
    linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.24));
  z-index: 1;
}

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
.rowEnd{ justify-content: flex-end; }
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
.barSeg.isActive{ outline: 1px solid rgba(255,255,255,.25); z-index: 3; }
.barSeg.isActive::after{
  content: "";
  position: absolute;
  inset: -10px;
  background: inherit;
  filter: blur(14px);
  opacity: .95;
  border-radius: 999px;
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
  background: rgba(255,255,255,.14);
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
.hexBoardMain .hexLabel{ font-size: 13px; }

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
.hexBoardMain .hex.notReach::before{ background: rgba(0,0,0,.28); opacity: 1; }
.hexBoardMain .hex.blocked::before{ background: rgba(0,0,0,.34); opacity: 1; }
.hexBoardMain .hex.missing::before{ background: rgba(0,0,0,.48); opacity: 1; }
.hexBoardMini .hex::before{ opacity: 0 !important; }

.hex.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset,
    0 0 18px rgba(0,200,255,.42),
    0 0 44px rgba(0,200,255,.22);
  filter: brightness(1.6);
}
.hex.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.18) inset,
    0 0 26px rgba(76,255,80,.70),
    0 0 80px rgba(76,255,80,.45);
  filter: brightness(1.6);
  z-index: 4;
}
.hex.sel{ outline: 2px solid rgba(255,255,255,.55); outline-offset: 2px; }

/* DICE */
.diceArea{ display:grid; justify-items:center; gap: 14px; padding-top: 0; }

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

/* Keep mini boards same size while cube grows */
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

/* Scale mini boards to fill the square more */
.miniFit{
  transform: scale(var(--miniScale, 1.55));
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
}
.hudTitle{ font-weight: 1000; letter-spacing: .2px; opacity: .95; }
.hudRow{ display:flex; justify-content: space-between; align-items:center; gap: 10px; font-weight: 900; }
.hudKey{ opacity: .85; }
.hudVal{ font-weight: 1000; }
.hudVal.ok{ color: rgba(140,255,170,.95); }
.hudVal.bad{ color: rgba(255,160,160,.95); }
.hudNote{ margin-top: auto; opacity: .78; font-weight: 900; font-size: 12px; }
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
