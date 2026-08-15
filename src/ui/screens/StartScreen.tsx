import React from "react";
import "./StartScreen.css";

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

function MenuIcon({ type }: { type: "start" | "characters" | "track" | "campaign" | "reset" }) {
  const paths = {
    start: <path d="M8 5v14l11-7z" />,
    characters: <><circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M13.5 15c3.5-.7 6.2 1 7 5"/></>,
    track: <><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></>,
    campaign: <><path d="M12 4v5M6 13v-2h12v2M6 13v4M12 9v8M18 13v4"/><rect x="3" y="17" width="6" height="3" rx="1"/><rect x="9" y="17" width="6" height="3" rx="1"/><rect x="15" y="17" width="6" height="3" rx="1"/></>,
    reset: <><path d="M6 7a8 8 0 1 1-1 9"/><path d="M6 3v5H1"/></>,
  };
  return <svg className="startMenuIcon" viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>;
}

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
    <div className="appRoot startScreen" style={themeVars}>
      <div className="screen center startScreenCenter">
        <div className="startMenuPanel">
          <div className="row startMenuButtons">
            <button className="btn primary" onClick={onStart}><MenuIcon type="start" /><span>Start</span></button>
            <button className="btn" onClick={onCharacters}><MenuIcon type="characters" /><span>Characters</span></button>
            {onTrackPlanner ? <button className="btn" onClick={onTrackPlanner}><MenuIcon type="track" /><span>Track Planner</span></button> : null}
            {onCampaignBuilder ? <button className="btn" onClick={onCampaignBuilder}><MenuIcon type="campaign" /><span>Campaign Map Builder</span></button> : null}
            <button className="btn" onClick={onReset}><MenuIcon type="reset" /><span>Reset</span></button>
          </div>

          <div className="startWorldCount">Worlds loaded: <b>{worldsCount}</b></div>

          {devMode && onPuzzleStudio ? (
            <div className="ps-devMenu startDevMenu">
              <div className="ps-devMenuTitle">Developer</div>
              <button className="btn" onClick={onPuzzleStudio}>Puzzle Studio</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
