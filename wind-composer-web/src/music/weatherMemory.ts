import type { WeatherSnapshot } from "../types";
import { isStorm } from "../weather/openMeteo";
import { clamp } from "../utils";

export interface WeatherTrend {
  pressure_delta: number;
  wind_delta: number;
  humidity_delta: number;
  storm_likelihood: number;
  calm_trend: boolean;
  accelerating_wind: boolean;
  avg_wind_kmh: number;
  max_gust_kmh: number;
}

export interface WeatherChangeSummary {
  lines: string[];
  musical_hints: string[];
  energy_delta_pct: number;
  tempo_hint_bpm: number;
  fill_prob_delta: number;
}

export class WeatherMemory {
  private history: WeatherSnapshot[] = [];
  private last: WeatherSnapshot | null = null;
  private readonly maxlen: number;

  constructor(maxlen = 20) {
    this.maxlen = maxlen;
  }

  push(snap: WeatherSnapshot): WeatherSnapshot | null {
    const prev = this.last;
    this.history.push(snap);
    if (this.history.length > this.maxlen) this.history.shift();
    this.last = snap;
    return prev;
  }

  trend(): WeatherTrend {
    if (this.history.length < 2) {
      return {
        pressure_delta: 0,
        wind_delta: 0,
        humidity_delta: 0,
        storm_likelihood: 0,
        calm_trend: false,
        accelerating_wind: false,
        avg_wind_kmh: this.last?.wind_speed_kmh ?? 0,
        max_gust_kmh: this.last?.wind_gust_kmh ?? 0,
      };
    }
    const recent = this.history;
    const old = recent[0];
    const newest = recent[recent.length - 1];
    const n = recent.length;
    const windVals = recent.map((s) => s.wind_speed_kmh);
    const avgWind = windVals.reduce((a, b) => a + b, 0) / n;
    const maxGust = Math.max(...recent.map((s) => s.wind_gust_kmh));

    const windDelta = newest.wind_speed_kmh - old.wind_speed_kmh;
    const pressureDelta = newest.pressure_hpa - old.pressure_hpa;
    const humidityDelta = newest.humidity_pct - old.humidity_pct;

    let stormLikelihood = 0;
    if (pressureDelta < -3 && windDelta > 5) {
      stormLikelihood = clamp((-pressureDelta / 10) + windDelta / 30);
    }
    if (isStorm(newest)) stormLikelihood = Math.max(stormLikelihood, 0.7);

    const accelerating = windVals[n - 1] - windVals[Math.max(0, n - 4)] > 8;

    return {
      pressure_delta: pressureDelta,
      wind_delta: windDelta,
      humidity_delta: humidityDelta,
      storm_likelihood: stormLikelihood,
      calm_trend: windDelta < -3 && pressureDelta > 2,
      accelerating_wind: accelerating,
      avg_wind_kmh: avgWind,
      max_gust_kmh: maxGust,
    };
  }

  changeSummary(prev: WeatherSnapshot, newest: WeatherSnapshot): WeatherChangeSummary {
    const lines: string[] = [];
    const hints: string[] = ["New Phrase Generated"];
    let energyDelta = 0;
    let tempoHint = 0;
    let fillDelta = 0;

    if (Math.abs(newest.wind_speed_kmh - prev.wind_speed_kmh) >= 1) {
      lines.push(`Wind ${prev.wind_speed_kmh.toFixed(0)} → ${newest.wind_speed_kmh.toFixed(0)} km/h`);
      energyDelta = (newest.wind_speed_kmh - prev.wind_speed_kmh) / 40;
      tempoHint = newest.wind_speed_kmh - prev.wind_speed_kmh;
    }
    if (Math.abs(newest.humidity_pct - prev.humidity_pct) >= 2) {
      lines.push(`Humidity ${prev.humidity_pct.toFixed(0)} → ${newest.humidity_pct.toFixed(0)}%`);
    }
    if (Math.abs(newest.pressure_hpa - prev.pressure_hpa) >= 1) {
      lines.push(`Pressure ${prev.pressure_hpa.toFixed(0)} → ${newest.pressure_hpa.toFixed(0)} hPa`);
    }

    const trend = this.trend();
    if (trend.storm_likelihood > 0.5) {
      hints.push("Storm increasing");
      fillDelta = 0.12;
    }
    if (trend.accelerating_wind) hints.push("Bass Variation Added");
    if (trend.pressure_delta < -2) hints.push("Tension Building");
    if (energyDelta !== 0) hints.push(`Energy ${energyDelta >= 0 ? "+" : ""}${(energyDelta * 100).toFixed(0)}%`);
    if (tempoHint !== 0) hints.push(`Tempo ${tempoHint > 0 ? "+" : ""}${tempoHint.toFixed(0)} BPM trend`);

    return { lines, musical_hints: hints, energy_delta_pct: energyDelta, tempo_hint_bpm: tempoHint, fill_prob_delta: fillDelta };
  }

  reset(): void {
    this.history = [];
    this.last = null;
  }
}
