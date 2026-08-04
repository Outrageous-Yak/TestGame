import React from "react";

type StartScreenProps = {
  themeVars: React.CSSProperties;
  worldsCount: number;
  devMode: boolean;
  onStart: () => void;
  onCharacters: () => void;
  onPuzzleStudio?: () => void;
  onReset: () => void;
};

export function StartScreen({
  themeVars,
  worldsCount,
  devMode,
  onStart,
  onCharacters,
  onPuzzleStudio,
  onReset,
}: StartScreenProps) {
  return (
    <div className="appRoot" style={themeVars}>
      <div className="screen center">
        <div className="panel">
          <div className="title">Hex Game</div>
          <div className="sub">Start → World → Character → Scenario → Game</div>

          <div className="row">
            <button className="btn primary" onClick={onStart}>
              Start
            </button>
            <button className="btn" onClick={onCharacters}>
              Characters
            </button>
            <button className="btn" onClick={onReset}>
              Reset
            </button>
          </div>

          <div className="hint">
            Worlds loaded: <b>{worldsCount}</b>
          </div>

          {devMode && onPuzzleStudio ? (
            <div className="ps-devMenu">
              <div className="ps-devMenuTitle">Developer</div>
              <button className="btn" onClick={onPuzzleStudio}>
                Puzzle Studio
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
