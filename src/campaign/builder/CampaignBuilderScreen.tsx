import React, { useCallback, useMemo, useState } from "react";
import type { WorldEntry } from "../../ui/types";
import { loadProgression } from "../../progression";
import {
  addConnection,
  addTrackNode,
  cloneCampaignMap,
  createEmptyCampaignMap,
  deleteCampaignDraft,
  getCampaignMap,
  listCampaignCatalog,
  loadCampaignDraftBundle,
  nudgeNode,
  removeConnection,
  removeNode,
  saveCampaignDraftBundle,
  setNodePosition,
  updateNode,
  upsertCampaignDraft,
  validateCampaignMap,
  type CampaignMap,
  type CampaignValidationIssue,
} from "../index";
import { CampaignMapView } from "../CampaignMapView";
import "./campaignBuilder.css";

type CampaignBuilderScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  onBack: () => void;
};

type BuilderMode = "authoring" | "preview";

function catalogLabel(status: CampaignMap["catalogStatus"]): string {
  switch (status) {
    case "modified_draft":
      return "Modified Draft";
    case "new_draft":
      return "New Draft";
    default:
      return "Production";
  }
}

export function CampaignBuilderScreen({ themeVars, worlds, onBack }: CampaignBuilderScreenProps) {
  const [catalog, setCatalog] = useState(() => listCampaignCatalog());
  const [map, setMap] = useState<CampaignMap | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<BuilderMode>("authoring");
  const [message, setMessage] = useState<string | null>(null);

  const issues: CampaignValidationIssue[] = useMemo(
    () => (map ? validateCampaignMap(map, worlds) : []),
    [map, worlds],
  );

  const selected = map?.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const world = worlds.find((w) => w.id === (map?.worldId ?? ""));
  const scenarios = world?.scenarios ?? [];
  const tracksForScenario =
    scenarios.find((s) => s.id === (selected?.scenarioId ?? map?.areaId))?.tracks ?? [];

  const refreshCatalog = () => setCatalog(listCampaignCatalog());

  const openMap = (id: string) => {
    const catalogItem = listCampaignCatalog().find((m) => m.id === id);
    if (!catalogItem) return;
    // Always clone — never mutate production module object
    const opened = cloneCampaignMap(catalogItem);
    if (opened.catalogStatus === "production") {
      opened.catalogStatus = "modified_draft";
    }
    setMap(opened);
    setSelectedNodeId(null);
    setConnectFromId(null);
    setDirty(false);
    setMode("authoring");
    setMessage(`Opened ${opened.title} (${catalogLabel(catalogItem.catalogStatus)})`);
  };

  const createNew = () => {
    const w0 = worlds.find((w) => w.id === "forgotten_citadel") ?? worlds[0];
    if (!w0) {
      setMessage("No worlds loaded");
      return;
    }
    const s0 = w0.scenarios[0];
    const id = `campaign_${Date.now().toString(36)}`;
    const blank = createEmptyCampaignMap({
      id,
      worldId: w0.id,
      areaId: s0?.id ?? "area",
      title: "New Campaign",
    });
    setMap(blank);
    setSelectedNodeId(null);
    setDirty(true);
    setMessage("New campaign draft (unsaved)");
  };

  const apply = useCallback((next: CampaignMap) => {
    setMap({ ...next, catalogStatus: next.catalogStatus === "new_draft" ? "new_draft" : "modified_draft" });
    setDirty(true);
  }, []);

  const handleSave = () => {
    if (!map) return;
    const errs = validateCampaignMap(map, worlds).filter((i) => i.severity === "error");
    if (errs.length) {
      setMessage(`Fix ${errs.length} error(s) before save`);
      return;
    }
    const bundle = upsertCampaignDraft(loadCampaignDraftBundle(), {
      ...map,
      catalogStatus: map.catalogStatus === "new_draft" ? "new_draft" : "modified_draft",
    });
    saveCampaignDraftBundle(bundle);
    setDirty(false);
    refreshCatalog();
    setMessage("Draft saved (campaign_map_drafts_v1)");
  };

  const handleResetProduction = () => {
    if (!map) return;
    const prod = getCampaignMap(map.id);
    if (!prod) {
      setMessage("No production map to reset to");
      return;
    }
    if (!window.confirm("Discard local draft and reset to production?")) return;
    const bundle = deleteCampaignDraft(loadCampaignDraftBundle(), map.id);
    saveCampaignDraftBundle(bundle);
    setMap({ ...cloneCampaignMap(prod), catalogStatus: "production" });
    setDirty(false);
    refreshCatalog();
    setMessage("Reset to production");
  };

  const handleDeleteDraft = () => {
    if (!map) return;
    if (!window.confirm("Delete local draft for this campaign?")) return;
    const bundle = deleteCampaignDraft(loadCampaignDraftBundle(), map.id);
    saveCampaignDraftBundle(bundle);
    setMap(null);
    setDirty(false);
    refreshCatalog();
    setMessage("Local draft deleted");
  };

  const handleExport = () => {
    if (!map) return;
    const blob = new Blob([JSON.stringify(map, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${map.id}.campaign.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CampaignMap;
      const imported = {
        ...cloneCampaignMap(parsed),
        catalogStatus: "new_draft" as const,
      };
      const errs = validateCampaignMap(imported, worlds).filter((i) => i.severity === "error");
      if (errs.length) {
        setMessage(`Import invalid: ${errs[0].message}`);
        return;
      }
      setMap(imported);
      setDirty(true);
      setMessage("Imported campaign (unsaved draft)");
    } catch {
      setMessage("Import failed — invalid JSON");
    }
  };

  const onNodeClickConnect = (nodeId: string) => {
    if (connectFromId) {
      if (map && connectFromId !== nodeId) {
        apply(addConnection(map, connectFromId, nodeId));
        setMessage(`Connected ${connectFromId} → ${nodeId}`);
      }
      setConnectFromId(null);
      setSelectedNodeId(nodeId);
      return;
    }
    setSelectedNodeId(nodeId);
  };

  if (!map) {
    return (
      <div className="appRoot campaignBuilderRoot" style={themeVars}>
        <header className="campaignBuilderHeader">
          <button type="button" className="btn" onClick={onBack}>
            Back
          </button>
          <div className="campaignBuilderTitle">Campaign Map Builder</div>
          <button type="button" className="btn primary" onClick={createNew}>
            New
          </button>
        </header>
        <div className="campaignBuilderList">
          <p className="campaignBuilderHint">
            Edit presentation/route metadata for player World Maps. Progression unlocks stay in{" "}
            <code>hexgame-progression</code>.
          </p>
          {catalog.map((item) => (
            <button
              key={item.id}
              type="button"
              className="campaignBuilderCard"
              onClick={() => openMap(item.id)}
            >
              <strong>{item.title}</strong>
              <span>
                {item.worldId} · {item.nodes.length} nodes · {catalogLabel(item.catalogStatus)}
              </span>
            </button>
          ))}
          <label className="btn campaignBuilderImport">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
          {message ? <div className="campaignBuilderMsg">{message}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="appRoot campaignBuilderRoot" style={themeVars} data-theme={map.theme ?? "grasslands"}>
      <header className="campaignBuilderHeader">
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (dirty && !window.confirm("Discard unsaved changes?")) return;
            setMap(null);
            setMessage(null);
            refreshCatalog();
          }}
        >
          Maps
        </button>
        <div className="campaignBuilderTitles">
          <input
            className="campaignBuilderNameInput"
            value={map.title}
            onChange={(e) => apply({ ...map, title: e.target.value })}
            aria-label="Campaign title"
          />
          <div className="campaignBuilderMeta">
            {catalogLabel(map.catalogStatus)}
            {dirty ? " · unsaved" : ""}
          </div>
        </div>
        <button type="button" className="btn primary" onClick={handleSave}>
          Save
        </button>
      </header>

      <div className="campaignBuilderToolbar">
        <button
          type="button"
          className={`btn${mode === "authoring" ? " primary" : ""}`}
          onClick={() => setMode("authoring")}
        >
          Author
        </button>
        <button
          type="button"
          className={`btn${mode === "preview" ? " primary" : ""}`}
          onClick={() => setMode("preview")}
        >
          Player preview
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const next = addTrackNode(map);
            apply(next);
            setSelectedNodeId(next.nodes[next.nodes.length - 1]?.id ?? null);
          }}
        >
          + Node
        </button>
        <button
          type="button"
          className={`btn${connectFromId ? " primary" : ""}`}
          onClick={() => {
            if (!selectedNodeId) {
              setMessage("Select a node first, then tap Connect and the target");
              return;
            }
            setConnectFromId(connectFromId ? null : selectedNodeId);
            setMessage(
              connectFromId ? "Connect cancelled" : "Tap another node to connect",
            );
          }}
        >
          {connectFromId ? "Connecting…" : "Connect"}
        </button>
        <button type="button" className="btn" onClick={handleExport}>
          Export
        </button>
        <button type="button" className="btn" onClick={handleResetProduction}>
          Reset
        </button>
        <button type="button" className="btn" onClick={handleDeleteDraft}>
          Delete draft
        </button>
      </div>

      <div className="campaignBuilderBody">
        <div className="campaignBuilderMapPane worldMapRoot">
          <CampaignMapView
            map={map}
            worlds={worlds}
            mode={mode === "preview" ? "preview" : "authoring"}
            progress={mode === "preview" ? loadProgression() : null}
            selectedNodeId={selectedNodeId}
            onSelectNode={onNodeClickConnect}
            onNodeDragEnd={
              mode === "authoring"
                ? (id, x, y) => apply(setNodePosition(map, id, x, y))
                : undefined
            }
          />
        </div>

        <aside className="campaignBuilderInspector">
          <div className="campaignBuilderSection">
            <label>
              World
              <select
                value={map.worldId}
                onChange={(e) => {
                  const wid = e.target.value;
                  const w = worlds.find((x) => x.id === wid);
                  apply({
                    ...map,
                    worldId: wid,
                    areaId: w?.scenarios[0]?.id ?? map.areaId,
                  });
                }}
              >
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area / scenario
              <select
                value={map.areaId}
                onChange={(e) => apply({ ...map, areaId: e.target.value })}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Entry node
              <select
                value={map.entryNodeId ?? ""}
                onChange={(e) =>
                  apply({ ...map, entryNodeId: e.target.value || undefined })
                }
              >
                <option value="">(first node)</option>
                {map.nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label ?? n.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selected ? (
            <div className="campaignBuilderSection">
              <h3>Node</h3>
              <label>
                Label
                <input
                  value={selected.label ?? ""}
                  onChange={(e) => apply(updateNode(map, selected.id, { label: e.target.value }))}
                />
              </label>
              <label>
                Scenario
                <select
                  value={selected.scenarioId}
                  onChange={(e) =>
                    apply(updateNode(map, selected.id, { scenarioId: e.target.value, trackId: "" }))
                  }
                >
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Track
                <select
                  value={selected.trackId}
                  onChange={(e) => {
                    const t = tracksForScenario.find((x) => x.id === e.target.value);
                    apply(
                      updateNode(map, selected.id, {
                        trackId: e.target.value,
                        worldId: map.worldId,
                        label: selected.label || t?.name,
                      }),
                    );
                  }}
                >
                  <option value="">— assign track —</option>
                  {(
                    scenarios.find((s) => s.id === selected.scenarioId)?.tracks ?? []
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </label>
              <div className="campaignBuilderNudge">
                <span>Nudge</span>
                <button type="button" className="btn" onClick={() => apply(nudgeNode(map, selected.id, 0, -4))}>
                  ↑
                </button>
                <button type="button" className="btn" onClick={() => apply(nudgeNode(map, selected.id, -4, 0))}>
                  ←
                </button>
                <button type="button" className="btn" onClick={() => apply(nudgeNode(map, selected.id, 4, 0))}>
                  →
                </button>
                <button type="button" className="btn" onClick={() => apply(nudgeNode(map, selected.id, 0, 4))}>
                  ↓
                </button>
              </div>
              <div className="campaignBuilderConns">
                <div>Connections out:</div>
                {(selected.connections ?? []).length === 0 ? <em>none</em> : null}
                {(selected.connections ?? []).map((cid) => (
                  <div key={cid} className="campaignBuilderConnRow">
                    <span>→ {map.nodes.find((n) => n.id === cid)?.label ?? cid}</span>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => apply(removeConnection(map, selected.id, cid))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  apply(removeNode(map, selected.id));
                  setSelectedNodeId(null);
                }}
              >
                Remove node
              </button>
            </div>
          ) : (
            <div className="campaignBuilderSection">
              <em>Select a node to edit</em>
            </div>
          )}

          <div className="campaignBuilderSection">
            <h3>Validation</h3>
            {issues.length === 0 ? (
              <div className="campaignBuilderOk">No issues</div>
            ) : (
              <ul className="campaignBuilderIssues">
                {issues.map((i, idx) => (
                  <li key={`${i.code}-${idx}`} className={`sev-${i.severity}`}>
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {message ? <div className="campaignBuilderMsgBar">{message}</div> : null}
    </div>
  );
}
