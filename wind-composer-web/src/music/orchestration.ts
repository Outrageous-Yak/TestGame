import type { MusicalState } from "./constants";
import type { CompositionPlan } from "../types";
import { getStyle } from "./styleEngine";

export interface OrchestrationTargets {
  layer_gains: Record<string, number>;
  layer_presets: Record<string, string>;
  active_layers: string[];
  reverb_wet: number;
  delay_wet: number;
  width: number;
  warmth: number;
  stereo_pan: number;
  trigger_impact: string | null;
}

const STATE_LAYERS: Record<MusicalState, Record<string, number>> = {
  Stillness: { main_pad: 0.35, atmosphere: 0.15, bell: 0.08 },
  "Gentle Motion": { main_pad: 0.4, secondary_pad: 0.2, lead: 0.15, atmosphere: 0.2 },
  Flow: { main_pad: 0.45, secondary_pad: 0.25, soft_bass: 0.25, arpeggio: 0.2, atmosphere: 0.22 },
  Building: { main_pad: 0.5, secondary_pad: 0.3, soft_bass: 0.35, lead: 0.25, atmosphere: 0.28 },
  Power: { main_pad: 0.55, secondary_pad: 0.35, sub_bass: 0.4, lead: 0.35, atmosphere: 0.3, choir: 0.2 },
  Storm: { main_pad: 0.5, sub_bass: 0.45, noise_atmo: 0.3, percussion: 0.25 },
  Recovery: { main_pad: 0.38, atmosphere: 0.25, lead: 0.12 },
  Sunrise: { main_pad: 0.45, bell: 0.2, lead: 0.25, atmosphere: 0.25 },
  Sunset: { main_pad: 0.42, secondary_pad: 0.28, lead: 0.2, atmosphere: 0.3 },
  Night: { main_pad: 0.35, atmosphere: 0.28, sub_bass: 0.12, lead: 0.1 },
};

const MOOD_BIAS: Record<string, [string, string, string]> = {
  Storm: ["Storm Bed", "Dark Drone Bass", "Electrical Storm"],
  "Light Rain": ["Rain Mist", "Muted Pluck", "Soft Pulse"],
  Snow: ["Snow Dust", "Frozen Glass", "Glass Bell"],
  "Sunny Calm": ["Soft Aurora", "Warm Horizon", "Air Flute"],
  Peaceful: ["Warm Horizon", "Ocean Air", "Distant Signal"],
  "Strong Wind": ["Deep Cloud", "Soft Analog Bass", "Wind Haze"],
};

const SOUNDSCAPE_MAP: Record<string, { warmth: number; width: number }> = {
  "Natural Ambient": { warmth: 0.55, width: 0.35 },
  "Deep Space": { warmth: 0.35, width: 0.55 },
  "Frozen World": { warmth: 0.4, width: 0.4 },
  "Cinematic Storm": { warmth: 0.45, width: 0.45 },
  "Dreaming Earth": { warmth: 0.6, width: 0.4 },
  "Minimal Air": { warmth: 0.5, width: 0.25 },
  "Dark Horizon": { warmth: 0.35, width: 0.5 },
  "Luminous Sky": { warmth: 0.65, width: 0.45 },
};

export class Orchestrator {
  soundscape = "Natural Ambient";
  private prevGains: Record<string, number> = {};

  mapPlan(plan: CompositionPlan): OrchestrationTargets {
    const state = plan.musical_state as MusicalState;
    const stateMap = STATE_LAYERS[state] ?? STATE_LAYERS["Gentle Motion"];
    const energy = plan.energy_curve;
    const layer_gains: Record<string, number> = {};
    const active_layers: string[] = [];

    for (const [layer, base] of Object.entries(stateMap)) {
      let gain = base * (0.65 + energy * 0.5);
      const prev = this.prevGains[layer] ?? gain;
      gain = prev + 0.08 * (gain - prev);
      layer_gains[layer] = gain;
      if (gain > 0.05) active_layers.push(layer);
    }
    this.prevGains = { ...layer_gains };

    const layer_presets: Record<string, string> = {
      main_pad: "Warm Horizon",
      atmosphere: "Wind Haze",
      lead: "Soft Pulse",
      sub_bass: "Sub Foundation",
      soft_bass: "Soft Analog Bass",
      bell: "Glass Bell",
      secondary_pad: "Soft Aurora",
    };

    const moodKey = plan.mood.split("·")[0].trim();
    for (const [key, presets] of Object.entries(MOOD_BIAS)) {
      if (moodKey.includes(key) || plan.mood.includes(key)) {
        if (active_layers.includes("main_pad")) layer_presets.main_pad = presets[0];
        if (active_layers.includes("sub_bass") || active_layers.includes("soft_bass")) {
          layer_presets.sub_bass = presets[1];
        }
        if (active_layers.includes("atmosphere")) layer_presets.atmosphere = presets[2];
        break;
      }
    }

    if (plan.rhythm_mode === "storm_perc") {
      layer_gains.percussion = Math.max(layer_gains.percussion ?? 0, 0.2 + energy * 0.3);
      active_layers.push("percussion");
    }

    const sc = SOUNDSCAPE_MAP[this.soundscape] ?? SOUNDSCAPE_MAP["Natural Ambient"];

    const styleName = plan.musical_style ?? "Ambient";
    const style = getStyle(styleName);
    const danceBoost = style.drumDensity;
    if (plan.dance_effects_enabled && danceBoost > 0.2) {
      layer_gains.main_pad = (layer_gains.main_pad ?? 0.4) * (1 - danceBoost * 0.22);
      layer_gains.percussion = Math.max(
        layer_gains.percussion ?? 0,
        danceBoost * (0.55 + energy * 0.45),
      );
      active_layers.push("percussion");
      layer_gains.soft_bass = Math.max(layer_gains.soft_bass ?? 0, style.bassLayers * (0.35 + energy * 0.45));
      layer_gains.sub_bass = Math.max(layer_gains.sub_bass ?? 0, style.bassLayers * (0.3 + energy * 0.5));
      if (layer_gains.soft_bass > 0.08) active_layers.push("soft_bass");
      if (layer_gains.sub_bass > 0.08) active_layers.push("sub_bass");
      layer_gains.lead = Math.max(layer_gains.lead ?? 0, style.leadActivity * (0.2 + energy * 0.45));
      if (layer_gains.lead > 0.08) active_layers.push("lead");
      plan.reverb_amount = Math.min(plan.reverb_amount, 0.55 - danceBoost * 0.15);
    }
    if (styleName === "Synthwave") {
      layer_presets.lead = "Glass Bell";
      layer_presets.soft_bass = "Soft Analog Bass";
    } else if (styleName.includes("Techno") || styleName === "Trance") {
      layer_presets.lead = "Muted Pluck";
      layer_presets.sub_bass = "Sub Foundation";
    } else if (styleName.includes("House")) {
      layer_presets.soft_bass = "Soft Analog Bass";
      layer_presets.main_pad = "Warm Horizon";
    }

    return {
      layer_gains,
      layer_presets,
      active_layers,
      reverb_wet: plan.reverb_amount,
      delay_wet: 0.08 + energy * 0.15,
      width: sc.width * (0.8 + energy * 0.4),
      warmth: sc.warmth,
      stereo_pan: plan.stereo_pan,
      trigger_impact: plan.rare_event,
    };
  }
}
