import React from "react";
import startScreenBackground from "../../assets/start-screen-background.jpeg";

type StartScreenProps = {
  themeVars: React.CSSProperties;
  worldsCount: number;
  devMode: boolean;
  onStart: () => void;
  onCharacters: () => void;
  onPuzzleStudio?: () => void;
  onTrackPlanner?: () => void;
  onCampaignBuilder?: () => void;
  onReset: () => void;
};

export function StartScreen({
  themeVars,
  worldsCount,
  devMode,
  onStart,
  onCharacters,
  onPuzzleStudio,
  onTrackPlanner,
  onCampaignBuilder,
  onReset,
}: StartScreenProps) {
  return (
    <div
      className="appRoot startScreen"
      style={{
        ...themeVars,
        backgroundImage: `url(${startScreenBackground})`,
      }}
    >
      <div className="screen center">
        <div className="panel">
          <div className="title">Hex Game</div>
          <div className="sub">Start → World Map → Track → Game</div>

          <div className="row startMenuButtons">
            <button className="btn primary" onClick={onStart}>
              Start
            </button>
            <button className="btn" onClick={onCharacters}>
              Characters
            </button>
            {onTrackPlanner ? (
              <button className="btn" onClick={onTrackPlanner}>
                Track Planner
              </button>
            ) : null}
            {onCampaignBuilder ? (
              <button className="btn" onClick={onCampaignBuilder}>
                Campaign Map Builder
              </button>
            ) : null}
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
