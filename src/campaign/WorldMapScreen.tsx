import React, { useEffect, useMemo, useState } from "react";
import type { WorldEntry } from "../ui/types";
import {
  loadProgression,
  type ProgressionSaveV1,
} from "../progression";
import {
  getDefaultCampaignMap,
  resolveMapCurrentTrackKey,
  resolveNodeViewState,
  type CampaignMap,
  type CampaignNode,
  type CampaignNodeViewState,
} from "./index";
import "./worldMap.css";

export type CampaignLaunchTarget = {
  worldId: string;
  scenarioId: string;
  trackId: string;
};

type WorldMapScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  bypassProgressionLocks?: boolean;
  onBack: () => void;
  onLaunchTrack: (target: CampaignLaunchTarget) => void;
  onBrowseList?: () => void;
};

function pathD(from: CampaignNode, to: CampaignNode): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 + (from.x < to.x ? 4 : -4);
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

function statusLabel(state: CampaignNodeViewState): string {
  switch (state) {
    case "LOCKED":
      return "Locked";
    case "COMPLETED":
      return "Done";
    case "CURRENT":
      return "Next";
    default:
      return "Play";
  }
}

export function WorldMapScreen({
  themeVars,
  worlds,
  bypassProgressionLocks = false,
  onBack,
  onLaunchTrack,
  onBrowseList,
}: WorldMapScreenProps) {
  const map: CampaignMap = useMemo(() => getDefaultCampaignMap(), []);
  const [progress, setProgress] = useState<ProgressionSaveV1>(() => loadProgression());

  useEffect(() => {
    setProgress(loadProgression());
  }, []);

  const currentKey = useMemo(
    () => resolveMapCurrentTrackKey(progress, worlds, map, { bypassLocks: bypassProgressionLocks }),
    [progress, worlds, map, bypassProgressionLocks],
  );

  const nodeById = useMemo(() => {
    const m = new Map<string, CampaignNode>();
    for (const n of map.nodes) m.set(n.id, n);
    return m;
  }, [map.nodes]);

  const edges = useMemo(() => {
    const list: { from: CampaignNode; to: CampaignNode }[] = [];
    for (const n of map.nodes) {
      for (const cid of n.connections ?? []) {
        const to = nodeById.get(cid);
        if (to) list.push({ from: n, to });
      }
    }
    return list;
  }, [map.nodes, nodeById]);

  const maxY = useMemo(
    () => Math.max(100, ...map.nodes.map((n) => n.y)) + 12,
    [map.nodes],
  );

  const handleNodeActivate = (node: CampaignNode, state: CampaignNodeViewState) => {
    if (state === "LOCKED") return;
    onLaunchTrack({
      worldId: node.worldId,
      scenarioId: node.scenarioId,
      trackId: node.trackId,
    });
  };

  return (
    <div className="appRoot worldMapRoot" style={themeVars} data-theme={map.theme ?? "grasslands"}>
      <header className="worldMapHeader">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <div className="worldMapTitles">
          <div className="worldMapTitle">{map.title}</div>
          {map.subtitle ? <div className="worldMapSubtitle">{map.subtitle}</div> : null}
        </div>
        {onBrowseList ? (
          <button type="button" className="btn worldMapBrowse" onClick={onBrowseList}>
            List
          </button>
        ) : (
          <span className="worldMapHeaderSpacer" />
        )}
      </header>

      <div className="worldMapScroll" role="region" aria-label="Campaign map">
        <div className="worldMapCanvas" style={{ ["--map-height" as string]: `${maxY}%` }}>
          <svg
            className="worldMapPaths"
            viewBox={`0 0 100 ${maxY}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {edges.map(({ from, to }) => (
              <path
                key={`${from.id}-${to.id}`}
                className="worldMapPath"
                d={pathD(from, to)}
                fill="none"
              />
            ))}
          </svg>

          {map.nodes.map((node) => {
            const state = resolveNodeViewState(progress, worlds, node, currentKey, {
              bypassLocks: bypassProgressionLocks,
            });
            const interactive = state !== "LOCKED";
            return (
              <button
                key={node.id}
                type="button"
                className={`worldMapNode worldMapNode--${state.toLowerCase()}`}
                style={{ left: `${node.x}%`, top: `${(node.y / maxY) * 100}%` }}
                disabled={!interactive}
                aria-label={`${node.label ?? node.trackId}: ${statusLabel(state)}`}
                onClick={() => handleNodeActivate(node, state)}
              >
                <span className="worldMapNodeDot" />
                <span className="worldMapNodeLabel">{node.label ?? node.trackId}</span>
                <span className="worldMapNodeStatus">{statusLabel(state)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="worldMapLegend" aria-hidden="true">
        <span className="worldMapLegendItem worldMapLegendItem--available">Available</span>
        <span className="worldMapLegendItem worldMapLegendItem--current">Next</span>
        <span className="worldMapLegendItem worldMapLegendItem--completed">Done</span>
        <span className="worldMapLegendItem worldMapLegendItem--locked">Locked</span>
      </footer>
    </div>
  );
}
