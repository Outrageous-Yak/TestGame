import React from "react";
import type { ReplayStep } from "../../../engine/trackAnalysis";

type ReplayPanelProps = {
  replay: ReplayStep[];
  stepIndex: number;
  playing: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
};

export function ReplayPanel({
  replay,
  stepIndex,
  playing,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onRestart,
  onSpeedChange,
}: ReplayPanelProps) {
  const step = replay[stepIndex];
  const total = replay.length;

  return (
    <div className="ps-panel ps-replayPanel">
      <div className="ps-panelHead">
        <span>Solution Replay</span>
        <span className="ps-muted">
          Move {total === 0 ? 0 : stepIndex + 1} / {total}
        </span>
      </div>

      <div className="ps-replayControls">
        <button type="button" className="btn" onClick={onRestart}>Restart</button>
        <button type="button" className="btn" onClick={onPrev} disabled={stepIndex <= 0}>Previous</button>
        {playing ? (
          <button type="button" className="btn primary" onClick={onPause}>Pause</button>
        ) : (
          <button type="button" className="btn primary" onClick={onPlay}>Play</button>
        )}
        <button type="button" className="btn" onClick={onNext} disabled={stepIndex >= total - 1}>Next</button>
        <label className="ps-speedLabel">
          Speed
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
          >
            <option value={2000}>0.5×</option>
            <option value={1000}>1×</option>
            <option value={500}>2×</option>
            <option value={250}>4×</option>
          </select>
        </label>
      </div>

      {step ? (
        <MoveInspector step={step} />
      ) : (
        <p className="ps-muted">No replay available.</p>
      )}

      <pre className="ps-replayLog">
        {replay.map((s, i) => (
          <div key={i} className={i === stepIndex ? "ps-replayLine active" : "ps-replayLine"}>
            {s.moveNumber}. {s.description}
            {s.rowShiftLayers.length ? ` [shift L${s.rowShiftLayers.join(",")}]` : ""}
            {s.won ? " → Goal" : ""}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function MoveInspector({ step }: { step: ReplayStep }) {
  return (
    <div className="ps-moveInspector">
      <div className="ps-moveTitle">Move {step.moveNumber}</div>
      <div className="ps-moveChain">
        <div>Player at {step.fromHexId}</div>
        <div className="ps-moveArrow">↓</div>
        <div>{step.description}</div>
        {step.portalType ? (
          <>
            <div className="ps-moveArrow">↓</div>
            <div>{step.portalType} portal → {step.portalDestination}</div>
          </>
        ) : null}
        <div className="ps-moveArrow">↓</div>
        <div>End position {step.playerAfter}</div>
        <div className="ps-moveArrow">↓</div>
        <div>Turn {step.turnAfter}</div>
        {step.rowShiftLayers.length > 0 ? (
          <>
            <div className="ps-moveArrow">↓</div>
            <div>Shift layers {step.rowShiftLayers.join(", ")}</div>
          </>
        ) : null}
        {step.won ? <div className="ps-moveGoal">Goal</div> : null}
      </div>
    </div>
  );
}
