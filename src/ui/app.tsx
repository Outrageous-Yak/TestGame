// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// app.tsx
import "./app.css";

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

type Difficulty = "easy" | "normal" | "hard";

/** Scenario options shown in UI. Must exist in engine/scenario. */
const SCENARIO_OPTIONS: Array<{ id: string; title: string; subtitle?: string }> = [
  { id: "intro", title: "Intro Run", subtitle: "Short tutorial scenario" },
  { id: "forest", title: "The Forest", subtitle: "Fog, whispers, and hidden paths" },
  { id: "ruins", title: "Ancient Ruins", subtitle: "Traps, relics, and portals" },
  { id: "abyss", title: "The Abyss", subtitle: "High risk, high reward" },
];

/** Preset character options for quick selection */
const PRESET_CHARACTERS: Array<{ id: string; name: string; emoji: string }> = [
  { id: "wanderer", name: "Wanderer", emoji: "🧭" },
  { id: "seer", name: "Seer", emoji: "🔮" },
  { id: "rogue", name: "Rogue", emoji: "🗡️" },
  { id: "warden", name: "Warden", emoji: "🛡️" },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function nowStamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/* =========================================================
   App
========================================================= */
export default function App() {
  // Flow
  const [screen, setScreen] = useState<Screen>("start");

  // World selection (purely UI for now)
  const [worldId, setWorldId] = useState<string>("verdant");
  const worldOptions = useMemo(
    () => [
      { id: "verdant", name: "Verdant", desc: "Green, alive, unpredictable." },
      { id: "umbral", name: "Umbral", desc: "Dark, arcane, surreal." },
      { id: "ashen", name: "Ashen", desc: "Ruins, dust, old echoes." },
    ],
    []
  );

  // Player / character
  const [playerName, setPlayerName] = useState<string>("Player");
  const [playerChoice, setPlayerChoice] = useState<PlayerChoice>({
    kind: "preset",
    id: PRESET_CHARACTERS[0].id,
    name: PRESET_CHARACTERS[0].name,
  });

  // Scenario / difficulty
  const [scenarioId, setScenarioId] = useState<string>(SCENARIO_OPTIONS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  // Game state
  const [game, setGame] = useState<GameState | null>(null);

  // Layer / view
  const [layer, setLayer] = useState<number>(0);

  // Selection / movement
  const [selected, setSelected] = useState<Coord | null>(null);
  const [reach, setReach] = useState<ReachMap | null>(null);

  // Log
  const [log, setLog] = useState<LogEntry[]>([]);
  const logN = useRef(0);
  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    logN.current += 1;
    setLog((prev) => [{ n: logN.current, t: nowStamp(), msg, kind }, ...prev].slice(0, 60));
  }, []);

  // Background tiling image behind board (your IMG_4098.jpeg in assets)
  // If you move/rename it, update this path:
  const tiledBgUrl = useMemo(() => "/assets/IMG_4098.jpeg", []);

  /* =========================================================
     Dice state
  ========================================================= */
  const [diceFace, setDiceFace] = useState<number>(1); // 1..6
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const diceRollTimer = useRef<number | null>(null);

  const rollDice = useCallback(() => {
    if (diceRolling) return;
    setDiceRolling(true);
    pushLog("Rolling dice…", "info");

    const start = performance.now();
    const duration = 650; // ms
    const tick = () => {
      const elapsed = performance.now() - start;
      // Quick random flicker
      setDiceFace(1 + Math.floor(Math.random() * 6));
      if (elapsed < duration) {
        diceRollTimer.current = window.setTimeout(tick, 55);
      } else {
        const final = 1 + Math.floor(Math.random() * 6);
        setDiceFace(final);
        setDiceRolling(false);
        pushLog(`Dice: ${final}`, "ok");
      }
    };
    tick();
  }, [diceRolling, pushLog]);

  useEffect(() => {
    return () => {
      if (diceRollTimer.current) window.clearTimeout(diceRollTimer.current);
    };
  }, []);

  /* =========================================================
     Start / Reset
  ========================================================= */
  const resetToStart = useCallback(() => {
    setGame(null);
    setLayer(0);
    setSelected(null);
    setReach(null);
    setLog([]);
    logN.current = 0;
    setScreen("start");
  }, []);

  /* =========================================================
     Begin game
  ========================================================= */
  const beginGame = useCallback(() => {
    // assertScenario validates (and usually returns a Scenario)
    const scenario: Scenario = assertScenario(scenarioId);

    // newGame signature may differ in your engine; we call it with a permissive shape.
    // If your engine expects different fields, adjust here.
    const next = newGame({
      scenario,
      difficulty,
      player: {
        name: playerName,
        choice: playerChoice,
        worldId,
      },
    } as any) as GameState;

    setGame(next);
    setLayer(0);
    setSelected(null);
    setReach(null);
    setScreen("game");
    pushLog(`New game: ${scenarioId} (${difficulty})`, "ok");
  }, [scenarioId, difficulty, playerName, playerChoice, worldId, pushLog]);

  /* =========================================================
     Reachability recalculation
  ========================================================= */
  useEffect(() => {
    if (!game) return;
    // Many engines compute reach based on current layer and player position.
    // We’ll attempt to compute it defensively.
    try {
      const r = getReachability(game as any) as ReachMap;
      setReach(r);
    } catch {
      setReach(null);
    }
  }, [game]);

  /* =========================================================
     Helpers to read board safely (your engine types decide the truth)
  ========================================================= */
  const board = (game as any)?.board;
  const currentLayer = layer;

  const getHexByCoord = useCallback(
    (c: Coord): Hex | null => {
      if (!board) return null;

      // Common shapes:
      // - board.layers[layer].rows[row][col]
      // - board.layers[layer].hexes[id]
      // - board.hexesByLayer[layer][row][col]
      const L = board.layers?.[c.layer];
      if (L?.rows?.[c.row]?.[c.col]) return L.rows[c.row][c.col] as Hex;

      const byLayer = board.hexesByLayer?.[c.layer];
      if (byLayer?.[c.row]?.[c.col]) return byLayer[c.row][c.col] as Hex;

      // Fall back: attempt id-based
      const id = `${c.layer}:${c.row}:${c.col}`;
      const h = board.hexes?.[id] ?? board.hexById?.[id];
      return (h as Hex) ?? null;
    },
    [board]
  );

  const isReachable = useCallback(
    (c: Coord) => {
      if (!reach) return false;
      const key = `${c.layer}:${c.row}:${c.col}`;
      return !!(reach as any)[key];
    },
    [reach]
  );

  const onHexClick = useCallback(
    (c: Coord) => {
      if (!game) return;

      // If no selection: select a tile
      if (!selected) {
        setSelected(c);
        pushLog(`Selected ${c.layer}:${c.row}:${c.col}`, "info");
        return;
      }

      // If same: unselect
      if (selected.layer === c.layer && selected.row === c.row && selected.col === c.col) {
        setSelected(null);
        return;
      }

      // If reachable: try move
      if (isReachable(c)) {
        try {
          const moved = tryMove(game as any, c as any) as GameState;
          setGame(moved);
          setSelected(null);
          pushLog(`Moved to ${c.layer}:${c.row}:${c.col}`, "ok");
        } catch (e) {
          pushLog(`Move blocked.`, "bad");
        }
        return;
      }

      // Otherwise just move selection
      setSelected(c);
      pushLog(`Selected ${c.layer}:${c.row}:${c.col}`, "info");
    },
    [game, selected, isReachable, pushLog]
  );

  /* =========================================================
     Layer navigation
  ========================================================= */
  const canEnterLayer = useCallback(
    (nextLayer: number) => {
      if (!game) return false;
      try {
        // enterLayer likely validates transitions; we use it as a check.
        enterLayer(game as any, nextLayer as any);
        return true;
      } catch {
        return false;
      }
    },
    [game]
  );

  const goLayer = useCallback(
    (nextLayer: number) => {
      if (!game) return;
      const nl = clamp(nextLayer, 0, 9);
      if (!canEnterLayer(nl)) {
        pushLog(`Can't enter layer ${nl}`, "bad");
        return;
      }
      setLayer(nl);
      setSelected(null);
      pushLog(`Layer ${nl}`, "info");
    },
    [game, canEnterLayer, pushLog]
  );

  /* =========================================================
     Reveal (if your engine has fog/hidden)
  ========================================================= */
  const revealSelected = useCallback(() => {
    if (!game || !selected) return;
    try {
      const next = revealHex(game as any, selected as any) as GameState;
      setGame(next);
      pushLog(`Revealed ${selected.layer}:${selected.row}:${selected.col}`, "ok");
    } catch {
      pushLog(`Nothing to reveal here.`, "bad");
    }
  }, [game, selected, pushLog]);

  /* =========================================================
     Derived: build a display grid for current layer
  ========================================================= */
  const rowsInLayer = useMemo(() => {
    // If your engine uses ROW_LENS per layer, we show by that.
    // Otherwise fallback to board data.
    const lens = (ROW_LENS as any)?.[currentLayer] as number[] | undefined;
    if (Array.isArray(lens) && lens.length) return lens;

    const L = board?.layers?.[currentLayer];
    if (Array.isArray(L?.rows)) return L.rows.map((r: any[]) => r.length);

    const byLayer = board?.hexesByLayer?.[currentLayer];
    if (Array.isArray(byLayer)) return byLayer.map((r: any[]) => r.length);

    // Default to a compact board
    return [3, 4, 5, 4, 3];
  }, [board, currentLayer]);

  const gridCoords = useMemo(() => {
    const coords: Coord[] = [];
    for (let r = 0; r < rowsInLayer.length; r++) {
      const cols = rowsInLayer[r];
      for (let c = 0; c < cols; c++) coords.push({ layer: currentLayer, row: r, col: c });
    }
    return coords;
  }, [rowsInLayer, currentLayer]);

  /* =========================================================
     Screens
  ========================================================= */
  if (screen === "start") {
    return (
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <div className="brandMark" />
              <div className="brandText">
                <div className="brandTitle">Hex Game</div>
                <div className="brandSub">Start → World → Character → Scenario → Difficulty → Game</div>
              </div>
            </div>
          </header>

          <main className="center">
            <section className="panel">
              <h2 className="panelTitle">Start</h2>

              <div className="field">
                <label>Name</label>
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player" />
              </div>

              <div className="actions">
                <button className="btn primary" onClick={() => setScreen("world")}>
                  Continue
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (screen === "world") {
    return (
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <button className="btn ghost" onClick={() => setScreen("start")}>
              ← Back
            </button>
            <div className="topbarSpacer" />
            <button className="btn ghost" onClick={resetToStart}>
              Reset
            </button>
          </header>

          <main className="center">
            <section className="panel">
              <h2 className="panelTitle">Choose World</h2>

              <div className="cardGrid">
                {worldOptions.map((w) => {
                  const active = w.id === worldId;
                  return (
                    <button
                      key={w.id}
                      className={`cardPick ${active ? "active" : ""}`}
                      onClick={() => setWorldId(w.id)}
                    >
                      <div className="cardPickTitle">{w.name}</div>
                      <div className="cardPickSub">{w.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="actions">
                <button className="btn ghost" onClick={() => setScreen("start")}>
                  Back
                </button>
                <button className="btn primary" onClick={() => setScreen("character")}>
                  Continue
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (screen === "character") {
    const isCustom = playerChoice.kind === "custom";
    return (
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <button className="btn ghost" onClick={() => setScreen("world")}>
              ← Back
            </button>
            <div className="topbarSpacer" />
            <button className="btn ghost" onClick={resetToStart}>
              Reset
            </button>
          </header>

          <main className="center">
            <section className="panel">
              <h2 className="panelTitle">Choose Character</h2>

              <div className="tabs">
                <button
                  className={`tab ${!isCustom ? "active" : ""}`}
                  onClick={() =>
                    setPlayerChoice({ kind: "preset", id: PRESET_CHARACTERS[0].id, name: PRESET_CHARACTERS[0].name })
                  }
                >
                  Presets
                </button>
                <button
                  className={`tab ${isCustom ? "active" : ""}`}
                  onClick={() => setPlayerChoice({ kind: "custom", name: playerName || "Custom", imageDataUrl: null })}
                >
                  Custom
                </button>
              </div>

              {!isCustom ? (
                <div className="cardGrid">
                  {PRESET_CHARACTERS.map((p) => {
                    const active = playerChoice.kind === "preset" && playerChoice.id === p.id;
                    return (
                      <button
                        key={p.id}
                        className={`cardPick ${active ? "active" : ""}`}
                        onClick={() => setPlayerChoice({ kind: "preset", id: p.id, name: p.name })}
                      >
                        <div className="cardPickTitle">
                          <span className="emoji">{p.emoji}</span> {p.name}
                        </div>
                        <div className="cardPickSub">Quick start preset</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="customBox">
                  <div className="field">
                    <label>Character Name</label>
                    <input
                      value={playerChoice.name}
                      onChange={(e) =>
                        setPlayerChoice((prev) =>
                          prev.kind === "custom" ? { ...prev, name: e.target.value } : prev
                        )
                      }
                      placeholder="Custom"
                    />
                  </div>

                  <div className="field">
                    <label>Portrait (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        const fr = new FileReader();
                        fr.onload = () => {
                          const url = typeof fr.result === "string" ? fr.result : null;
                          setPlayerChoice((prev) =>
                            prev.kind === "custom" ? { ...prev, imageDataUrl: url } : prev
                          );
                        };
                        fr.readAsDataURL(file);
                      }}
                    />
                  </div>

                  {playerChoice.imageDataUrl ? (
                    <div className="portraitPreview">
                      <img src={playerChoice.imageDataUrl} alt="portrait" />
                    </div>
                  ) : (
                    <div className="hint">No portrait selected.</div>
                  )}
                </div>
              )}

              <div className="actions">
                <button className="btn ghost" onClick={() => setScreen("world")}>
                  Back
                </button>
                <button className="btn primary" onClick={() => setScreen("scenario")}>
                  Continue
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (screen === "scenario") {
    return (
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <button className="btn ghost" onClick={() => setScreen("character")}>
              ← Back
            </button>
            <div className="topbarSpacer" />
            <button className="btn ghost" onClick={resetToStart}>
              Reset
            </button>
          </header>

          <main className="center">
            <section className="panel">
              <h2 className="panelTitle">Choose Scenario</h2>

              <div className="cardGrid">
                {SCENARIO_OPTIONS.map((s) => {
                  const active = s.id === scenarioId;
                  return (
                    <button
                      key={s.id}
                      className={`cardPick ${active ? "active" : ""}`}
                      onClick={() => setScenarioId(s.id)}
                    >
                      <div className="cardPickTitle">{s.title}</div>
                      <div className="cardPickSub">{s.subtitle ?? s.id}</div>
                    </button>
                  );
                })}
              </div>

              <div className="actions">
                <button className="btn ghost" onClick={() => setScreen("character")}>
                  Back
                </button>
                <button className="btn primary" onClick={() => setScreen("difficulty")}>
                  Continue
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (screen === "difficulty") {
    return (
      <div className="app">
        <div className="shell">
          <header className="topbar">
            <button className="btn ghost" onClick={() => setScreen("scenario")}>
              ← Back
            </button>
            <div className="topbarSpacer" />
            <button className="btn ghost" onClick={resetToStart}>
              Reset
            </button>
          </header>

          <main className="center">
            <section className="panel">
              <h2 className="panelTitle">Difficulty</h2>

              <div className="segmented">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    className={`seg ${difficulty === d ? "active" : ""}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="summary">
                <div className="summaryRow">
                  <span className="k">World</span>
                  <span className="v">{worldOptions.find((w) => w.id === worldId)?.name ?? worldId}</span>
                </div>
                <div className="summaryRow">
                  <span className="k">Character</span>
                  <span className="v">{playerChoice.name}</span>
                </div>
                <div className="summaryRow">
                  <span className="k">Scenario</span>
                  <span className="v">{scenarioId}</span>
                </div>
              </div>

              <div className="actions">
                <button className="btn ghost" onClick={() => setScreen("scenario")}>
                  Back
                </button>
                <button className="btn primary" onClick={beginGame}>
                  Start Game
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  /* =========================================================
     GAME SCREEN
  ========================================================= */
  return (
    <div className="app gameApp">
      <div className="shell">
        <header className="topbar">
          <div className="left">
            <button className="btn ghost" onClick={() => setScreen("difficulty")}>
              ↺ Setup
            </button>
            <button className="btn ghost" onClick={resetToStart}>
              Reset
            </button>
          </div>

          <div className="mid">
            <div className="pill">
              <span className="dot" />
              <span className="pillText">
                {playerChoice.name} • {scenarioId} • {difficulty}
              </span>
            </div>
          </div>

          <div className="right">
            <button className="btn" onClick={() => goLayer(layer - 1)}>
              − Layer
            </button>
            <div className="layerNum">L{layer}</div>
            <button className="btn" onClick={() => goLayer(layer + 1)}>
              + Layer
            </button>
          </div>
        </header>

        <main className="gameMain">
          {/* Left: Board + Dice */}
          <section className="boardWrap">
            <div
              className="boardBg"
              style={{
                backgroundImage: `url(${tiledBgUrl})`,
              }}
            />

            <div className="boardHud">
              <div className="hudRow">
                <button className="btn primary" onClick={rollDice} disabled={diceRolling}>
                  {diceRolling ? "Rolling…" : "Roll"}
                </button>

                <div className={`dice ${diceRolling ? "rolling" : ""}`} aria-label={`dice-${diceFace}`}>
                  <div className={`die face-${diceFace}`}>
                    {/* pips handled by CSS (dice corners / pips section in your CSS file) */}
                    <span className="pip p1" />
                    <span className="pip p2" />
                    <span className="pip p3" />
                    <span className="pip p4" />
                    <span className="pip p5" />
                    <span className="pip p6" />
                    <span className="pip p7" />
                    <span className="pip p8" />
                    <span className="pip p9" />
                  </div>
                </div>

                <div className="hudSpacer" />

                <button className="btn" onClick={revealSelected} disabled={!selected}>
                  Reveal
                </button>
              </div>

              {selected ? (
                <div className="hudRow small">
                  <div className="mini">
                    Selected: <b>{selected.layer}</b>:<b>{selected.row}</b>:<b>{selected.col}</b>
                  </div>
                </div>
              ) : (
                <div className="hudRow small">
                  <div className="mini muted">Select a tile.</div>
                </div>
              )}
            </div>

            <div className="board">
              {/* Render rows with offsets to create a hex layout */}
              {rowsInLayer.map((cols, r) => (
                <div key={r} className="hexRow" style={{ ["--cols" as any]: cols }}>
                  {Array.from({ length: cols }).map((_, c) => {
                    const coord: Coord = { layer: currentLayer, row: r, col: c };
                    const h = getHexByCoord(coord);

                    const isSel =
                      !!selected && selected.layer === coord.layer && selected.row === coord.row && selected.col === coord.col;

                    const reachable = isReachable(coord);

                    // Basic “revealed” / “blocked” hints if your Hex has fields:
                    const revealed = (h as any)?.revealed ?? (h as any)?.isRevealed ?? true;
                    const blocked = (h as any)?.blocked ?? (h as any)?.isBlocked ?? false;

                    return (
                      <button
                        key={`${r}-${c}`}
                        className={[
                          "hex",
                          isSel ? "sel" : "",
                          reachable ? "reach" : "",
                          revealed ? "rev" : "fog",
                          blocked ? "blk" : "",
                        ].join(" ")}
                        onClick={() => onHexClick(coord)}
                        title={`${coord.layer}:${coord.row}:${coord.col}`}
                      >
                        <div className="hexInner">
                          <div className="hexTop">
                            <span className="hexTag">{coord.row},{coord.col}</span>
                          </div>

                          <div className="hexMid">
                            {/* Optional: show a tiny marker for portals/loot/etc */}
                            {(h as any)?.kind ? <span className="hexKind">{String((h as any).kind)}</span> : null}
                          </div>

                          <div className="hexBot">
                            {reachable ? <span className="badge ok">MOVE</span> : isSel ? <span className="badge">SEL</span> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* Right: Sidebar */}
          <aside className="side">
            <div className="panel tight">
              <div className="panelTitleRow">
                <h3 className="panelTitleSm">Actions</h3>
              </div>

              <div className="actionsCol">
                <button className="btn" onClick={() => setSelected(null)} disabled={!selected}>
                  Clear selection
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    if (!game) return;
                    // Example: show same-layer neighbor ids if your engine uses neighborIdsSameLayer
                    if (!selected) return;
                    try {
                      const ids = neighborIdsSameLayer(selected as any);
                      pushLog(`Neighbors: ${Array.isArray(ids) ? ids.join(", ") : String(ids)}`, "info");
                    } catch {
                      pushLog("No neighbor info.", "bad");
                    }
                  }}
                  disabled={!selected}
                >
                  Neighbors
                </button>
              </div>
            </div>

            <div className="panel tight">
              <div className="panelTitleRow">
                <h3 className="panelTitleSm">Log</h3>
              </div>

              <div className="log">
                {log.length === 0 ? (
                  <div className="logEmpty">No events yet.</div>
                ) : (
                  log.map((e) => (
                    <div key={e.n} className={`logRow ${e.kind ?? "info"}`}>
                      <span className="logT">{e.t}</span>
                      <span className="logM">{e.msg}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel tight">
              <div className="panelTitleRow">
                <h3 className="panelTitleSm">Meta</h3>
              </div>

              <div className="kv">
                <div className="kvRow">
                  <span className="k">World</span>
                  <span className="v">{worldOptions.find((w) => w.id === worldId)?.name ?? worldId}</span>
                </div>
                <div className="kvRow">
                  <span className="k">Dice</span>
                  <span className="v">{diceFace}</span>
                </div>
                <div className="kvRow">
                  <span className="k">Reach map</span>
                  <span className="v">{reach ? "on" : "off"}</span>
                </div>
                <div className="kvRow">
                  <span className="k">Tiles</span>
                  <span className="v">{gridCoords.length}</span>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
