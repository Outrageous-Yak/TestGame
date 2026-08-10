import React, { useCallback, useMemo, useState } from "react";
import type { GameState } from "../../../engine/types";
import type { PlannerTrack, Pos } from "../types";
import { LayerBoardGrid } from "../components/LayerBoardGrid";
import {
  activatePlayerLayerMovement,
  cardFeedbackAtPlayer,
  freshLayerPlaytestState,
  isGoalReached,
  layerFromHexId,
  placePlaytestPlayer,
  playtestPassTurn,
  playtestReachableIds,
  playtestTryMove,
  playtestVisibilitySummary,
} from "../simulation/layerPlaytest";

type LayerPlaytestViewProps = {
  track: PlannerTrack;
  selectedLayer: number;
  onSelectLayer: (layer: number) => void;
};

/**
 * Temporary interactive layer harness.
 * Must NEVER call Track Planner authoring mutations / dirty / draft save.
 */
export function LayerPlaytestView({ track, selectedLayer, onSelectLayer }: LayerPlaytestViewProps) {
  const [playState, setPlayState] = useState<GameState | null>(null);
  const [setPlayerMode, setSetPlayerMode] = useState(false);
  const [status, setStatus] = useState<string>("Place a player or tap Reset to start from Start.");
  const [error, setError] = useState<string | null>(null);

  const ensureState = useCallback((): GameState | null => {
    if (playState) return playState;
    try {
      const s = freshLayerPlaytestState(track);
      activatePlayerLayerMovement(s);
      setPlayState(s);
      setError(null);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start playtest");
      return null;
    }
  }, [playState, track]);

  const reset = () => {
    try {
      const s = freshLayerPlaytestState(track);
      activatePlayerLayerMovement(s);
      setPlayState(s);
      setSetPlayerMode(false);
      setError(null);
      const layer = layerFromHexId(s.playerHexId);
      if (layer != null) onSelectLayer(layer);
      setStatus(`Reset. Player at ${s.playerHexId}. Turn ${s.turn}.`);
    } catch (e) {
      setPlayState(null);
      setError(e instanceof Error ? e.message : "Reset failed");
    }
  };

  const pass = () => {
    const s = ensureState();
    if (!s) return;
    playtestPassTurn(s);
    setPlayState({ ...s, rows: s.rows, hexesById: s.hexesById, movementActiveLayers: new Set(s.movementActiveLayers) });
    setStatus(`Passed turn → turn ${s.turn}. Active movement layers: ${[...s.movementActiveLayers].sort().join(",")}`);
  };

  const handleHex = (pos: Pos, hexId: string | null) => {
    const s = ensureState();
    if (!s) return;

    if (setPlayerMode) {
      if (!hexId) {
        setStatus("Cannot place on missing geometry.");
        return;
      }
      placePlaytestPlayer(s, hexId);
      setPlayState({ ...s });
      setSetPlayerMode(false);
      onSelectLayer(pos.layer);
      setStatus(`Placed player at ${hexId} (temporary — Start unchanged).`);
      return;
    }

    if (!hexId) {
      setStatus("Missing hex — blocked.");
      return;
    }

    const neighbors = playtestReachableIds(s);
    if (!neighbors.includes(hexId)) {
      setStatus(`Not adjacent / unreachable: ${hexId}`);
      return;
    }

    const beforeLayer = layerFromHexId(s.playerHexId);
    const result = playtestTryMove(s, hexId);
    setPlayState({ ...result.state });

    const afterLayer = layerFromHexId(result.state.playerHexId);
    if (afterLayer != null && afterLayer !== beforeLayer) {
      onSelectLayer(afterLayer);
      setStatus(
        result.ok && "triggeredTransition" in result && result.triggeredTransition
          ? `Portal → layer ${afterLayer} (${result.state.playerHexId})`
          : `Moved to layer ${afterLayer} (${result.state.playerHexId})`,
      );
    } else if (result.ok) {
      let msg = `Moved to ${result.state.playerHexId}. Turn ${result.state.turn}.`;
      if (isGoalReached(result.state)) msg += " Goal reached (playtest only — no progression write).";
      const card = cardFeedbackAtPlayer(track, result.state);
      if (card.kind !== "none") msg += ` ${card.message}`;
      setStatus(msg);
    } else {
      setStatus(`Move blocked (${result.reason}). Turn ${result.state.turn}.`);
    }
  };

  const reachable = useMemo(() => {
    if (!playState) return new Set<string>();
    return new Set(playtestReachableIds(playState));
  }, [playState]);

  const visibilityLine = playtestVisibilitySummary(track);

  return (
    <div className="tp-playtestView">
      <div className="tp-toolbar tp-playtestToolbar">
        <button type="button" className={`btn${setPlayerMode ? " primary" : ""}`} onClick={() => setSetPlayerMode(true)}>
          Place player
        </button>
        <button type="button" className="btn" onClick={pass}>
          Pass turn
        </button>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
        <select
          className="tp-select"
          value={selectedLayer}
          aria-label="Active playtest layer"
          onChange={(e) => onSelectLayer(Number(e.target.value))}
        >
          {[7, 6, 5, 4, 3, 2, 1].map((l) => (
            <option key={l} value={l}>
              Layer {l}
            </option>
          ))}
        </select>
      </div>

      <p className="tp-hint tp-playtestMeta">
        Active layer <b>{selectedLayer}</b>
        {playState ? ` · Turn ${playState.turn} · Player ${playState.playerHexId}` : " · no state yet"}
        {" · "}
        {visibilityLine}
      </p>
      {setPlayerMode ? <p className="tp-hint">Tap a present hex to place the temporary player.</p> : null}
      {status ? <p className="tp-hint tp-playtestStatus">{status}</p> : null}
      {error ? <p className="tp-hint tp-playtestError">{error}</p> : null}

      <LayerBoardGrid
        track={track}
        layer={selectedLayer}
        playState={playState}
        showPlayer
        reachableIds={reachable}
        onSlotClick={handleHex}
      />
    </div>
  );
}
