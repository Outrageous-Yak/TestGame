import type { CompositionPlan, RhythmEventDto, WeatherSnapshot } from "../types";
import { getStyle } from "./styleEngine";

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

export class IntelligentComposer {
  private styleName = "Ambient";
  private section = "Flow";
  private barsInSection = 0;
  private beat = 0;
  private localTimeStr = "";
  private lastNotice = "";

  setStyle(name: string): void {
    this.styleName = name;
  }

  getLocalTime(): string {
    return this.localTimeStr;
  }

  getLastNotice(): string {
    return this.lastNotice;
  }

  onWeather(prev: WeatherSnapshot | null, snap: WeatherSnapshot): void {
    if (snap.timestamp) {
      const d = new Date(snap.timestamp);
      this.localTimeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    if (!prev) return;
    const lines: string[] = ["Weather Updated"];
    if (Math.abs(snap.wind_speed_kmh - prev.wind_speed_kmh) >= 1) {
      lines.push(`Wind ${prev.wind_speed_kmh.toFixed(0)} → ${snap.wind_speed_kmh.toFixed(0)} km/h`);
    }
    if (Math.abs(snap.humidity_pct - prev.humidity_pct) >= 2) {
      lines.push(`Humidity ${prev.humidity_pct.toFixed(0)} → ${snap.humidity_pct.toFixed(0)}%`);
    }
    if (Math.abs(snap.pressure_hpa - prev.pressure_hpa) >= 1) {
      lines.push(`Pressure ${prev.pressure_hpa.toFixed(0)} → ${snap.pressure_hpa.toFixed(0)} hPa`);
    }
    lines.push("New Phrase Generated");
    if (snap.wind_speed_kmh > prev.wind_speed_kmh + 5) lines.push("Bass Variation Added");
    this.lastNotice = lines.join("\n");
  }

  enhance(
    plan: CompositionPlan,
    weather: WeatherSnapshot | null,
    gust: boolean,
    samplePosition: number,
    sampleRate: number,
    windProxyKmh?: number,
  ): CompositionPlan {
    const style = getStyle(this.styleName);
    const energy = plan.energy_curve;

    const windKmh = weather
      ? weather.wind_speed_kmh
      : windProxyKmh != null
        ? windProxyKmh
        : energy * 55;
    const windFactor = clamp(windKmh / 55);
    plan.tempo_bpm = clamp(
      style.bpmMin + windFactor * (style.bpmMax - style.bpmMin),
      style.bpmMin,
      style.bpmMax,
    );

    const tempo = plan.tempo_bpm;
    const spb = (60 / Math.max(tempo, 20)) * sampleRate;
    const beat = Math.floor(samplePosition / spb);

    if (weather) {
      if (weather.humidity_pct > 70) plan.reverb_amount = clamp(plan.reverb_amount + 0.1);
      if (weather.precipitation_mm > 0.5) plan.percussion = Math.max(plan.percussion, weather.precipitation_mm / 8);
      if (weather.snowfall_mm > 0.1) plan.brightness *= 0.9;
    }

    plan.musical_style = this.styleName;
    plan.song_section = this.section;
    plan.local_time_str = this.localTimeStr;

    const extra: RhythmEventDto[] = [];
    if (gust && Math.random() < 0.4) {
      extra.push({ layer: "percussion", strength: 0.75, is_pulse: true });
      plan.weather_hints = [...(plan.weather_hints ?? []), "Gust fill"];
    }

    const measure = Math.floor(beat / 4);
    if (measure > 0 && measure % 32 === 0) {
      this.barsInSection += 32;
      const sections = ["Intro", "Build", "Drop", "Breakdown", "Recovery", "Flow"];
      this.section = sections[Math.floor(measure / 32) % sections.length];
      plan.song_section = this.section;
    }

    plan.rhythm_events = extra;
    return plan;
  }
}
