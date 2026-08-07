import React, { useCallback, useState } from "react";
import type { GameState } from "../../../engine/types";
import { tryMove } from "../../../engine/api";
import { passTurn } from "../../../engine/endTurn";
import { neighborIdsSameLayer } from "../../../engine/neighbors";
import type { PlannerTrack, Pos } from "../types";
import { freshPlaytestState } from "../simulation/runSimulator";
import { LayerBoardGrid } from "../components/LayerBoardGrid";

type LayerPlaytestViewProps = {
  track: PlannerTrack;
  selectedLayer: number;
  onSelectLayer: (layer: number) => void;
};

export function LayerPlaytestView({ track, selectedLayer, onSelectLayer }: LayerPlaytestViewProps) {
  const [playState, setPlayState] = useState<GameState | null>(null);
  const [setPlayerMode, setSetPlayerMode] = useState(false);

  const ensureState = useCallback(() => {
    if (!playState) {
      const s = freshPlaytestState(track);
      setPlayState(s);
      return s;
    }
    return playState;
  }, [playState, track]);

  const reset = () => {
    setPlayState(freshPlaytestState(track));
    setSetPlayerMode(false);
  };

  const triggerRowMovement = () => {
    const s = ensureState();
    const next = passTurn(s);
    setPlayState(next);
  };

  const handleHex = (pos: Pos, hexId: string | null) => {
    const s = ensureState();
    if (setPlayerMode && hexId) {
      setPlayState({ ...s, playerHexId: hexId });
      setSetPlayerMode(false);
      onSelectLayer(pos.layer);
      return;
    }
    if (!hexId) return;
    const neighbors = neighborIdsSameLayer(s, s.playerHexId);
    if (!neighbors.includes(hexId)) return;
    const result = tryMove(s, hexId);
    setPlayState(result.state);
    if (result.state.scenario.transitions?.some((t) => t.from.layer !== pos.layer)) {
      onSelectLayer(result.state.playerHexId ? parseInt(result.state.playerHexId[1], 10) : pos.layer);
    }
  };

  return (
    <div className="tp-playtestView">
      <div className="tp-toolbar">
        <button type="button" className="btn" onClick={() => setSetPlayerMode(true)}>
          Set player
        </button>
        <button type="button" className="btn" onClick={triggerRowMovement}>
          Step turn
        </button>
        <button type="button" className="btn" onClick={triggerRowMovement}>
          Trigger row movement
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset layer
        </button>
        <select
          className="tp-select"
          value={selectedLayer}
          onChange={(e) => onSelectLayer(Number(e.target.value))}
        >
          {[7, 6, 5, 4, 3, 2, 1].map((l) => (
            <option key={l} value={l}>
              Layer {l}
            </option>
          ))}
        </select>
      </div>
      {setPlayerMode ? <p className="tp-hint">Tap a hex to place the player.</p> : null}
      <LayerBoardGrid
        track={track}
        layer={selectedLayer}
        playState={playState}
        onSlotClick={handleHex}
      />
    </div>
  );
}
