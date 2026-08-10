import React, { useMemo } from "react";
import type { WorldEntry } from "../ui/types";
import type { ProgressionSaveV1 } from "../progression";
import {
  resolveMapCurrentTrackKey,
  resolveNodeViewState,
  type CampaignMap,
  type CampaignNode,
  type CampaignNodeViewState,
} from "./index";
import "./worldMap.css";

export type CampaignMapViewMode = "player" | "authoring" | "preview";

export type CampaignLaunchTarget = {
  worldId: string;
  scenarioId: string;
  trackId: string;
};

type CampaignMapViewProps = {
  map: CampaignMap;
  worlds: WorldEntry[];
  mode: CampaignMapViewMode;
  progress?: ProgressionSaveV1 | null;
  bypassProgressionLocks?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onLaunchTrack?: (target: CampaignLaunchTarget) => void;
  /** Desktop authoring drag end with normalized coords */
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
};

function pathD(from: CampaignNode, to: CampaignNode): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 + (from.x < to.x ? 4 : -4);
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

function statusLabel(state: CampaignNodeViewState | "AUTHOR"): string {
  switch (state) {
    case "LOCKED":
      return "Locked";
    case "COMPLETED":
      return "Done";
    case "CURRENT":
      return "Next";
    case "AUTHOR":
      return "Node";
    default:
      return "Play";
  }
}

export function CampaignMapView({
  map,
  worlds,
  mode,
  progress = null,
  bypassProgressionLocks = false,
  selectedNodeId = null,
  onSelectNode,
  onLaunchTrack,
  onNodeDragEnd,
}: CampaignMapViewProps) {
  const currentKey = useMemo(() => {
    if (mode === "authoring" || !progress) return null;
    return resolveMapCurrentTrackKey(progress, worlds, map, { bypassLocks: bypassProgressionLocks });
  }, [mode, progress, worlds, map, bypassProgressionLocks]);

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
    () => Math.max(100, ...map.nodes.map((n) => n.y), 0) + 12,
    [map.nodes],
  );

  const handleActivate = (node: CampaignNode, state: CampaignNodeViewState | "AUTHOR") => {
    if (mode === "authoring") {
      onSelectNode?.(node.id);
      return;
    }
    if (mode === "preview") {
      onSelectNode?.(node.id);
      return;
    }
    if (state === "LOCKED") return;
    onLaunchTrack?.({
      worldId: node.worldId,
      scenarioId: node.scenarioId,
      trackId: node.trackId,
    });
  };

  return (
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
          const state: CampaignNodeViewState | "AUTHOR" =
            mode === "authoring" || !progress
              ? "AUTHOR"
              : resolveNodeViewState(progress, worlds, node, currentKey, {
                  bypassLocks: bypassProgressionLocks,
                });
          const interactive =
            mode === "authoring" || mode === "preview" || state !== "LOCKED";
          const selected = selectedNodeId === node.id;
          const classState = mode === "authoring" ? "author" : String(state).toLowerCase();

          return (
            <button
              key={node.id}
              type="button"
              className={`worldMapNode worldMapNode--${classState}${selected ? " worldMapNode--selected" : ""}`}
              style={{ left: `${node.x}%`, top: `${(node.y / maxY) * 100}%` }}
              disabled={!interactive}
              draggable={mode === "authoring" && !!onNodeDragEnd}
              aria-label={`${node.label ?? node.trackId}: ${statusLabel(state)}`}
              onClick={() => handleActivate(node, state)}
              onDragStart={(e) => {
                if (mode !== "authoring" || !onNodeDragEnd) return;
                e.dataTransfer.setData("text/plain", node.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <span className="worldMapNodeDot" />
              <span className="worldMapNodeLabel">{(node.label ?? node.trackId) || "Unset"}</span>
              <span className="worldMapNodeStatus">{statusLabel(state)}</span>
            </button>
          );
        })}

        {mode === "authoring" && onNodeDragEnd ? (
          <div
            className="worldMapDropLayer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (!id) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * maxY;
              onNodeDragEnd(id, x, y);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
