import React, { useEffect, useState } from "react";

/* =========================
   Types
========================= */
type Screen = "start" | "select" | "setup" | "game";

/* =========================
   App (DEFAULT EXPORT)
========================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");

  return (
    <div style={styles.root}>
      {screen === "start" && <Start onNext={() => setScreen("select")} />}
      {screen === "select" && <Select onNext={() => setScreen("setup")} onBack={() => setScreen("start")} />}
      {screen === "setup" && <Setup onNext={() => setScreen("game")} onBack={() => setScreen("select")} />}
      {screen === "game" && <Game onExit={() => setScreen("start")} />}
    </div>
  );
}

/* =========================
   Screens
========================= */

function Start({ onNext }: { onNext: () => void }) {
  return (
    <div style={styles.screen}>
      <h1>Hex Layers</h1>
      <button onClick={onNext}>Start</button>
    </div>
  );
}

function Select({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div style={styles.screen}>
      <h2>Select Player</h2>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Continue</button>
    </div>
  );
}

function Setup({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div style={styles.screen}>
      <h2>Select Game Mode</h2>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Play</button>
    </div>
  );
}

function Game({ onExit }: { onExit: () => void }) {
  return (
    <div style={styles.game}>
      <div style={styles.board}>
        {renderBoard()}
      </div>
      <button onClick={onExit}>Exit</button>
    </div>
  );
}

/* =========================
   Board Rendering
========================= */

function renderBoard() {
  const rows = [7, 6, 7, 6, 7, 6, 7];

  return rows.map((len, r) => (
    <div key={r} style={{ display: "flex", marginLeft: r % 2 ? 40 : 0 }}>
      {Array.from({ length: len }).map((_, c) => (
        <div key={c} style={styles.hex}>
          <div style={styles.hexLabel}>
            <div>R{r + 1}</div>
            <div>C{c + 1}</div>
          </div>
        </div>
      ))}
    </div>
  ));
}

/* =========================
   Styles (inline, safe)
========================= */

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(#d8c7ff, #f6c1da)",
    color: "#111",
    padding: 20,
  },
  screen: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  game: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  board: {
    margin: 20,
  },
  hex: {
    width: 70,
    height: 70,
    margin: 4,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  hexLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#fff",
    textAlign: "center",
    lineHeight: 1.1,
    textShadow:
      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
  },
};
