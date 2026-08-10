import React, { useMemo } from "react";
import type { WorldEntry } from "../ui/types";
import type { ProgressionSaveV1 } from "../progression";
import {
  isTrackNodePlayable,
  markerFacingForNode,
  resolveMapCurrentTrackKey,
  resolveMapPlayerMarkerNode,
  resolveNodeViewState,
  type CampaignMap,
  type CampaignNode,
  type CampaignNodeViewState,
} from "./index";
import {
  DEFAULT_ANIMATED_SPRITE_ID,
  resolveAnimatedSpriteSheet,
} from "../features/sprite-builder/animatedSpriteSheets";
import "./worldMap.css";

export type CampaignMapViewMode = "player" | "authoring" | "preview";

/** Launch payload includes stable campaign/node IDs for return context. */
export type CampaignLaunchTarget = {
  campaignMapId: string;
  areaId: string;
  nodeId: string;
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
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
};

function pathD(from: CampaignNode, to: CampaignNode): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 + (from.x < to.x ? 4 : -4);
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

function statusLabel(state: CampaignNodeViewState | "AUTHOR" | "INVALID"): string {
  switch (state) {
    case "LOCKED":
      return "Locked";
    case "COMPLETED":
      return "Done";
    case "CURRENT":
      return "Next";
    case "AUTHOR":
      return "Node";
    case "INVALID":
      return "Broken";
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

  const markerNode = useMemo(() => {
    if (mode === "authoring") return null;
    return resolveMapPlayerMarkerNode(progress, worlds, map, {
      bypassLocks: bypassProgressionLocks,
    });
  }, [mode, progress, worlds, map, bypassProgressionLocks]);

  const markerFacing = useMemo(() => {
    if (!markerNode) return "down" as const;
    return markerFacingForNode(markerNode, map);
  }, [markerNode, map]);

  const spriteSheet = useMemo(
    () => resolveAnimatedSpriteSheet(DEFAULT_ANIMATED_SPRITE_ID),
    [],
  );
  const spriteSheetUrl = useMemo(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    const path = spriteSheet.path.replace(/^\//, "");
    return `${base.endsWith("/") ? base : `${base}/`}${path}`;
  }, [spriteSheet.path]);

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

  const handleActivate = (
    node: CampaignNode,
    state: CampaignNodeViewState | "AUTHOR" | "INVALID",
  ) => {
    if (mode === "authoring" || mode === "preview") {
      onSelectNode?.(node.id);
      return;
    }
    if (state === "LOCKED" || state === "INVALID") return;
    if (!isTrackNodePlayable(worlds, node)) return;
    onLaunchTrack?.({
      campaignMapId: map.id,
      areaId: map.areaId,
      nodeId: node.id,
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
          const playable = mode === "authoring" || isTrackNodePlayable(worlds, node);
          let state: CampaignNodeViewState | "AUTHOR" | "INVALID";
          if (mode === "authoring") {
            state = "AUTHOR";
          } else if (!playable) {
            state = "INVALID";
          } else if (!progress) {
            state = "AVAILABLE";
          } else {
            state = resolveNodeViewState(progress, worlds, node, currentKey, {
              bypassLocks: bypassProgressionLocks,
            });
          }

          const interactive =
            mode === "authoring" ||
            mode === "preview" ||
            (state !== "LOCKED" && state !== "INVALID");
          const selected = selectedNodeId === node.id;
          const classState = String(state).toLowerCase();

          return (
            <button
              key={node.id}
              type="button"
              className={`worldMapNode worldMapNode--${classState}${selected ? " worldMapNode--selected" : ""}`}
              style={{ left: `${node.x}%`, top: `${(node.y / maxY) * 100}%` }}
              disabled={!interactive}
              draggable={mode === "authoring" && !!onNodeDragEnd}
              title={
                state === "INVALID"
                  ? `Broken reference: ${node.worldId}/${node.scenarioId}/${node.trackId}`
                  : undefined
              }
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

        {markerNode ? (
          <div
            className={`worldMapPlayerMarker worldMapPlayerMarker--${markerFacing}`}
            style={{
              left: `${markerNode.x}%`,
              top: `${(markerNode.y / maxY) * 100}%`,
              ["--spriteImg" as string]: `url(${JSON.stringify(spriteSheetUrl)})`,
              ["--frameW" as string]: spriteSheet.frameWidth,
              ["--frameH" as string]: spriteSheet.frameHeight,
              ["--cols" as string]: spriteSheet.cols,
              ["--rows" as string]: spriteSheet.rows,
              ["--frameX" as string]: 0,
              ["--frameY" as string]:
                markerFacing === "left" ? 1 : markerFacing === "right" ? 2 : 0,
            }}
            aria-label="Your journey position"
            role="img"
          >
            <span className="worldMapPlayerSprite" aria-hidden="true" />
          </div>
        ) : null}

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
