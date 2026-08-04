import React from "react";
import type { StudioTrackRef } from "../studioCatalog";
import { groupCatalogByWorld } from "../studioCatalog";

type TrackBrowserProps = {
  catalog: StudioTrackRef[];
  selectedKey: string | null;
  onSelect: (track: StudioTrackRef) => void;
};

export function TrackBrowser({ catalog, selectedKey, onSelect }: TrackBrowserProps) {
  const groups = groupCatalogByWorld(catalog);

  return (
    <div className="ps-browser">
      <div className="ps-browserTitle">Tracks</div>
      <div className="ps-browserList">
        {groups.map((g) => (
          <div key={g.worldId} className="ps-worldGroup">
            <div className="ps-worldName">{g.worldName}</div>
            {g.tracks.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`ps-trackBtn${selectedKey === t.key ? " selected" : ""}`}
                onClick={() => onSelect(t)}
              >
                {t.trackName}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
