import React from "react";

type StartScreenProps = {
  themeVars: React.CSSProperties;
  worldsCount: number;
  onStart: () => void;
  onCharacters: () => void;
  onReset: () => void;
};

export function StartScreen({ themeVars, worldsCount, onStart, onCharacters, onReset }: StartScreenProps) {
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
        </div>
      </div>
    </div>
  );
}
