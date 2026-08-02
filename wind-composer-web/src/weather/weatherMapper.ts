import type { MusicDriveParams, Station, WeatherSnapshot } from "../types";
import { clamp } from "../utils";
import { isStorm } from "./openMeteo";

export class WeatherMapper {
  private lastGustTime = 0;
  gustCooldownSec = 1;

  mapSnapshot(weather: WeatherSnapshot, tempoMin: number, tempoMax: number): MusicDriveParams {
    const speed = weather.wind_speed_kmh;
    const gust = weather.wind_gust_kmh;
    let energy = clamp(speed / 55);
    const now = performance.now() / 1000;
    let isGust = false;
    if (gust - speed > 12 && now - this.lastGustTime >= this.gustCooldownSec) {
      isGust = true;
      this.lastGustTime = now;
    }
    const tempo = tempoMin + energy * (tempoMax - tempoMin);
    const pan = clamp((weather.wind_direction_deg / 180) - 1, -1, 1);
    const reverb = clamp(0.25 + (weather.humidity_pct - 40) / 80);
    const bass = clamp((weather.pressure_hpa - 980) / 60);
    let perc = clamp(weather.precipitation_mm / 8 + weather.snowfall_mm / 5);
    let atmosphere = 0.15 + energy * 0.35;
    if (isStorm(weather)) {
      atmosphere = clamp(atmosphere + 0.35);
      perc = clamp(perc + 0.4);
      energy = clamp(energy + 0.2);
    }
    const warmth = clamp((weather.temperature_c + 10) / 50);
    if (speed < 5 && weather.precipitation_mm < 0.1) {
      energy = clamp(energy * 0.35);
      perc *= 0.2;
    }
    const brightness = clamp(0.3 + (1 - warmth) * 0.5 + energy * 0.2);
    return {
      energy, gust: isGust, tempo_bpm: tempo, stereo_pan: pan,
      reverb_amount: reverb, bass_intensity: bass, percussion: perc,
      atmosphere_layers: atmosphere, brightness, instrument_warmth: warmth,
    };
  }

  blendStations(stations: Station[], tempoMin: number, tempoMax: number): MusicDriveParams | null {
    const enabled = stations.filter((s) => s.enabled && s.weather);
    if (!enabled.length) return null;
    const totalMix = enabled.reduce((a, s) => a + s.mix, 0);
    if (totalMix <= 0) return null;
    const blended: MusicDriveParams = {
      energy: 0, gust: false, tempo_bpm: 0, stereo_pan: 0,
      reverb_amount: 0, bass_intensity: 0, percussion: 0,
      atmosphere_layers: 0, brightness: 0, instrument_warmth: 0,
    };
    let gust = false;
    for (const s of enabled) {
      const w = s.mix / totalMix;
      const p = this.mapSnapshot(s.weather!, tempoMin, tempoMax);
      blended.energy += p.energy * w;
      blended.tempo_bpm += p.tempo_bpm * w;
      blended.stereo_pan += p.stereo_pan * w;
      blended.reverb_amount += p.reverb_amount * w;
      blended.bass_intensity += p.bass_intensity * w;
      blended.percussion += p.percussion * w;
      blended.atmosphere_layers += p.atmosphere_layers * w;
      blended.brightness += p.brightness * w;
      blended.instrument_warmth += p.instrument_warmth * w;
      gust = gust || p.gust;
    }
    blended.gust = gust;
    blended.energy = clamp(blended.energy);
    blended.stereo_pan = clamp(blended.stereo_pan, -1, 1);
    blended.reverb_amount = clamp(blended.reverb_amount);
    blended.percussion = clamp(blended.percussion);
    blended.brightness = clamp(blended.brightness);
    blended.instrument_warmth = clamp(blended.instrument_warmth);
    return blended;
  }

  /** Blend by dominant station — no averaging wind/tempo; max energy/percussion across locations. */
  blendStationsDominant(stations: Station[], tempoMin: number, tempoMax: number): MusicDriveParams | null {
    const enabled = stations.filter((s) => s.enabled && s.weather);
    if (!enabled.length) return null;
    const dominant = enabled.reduce((best, s) => (s.mix > best.mix ? s : best));
    const base = this.mapSnapshot(dominant.weather!, tempoMin, tempoMax);
    let energy = base.energy;
    let percussion = base.percussion;
    let gust = base.gust;
    let atmosphere = base.atmosphere_layers;
    let brightness = base.brightness;

    for (const s of enabled) {
      if (s === dominant) continue;
      const p = this.mapSnapshot(s.weather!, tempoMin, tempoMax);
      const weight = s.mix / Math.max(dominant.mix, 0.01);
      energy = Math.max(energy, p.energy * Math.min(weight, 1));
      percussion = Math.max(percussion, p.percussion * s.mix);
      atmosphere = Math.max(atmosphere, p.atmosphere_layers * s.mix);
      brightness = Math.max(brightness, p.brightness * s.mix);
      gust = gust || p.gust;
    }

    return {
      ...base,
      energy: clamp(energy),
      percussion: clamp(percussion),
      atmosphere_layers: clamp(atmosphere),
      brightness: clamp(brightness),
      gust,
    };
  }
}
