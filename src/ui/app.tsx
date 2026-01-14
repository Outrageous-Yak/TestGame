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
const BUILD_TAG = "BUILD_TAG_UI_APP_V1";

/** Dice assets: expects files like `${DICE_FACES_BASE}/1.png` ... `/6.png` */
const DICE_FACES_BASE = "images/ui/dice/faces";

/** How long to hold the cinematic when a 6 is rolled */
const SIX_HOLD_MS = 3000;

/* =========================================================
   Helpers
========================================================= */
function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function faceUrl(n: 1 | 2 | 3 | 4 | 5 | 6) {
  return `${DICE_FACES_BASE}/${n}.png`;
}

/* =========================================================
   Dice Cube (mini-board cube) + Flat Face Overlay
========================================================= */

type CubePose = {
  /** rotation around X axis in degrees */
  rx: number;
  /** rotation around Y axis in degrees */
  ry: number;
};

/**
 * "Default start pose" showing current/above/below faces (best effort):
 * tweak these if your cube should face a specific way.
 */
const DEFAULT_CUBE_POSE: CubePose = { rx: -18, ry: 32 };

function DiceCube(props: {
  size: number;
  glow: boolean;
  pose: CubePose;
  /** URLs for each face (you can swap these to mini-board renders) */
  faces: {
    front: string;
    back: string;
    right: string;
    left: string;
    top: string;
    bottom: string;
  };
}) {
  const { size, faces, glow, pose } = props;
  const half = size / 2;

  const glowStyle: React.CSSProperties = glow
    ? {
        boxShadow:
          "0 0 18px rgba(220,245,255,0.95), 0 0 36px rgba(120,210,255,0.85), 0 0 60px rgba(255,255,255,0.65)",
        filter: "drop-shadow(0 0 10px rgba(160,230,255,0.95)) drop-shadow(0 0 18px rgba(255,255,255,0.75))",
      }
    : {};

  const faceCommon: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: 14,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(10,12,18,0.55)",
  };

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        perspective: 900,
        ...glowStyle,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)`,
          transition: "transform 220ms ease",
        }}
      >
        {/* front */}
        <div style={{ ...faceCommon, transform: `translateZ(${half}px)` }}>
          <img src={faces.front} style={imgStyle} />
        </div>

        {/* back */}
        <div style={{ ...faceCommon, transform: `rotateY(180deg) translateZ(${half}px)` }}>
          <img src={faces.back} style={imgStyle} />
        </div>

        {/* right */}
        <div style={{ ...faceCommon, transform: `rotateY(90deg) translateZ(${half}px)` }}>
          <img src={faces.right} style={imgStyle} />
        </div>

        {/* left */}
        <div style={{ ...faceCommon, transform: `rotateY(-90deg) translateZ(${half}px)` }}>
          <img src={faces.left} style={imgStyle} />
        </div>

        {/* top */}
        <div style={{ ...faceCommon, transform: `rotateX(90deg) translateZ(${half}px)` }}>
          <img src={faces.top} style={imgStyle} />
        </div>

        {/* bottom */}
        <div style={{ ...faceCommon, transform: `rotateX(-90deg) translateZ(${half}px)` }}>
          <img src={faces.bottom} style={imgStyle} />
        </div>
      </div>
    </div>
  );
}

function BigDieFace(props: { size: number; n: 1 | 2 | 3 | 4 | 5 | 6; glow: boolean }) {
  const { size, n, glow } = props;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(10,12,18,0.7)",
        boxShadow: glow
          ? "0 0 22px rgba(220,245,255,0.95), 0 0 46px rgba(120,210,255,0.85), 0 0 80px rgba(255,255,255,0.6)"
          : "0 8px 30px rgba(0,0,0,0.35)",
        filter: glow
          ? "drop-shadow(0 0 14px rgba(160,230,255,0.95)) drop-shadow(0 0 28px rgba(255,255,255,0.7))"
          : undefined,
      }}
    >
      <img src={faceUrl(n)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode>("regular");

  // Game / scenario
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [reach, setReach] = useState<ReachMap | null>(null);

  // Log
  const [log, setLog] = useState<LogEntry[]>([]);
  const logNRef = useRef(1);

  // --- Dice UI state
  const [cubePose, setCubePose] = useState<CubePose>(DEFAULT_CUBE_POSE);

  const [showBigDie, setShowBigDie] = useState(false);
  const [bigDieFace, setBigDieFace] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  const [diceGlow, setDiceGlow] = useState(false);
  const [villainGlow, setVillainGlow] = useState(false);

  // Z-layer fade: 1 => fully dark, 0 => gone
  const [zFade, setZFade] = useState(1);

  // used to cancel an in-flight cinematic if needed
  const sixTimerRef = useRef<number | null>(null);

  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    const n = logNRef.current++;
    setLog((prev) => [{ n, t: nowHHMM(), msg, kind }, ...prev].slice(0, 200));
  }, []);

  /* =========================================================
     Scenario / Game bootstrap (keep aligned with your project)
  ========================================================= */
  const startNewGame = useCallback(() => {
    if (!scenario) return;

    assertScenario(scenario);
    const g = newGame(scenario);
    const r = getReachability(g);

    setGame(g);
    setReach(r);
    setScreen("game");

    // Reset dice UI to the same as game start
    resetDiceToStartPose();
    pushLog(`New game started: ${scenario.name}`, "ok");
  }, [scenario, pushLog]);

  const resetDiceToStartPose = useCallback(() => {
    // Return to cube view, default orientation, default effects
    setShowBigDie(false);
    setBigDieFace(1);
    setDiceGlow(false);
    setVillainGlow(false);
    setZFade(1);
    setCubePose(DEFAULT_CUBE_POSE);
  }, []);

  /* =========================================================
     🎬 Cinematic 6 sequence
     - holds for 3 seconds showing face "6"
     - optional vsVillain effects (glow + z fade)
     - then resets cube orientation to DEFAULT_CUBE_POSE
  ========================================================= */
  const runSixCinematic = useCallback(
    (opts: { vsVillain: boolean }) => {
      // Clear any previous timer
      if (sixTimerRef.current) {
        window.clearTimeout(sixTimerRef.current);
        sixTimerRef.current = null;
      }

      // Start: show big face 6 and pause
      setBigDieFace(6);
      setShowBigDie(true);

      if (opts.vsVillain) {
        setDiceGlow(true);
        setVillainGlow(true);

        // Fade Z-layer out over the same 3 seconds
        // (We do a transition in CSS, but we flip the target opacity here.)
        setZFade(0);
      }

      pushLog(opts.vsVillain ? "Rolled 6 — overwhelming the villain…" : "Rolled 6 — pausing to show the result.", "ok");

      sixTimerRef.current = window.setTimeout(() => {
        // End: return to cube view and reset position/orientation
        setShowBigDie(false);

        // Reset cube orientation so it shows current/above/below as at game start
        setCubePose(DEFAULT_CUBE_POSE);

        // Turn off special effects
        setDiceGlow(false);
        setVillainGlow(false);

        // After cinematic, return Z-layer darkness (if you want it to stay gone permanently, remove this)
        setZFade(1);

        sixTimerRef.current = null;
      }, SIX_HOLD_MS);
    },
    [pushLog]
  );

  /* =========================================================
     Your roll hook: call this whenever a die is rolled
     - If roll === 6: pause and do cinematic.
     - If it's a 6 vs villain: special glow + z fade.
  ========================================================= */
  const onRoll = useCallback(
    (roll: number, ctx: { vsVillain: boolean }) => {
      // You can still log every roll
      pushLog(`Rolled: ${roll}${ctx.vsVillain ? " (vs villain)" : ""}`, "info");

      if (roll === 6) {
        runSixCinematic({ vsVillain: ctx.vsVillain });
      }
    },
    [pushLog, runSixCinematic]
  );

  /* =========================================================
     Example move handler (wire to your board click logic)
  ========================================================= */
  const onClickHex = useCallback(
    (coord: Coord) => {
      if (!game) return;

      const res = tryMove(game, coord as any);
      if (!res.ok) {
        pushLog(res.reason ?? "Move failed", "bad");
        return;
      }

      const g2 = res.state;
      const g3 = endTurn(g2);

      setGame(g3);
      setReach(getReachability(g3));
      pushLog(`Moved to L${coord.layer} R${coord.row} C${coord.col} — turn ended`, "ok");
    },
    [game, pushLog]
  );

  /* =========================================================
     “Villain image” placeholder
     - If you already have a villain sprite in your HUD, just
       apply the villain glow styles to that element instead.
  ========================================================= */
  const villainImgUrl = useMemo(() => {
    // Replace this with your real villain image source
    return "images/ui/villain.png";
  }, []);

  const villainGlowStyle: React.CSSProperties = villainGlow
    ? {
        filter:
          "drop-shadow(0 0 10px rgba(160,230,255,0.95)) drop-shadow(0 0 24px rgba(255,255,255,0.8))",
        boxShadow: "inset 0 0 22px rgba(220,245,255,0.95), inset 0 0 52px rgba(120,210,255,0.8)",
        borderColor: "rgba(220,245,255,0.7)",
      }
    : {};

  /* =========================================================
     Dice faces for cube
     - Replace with your mini-board “current/above/below” renders if you have them
  ========================================================= */
  const cubeFaces = useMemo(() => {
    // best-effort mapping (swap as needed)
    return {
      front: faceUrl(1),
      back: faceUrl(2),
      right: faceUrl(3),
      left: faceUrl(4),
      top: faceUrl(5),
      bottom: faceUrl(6),
    };
  }, []);

  /* =========================================================
     UI
  ========================================================= */
  if (screen === "start") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.h1}>Game</div>
          <div style={styles.p}>Build tag: {BUILD_TAG}</div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={styles.btn} onClick={() => setScreen("select")}>
              Start
            </button>
            <button
              style={styles.btnGhost}
              onClick={() => setMode((m) => (m === "regular" ? "kids" : "regular"))}
            >
              Mode: {mode}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "select") {
    return (
      <div style={styles.page}>
        <div style={styles.cardWide}>
          <div style={styles.h1}>Select Scenario</div>
          <div style={styles.p}>
            This is a placeholder selector. Replace with your real scenario manifest list.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button
              style={styles.btn}
              onClick={() => {
                // Minimal placeholder scenario – replace with your real scenario loader
                const s: Scenario = {
                  id: "demo",
                  name: "Demo Scenario",
                  desc: "Placeholder scenario",
                  // @ts-ignore
                  board: {},
                };
                setScenario(s);
                setScreen("setup");
              }}
            >
              Choose Demo Scenario
            </button>

            <button style={styles.btnGhost} onClick={() => setScreen("start")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div style={styles.page}>
        <div style={styles.cardWide}>
          <div style={styles.h1}>Setup</div>
          <div style={styles.p}>Scenario: {scenario?.name ?? "—"}</div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={styles.btn} onClick={startNewGame} disabled={!scenario}>
              Start Game
            </button>
            <button style={styles.btnGhost} onClick={() => setScreen("select")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div style={styles.pageGame}>
      {/* Top bar */}
      <div style={styles.topRow}>
        {/* Left: log */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Story / Moves</div>
          <div style={styles.log}>
            {log.map((e) => (
              <div key={e.n} style={{ ...styles.logRow, ...(e.kind === "bad" ? styles.bad : e.kind === "ok" ? styles.ok : {}) }}>
                <div style={styles.logMeta}>
                  <span style={{ opacity: 0.85 }}>{e.t}</span>
                  <span style={{ opacity: 0.5 }}>#{e.n}</span>
                </div>
                <div>{e.msg}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Dice + villain */}
        <div style={styles.panelCenter}>
          <div style={styles.panelTitle}>Dice</div>

          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
            {/* Villain */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Villain</div>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(10,12,18,0.55)",
                  ...villainGlowStyle,
                }}
              >
                <img src={villainImgUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>

            {/* Dice */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                {showBigDie ? "Showing roll result" : "Mini-board cube"}
              </div>

              <div style={{ position: "relative" }}>
                {showBigDie ? (
                  <BigDieFace size={140} n={bigDieFace} glow={diceGlow} />
                ) : (
                  <DiceCube size={140} glow={diceGlow} pose={cubePose} faces={cubeFaces} />
                )}
              </div>

              {/* DEMO BUTTONS: Replace with your real roll triggers */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
                <button
                  style={styles.btnSmall}
                  onClick={() => {
                    // Example: roll 6 vs villain
                    onRoll(6, { vsVillain: true });
                  }}
                >
                  Demo: Roll 6 vs Villain
                </button>

                <button
                  style={styles.btnSmallGhost}
                  onClick={() => {
                    // Example: roll 6 not vs villain
                    onRoll(6, { vsVillain: false });
                  }}
                >
                  Demo: Roll 6 (normal)
                </button>

                <button
                  style={styles.btnSmallGhost}
                  onClick={() => {
                    resetDiceToStartPose();
                    pushLog("Dice UI reset to start pose.", "info");
                  }}
                >
                  Reset Dice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: scenario / HUD */}
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Scenario / HUD</div>
          <div style={styles.pSmall}>Scenario: {scenario?.name ?? "—"}</div>
          <div style={styles.pSmall}>Mode: {mode}</div>
          <div style={styles.pSmall}>Z-layer fade: {Math.round((1 - zFade) * 100)}%</div>
        </div>
      </div>

      {/* Board area */}
      <div style={styles.boardArea}>
        <div style={styles.boardCard}>
          <div style={styles.panelTitle}>Main Board (placeholder)</div>

          {/* Z-dark overlay that fades out during cinematic */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.62)",
              opacity: clamp(zFade, 0, 1),
              transition: `opacity ${SIX_HOLD_MS}ms ease`,
              pointerEvents: "none",
              borderRadius: 18,
            }}
          />

          {/* Fake board surface (replace with your real hex board rendering) */}
          <div style={styles.fakeBoard}>
            <div style={{ opacity: 0.8, marginBottom: 10 }}>
              Click a “hex” below to simulate a move.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {Array.from({ length: 18 }).map((_, i) => {
                const row = Math.floor(i / 6);
                const col = i % 6;
                return (
                  <button
                    key={i}
                    style={styles.hexBtn}
                    onClick={() => onClickHex({ layer: 0, row, col })}
                  >
                    R{row}C{col}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Styles
========================================================= */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(900px 500px at 30% 20%, rgba(90,140,255,0.25), transparent), radial-gradient(800px 500px at 70% 40%, rgba(170,90,255,0.18), transparent), #070812",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    color: "white",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  pageGame: {
    minHeight: "100vh",
    background: "radial-gradient(900px 500px at 30% 20%, rgba(90,140,255,0.20), transparent), radial-gradient(800px 500px at 70% 40%, rgba(170,90,255,0.16), transparent), #070812",
    padding: 14,
    color: "white",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  card: {
    width: 520,
    maxWidth: "100%",
    borderRadius: 18,
    background: "rgba(10,12,18,0.65)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    padding: 18,
  },
  cardWide: {
    width: 760,
    maxWidth: "100%",
    borderRadius: 18,
    background: "rgba(10,12,18,0.65)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    padding: 18,
  },
  h1: { fontSize: 22, fontWeight: 800, letterSpacing: 0.2 },
  p: { opacity: 0.82, marginTop: 8, lineHeight: 1.35 },
  pSmall: { opacity: 0.78, marginTop: 8, fontSize: 13, lineHeight: 1.35 },

  btn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(10,12,18,0.35)",
    color: "white",
    fontWeight: 650,
    cursor: "pointer",
  },

  topRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.4fr 1fr",
    gap: 12,
    alignItems: "stretch",
  },
  panel: {
    borderRadius: 18,
    background: "rgba(10,12,18,0.6)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    padding: 12,
    minHeight: 240,
  },
  panelCenter: {
    borderRadius: 18,
    background: "rgba(10,12,18,0.6)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    padding: 12,
    minHeight: 240,
  },
  panelTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 0.2, opacity: 0.9 },

  log: {
    marginTop: 10,
    maxHeight: 190,
    overflow: "auto",
    paddingRight: 6,
  },
  logRow: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 1.25,
  },
  logMeta: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11,
    marginBottom: 6,
  },
  ok: { borderColor: "rgba(120,255,180,0.30)" },
  bad: { borderColor: "rgba(255,120,140,0.32)" },

  btnSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.14)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  btnSmallGhost: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(10,12,18,0.35)",
    color: "white",
    fontWeight: 650,
    cursor: "pointer",
    fontSize: 12,
  },

  boardArea: {
    marginTop: 12,
  },
  boardCard: {
    position: "relative",
    borderRadius: 18,
    background: "rgba(10,12,18,0.6)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
    padding: 12,
    minHeight: 420,
    overflow: "hidden",
  },
  fakeBoard: {
    position: "relative",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 10,
    minHeight: 360,
  },
  hexBtn: {
    borderRadius: 14,
    padding: "14px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
};
