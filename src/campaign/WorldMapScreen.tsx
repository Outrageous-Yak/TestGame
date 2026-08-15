import React, { useEffect, useMemo, useState } from "react";
import type { WorldEntry } from "../ui/types";
import { loadProgression, type ProgressionSaveV1 } from "../progression";
import { resolvePlayableCampaignMap } from "./index";
import { CampaignMapView, type CampaignLaunchTarget } from "./CampaignMapView";
import "./worldMap.css";

export type { CampaignLaunchTarget };

type WorldMapScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  bypassProgressionLocks?: boolean;
  /** Stable CampaignMap.id to reopen after Track return */
  campaignMapId?: string | null;
  /** Bump to force progression reload without full remount */
  progressRefreshKey?: number;
  onBack: () => void;
  onLaunchTrack: (target: CampaignLaunchTarget) => void;
  onBrowseList?: () => void;
};

export function WorldMapScreen({
  themeVars,
  worlds,
  bypassProgressionLocks = false,
  campaignMapId = null,
  progressRefreshKey = 0,
  onBack,
  onLaunchTrack,
  onBrowseList,
}: WorldMapScreenProps) {
  const map = useMemo(
    () => resolvePlayableCampaignMap(campaignMapId ?? undefined),
    [campaignMapId],
  );
  const [progress, setProgress] = useState<ProgressionSaveV1>(() => loadProgression());

  useEffect(() => {
    // Re-read existing progression on mount and whenever returning from a Track.
    setProgress(loadProgression());
  }, [progressRefreshKey, campaignMapId]);

  return (
    <div
      className="appRoot worldMapRoot"
      style={themeVars}
      data-theme={map.theme ?? "grasslands"}
      data-world-id={map.worldId}
    >
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

      <CampaignMapView
        map={map}
        worlds={worlds}
        mode="player"
        progress={progress}
        bypassProgressionLocks={bypassProgressionLocks}
        onLaunchTrack={onLaunchTrack}
      />

      <footer className="worldMapLegend" aria-hidden="true">
        <span className="worldMapLegendItem worldMapLegendItem--available">Available</span>
        <span className="worldMapLegendItem worldMapLegendItem--current">Next</span>
        <span className="worldMapLegendItem worldMapLegendItem--completed">Done</span>
        <span className="worldMapLegendItem worldMapLegendItem--locked">Locked</span>
      </footer>
    </div>
  );
}
