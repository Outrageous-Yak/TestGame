import React from "react";

export type BottomTab =
  | "replay"
  | "analysis"
  | "validation"
  | "metrics"
  | "fitness"
  | "similarity"
  | "engineering"
  | "export";

type BottomTabsProps = {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
};

const TABS: Array<{ id: BottomTab; label: string }> = [
  { id: "replay", label: "Replay" },
  { id: "analysis", label: "Analysis" },
  { id: "validation", label: "Validation" },
  { id: "metrics", label: "Metrics" },
  { id: "fitness", label: "Fitness" },
  { id: "similarity", label: "Similarity" },
  { id: "engineering", label: "Engineering" },
  { id: "export", label: "Export" },
];

export function BottomTabs({ active, onChange }: BottomTabsProps) {
  return (
    <div className="ps-bottomTabs">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`ps-tab${active === t.id ? " active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
