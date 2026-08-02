import { clamp } from "../utils";
import type { StyleProfile } from "./styleEngine";

export const SONG_SECTIONS = [
  "Intro",
  "Verse",
  "Build",
  "Drop",
  "Break",
  "Recovery",
  "Outro",
  "Flow",
] as const;

export type SongSectionName = typeof SONG_SECTIONS[number];

export interface ArrangementState {
  section: SongSectionName;
  barsInSection: number;
  sectionEnergy: number;
  activeLayers: Set<string>;
}

export class ArrangementEngine {
  private state: ArrangementState = {
    section: "Flow",
    barsInSection: 0,
    sectionEnergy: 0.5,
    activeLayers: new Set(["main_pad", "atmosphere"]),
  };
  private sectionIdx = 0;

  getState(): ArrangementState {
    return this.state;
  }

  /** Call once per bar (measure), not every composition tick. */
  onBar(measure: number, energy: number, storm: boolean): SongSectionName {
    if (measure <= 0) {
      this.state.sectionEnergy = this.sectionEnergy(energy);
      return this.state.section;
    }

    this.state.barsInSection += 1;
    if (this.state.barsInSection >= 32 || (storm && this.state.section !== "Drop")) {
      this.sectionIdx = (this.sectionIdx + 1) % SONG_SECTIONS.length;
      if (storm && Math.random() < 0.55) {
        this.state.section = "Drop";
      } else {
        this.state.section = SONG_SECTIONS[this.sectionIdx];
      }
      this.state.barsInSection = 0;
    }
    this.state.sectionEnergy = this.sectionEnergy(energy);
    this.state.activeLayers = this.layersForSection(this.state.section);
    return this.state.section;
  }

  layerGains(style: StyleProfile, energy: number): Record<string, number> {
    const s = this.state.section;
    const base: Record<string, number> = {
      main_pad: style.padLayers,
      soft_bass: style.bassLayers * energy,
      sub_bass: style.bassLayers * energy * 0.82,
      lead: style.leadLayers * energy,
      atmosphere: style.padLayers * 0.48,
      percussion: style.drumDensity * energy,
    };
    if (s === "Intro") {
      base.lead *= 0.28;
      base.percussion *= 0.18;
    } else if (s === "Verse") {
      base.percussion *= 0.65;
      base.lead *= 0.55;
    } else if (s === "Build") {
      base.percussion *= 1.25;
      base.lead *= 0.68;
    } else if (s === "Drop") {
      base.percussion *= 1.45;
      base.lead *= 1.22;
      base.sub_bass *= 1.35;
    } else if (s === "Break") {
      base.percussion *= 0.12;
      base.lead *= 0.35;
    } else if (s === "Outro") {
      base.percussion *= 0.08;
      base.lead *= 0.18;
    }
    return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, clamp(v)]));
  }

  private sectionEnergy(energy: number): number {
    const s = this.state.section;
    if (s === "Drop") return clamp(energy + 0.28);
    if (s === "Break") return clamp(energy * 0.48);
    if (s === "Build") return clamp(energy + 0.18);
    return clamp(energy);
  }

  private layersForSection(section: SongSectionName): Set<string> {
    const layers = new Set(["main_pad", "atmosphere"]);
    if (["Build", "Drop", "Flow", "Verse"].includes(section)) {
      layers.add("soft_bass");
      layers.add("percussion");
      layers.add("lead");
    }
    if (section === "Drop") layers.add("sub_bass");
    if (section === "Break") {
      layers.clear();
      layers.add("main_pad");
      layers.add("atmosphere");
      layers.add("choir");
    }
    return layers;
  }

  reset(): void {
    this.state = {
      section: "Flow",
      barsInSection: 0,
      sectionEnergy: 0.5,
      activeLayers: new Set(["main_pad", "atmosphere"]),
    };
    this.sectionIdx = 0;
  }
}
