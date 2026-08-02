import { MODE_PROFILES, type ModeName, type ScaleName } from "../config";
import type { AppSettings, Station, TickResult, WeatherSnapshot } from "../types";
import { clamp } from "../utils";
import { StationStore } from "../storage";
import { WeatherMapper } from "../weather/weatherMapper";
import { CompositionEngine, type CompositionContext } from "./compositionEngine";
import { IntelligentComposer } from "./intelligentComposer";
import { Orchestrator } from "./orchestration";
import { getStyle } from "./styleEngine";
import { ScaleEngine } from "./scaleEngine";
import { WeatherMemory } from "./weatherMemory";

export interface LiveStatus {
  style: string;
  section: string;
  phrase: number;
  chord: string;
  bpm: number;
  key: string;
  energy: number;
  windKmh: number;
  humidity: number;
  pressure: number;
  temperature: number;
  cloud: number;
  rain: number;
  trend: string;
  stormChance: number;
  localTime: string;
  lastWeatherUpdate: string;
  nextUpdateSec: number;
  weatherNotice: string;
  fillProbability: number;
}

export class MusicSession {
  private scaleEngine = new ScaleEngine();
  private composition = new CompositionEngine(this.scaleEngine);
  private orchestrator = new Orchestrator();
  private weatherMapper = new WeatherMapper();
  private weatherMemory = new WeatherMemory(20);
  private intelligent: IntelligentComposer;
  private samplePosition = 0;
  settings: AppSettings;
  stations: StationStore;
  private lastWeatherFetchMs = 0;
  private nextRefreshMs = 0;

  constructor(settings: AppSettings, stations: StationStore) {
    this.settings = settings;
    this.stations = stations;
    this.intelligent = new IntelligentComposer(this.scaleEngine, this.weatherMemory);
    this.applyScaleSettings();
    this.orchestrator.soundscape = settings.soundscape_preset;
    this.intelligent.setStyle(settings.musical_style);
    this.scheduleNextRefresh();
  }

  setMusicalStyle(name: string): void {
    this.intelligent.setStyle(name);
  }

  resetPlayback(): void {
    this.intelligent.resetForPlayback();
  }

  markWeatherFetched(): void {
    this.lastWeatherFetchMs = Date.now();
    this.scheduleNextRefresh();
  }

  scheduleNextRefresh(): void {
    this.nextRefreshMs = this.lastWeatherFetchMs + this.settings.refresh_interval_sec * 1000;
  }

  getNextUpdateSec(): number {
    if (!this.lastWeatherFetchMs) return this.settings.refresh_interval_sec;
    return Math.max(0, Math.ceil((this.nextRefreshMs - Date.now()) / 1000));
  }

  onStationWeatherUpdated(snap: WeatherSnapshot): void {
    const localTime = snap.timestamp
      ? new Date(snap.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
    this.intelligent.onWeatherUpdated(snap, localTime);
    this.markWeatherFetched();
  }

  getLiveStatus(plan?: TickResult["plan"]): LiveStatus {
    const primary = this.dominantStation();
    const w = primary?.weather;
    const trend = this.weatherMemory.trend();
    const trendLabel = trend.storm_likelihood > 0.5
      ? "Storm increasing"
      : trend.accelerating_wind
        ? "Wind accelerating"
        : trend.calm_trend
          ? "Calming"
          : trend.wind_delta > 2
            ? "Building"
            : trend.wind_delta < -2
              ? "Easing"
              : "Stable";

    return {
      style: plan?.musical_style ?? this.settings.musical_style,
      section: plan?.song_section ?? "Flow",
      phrase: plan?.phrase_number ?? 0,
      chord: plan?.chord?.name ?? "—",
      bpm: plan?.tempo_bpm ?? 0,
      key: this.settings.key,
      energy: plan?.energy_curve ?? 0,
      windKmh: w?.wind_speed_kmh ?? 0,
      humidity: w?.humidity_pct ?? 0,
      pressure: w?.pressure_hpa ?? 0,
      temperature: w?.temperature_c ?? 0,
      cloud: w?.cloud_cover_pct ?? 0,
      rain: w?.precipitation_mm ?? 0,
      trend: trendLabel,
      stormChance: trend.storm_likelihood,
      localTime: this.intelligent.getLocalTime() || new Date().toLocaleTimeString(),
      lastWeatherUpdate: this.lastWeatherFetchMs
        ? new Date(this.lastWeatherFetchMs).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "—",
      nextUpdateSec: this.getNextUpdateSec(),
      weatherNotice: this.intelligent.getLastNotice(),
      fillProbability:
        getStyle(this.settings.musical_style).fillProbability +
        this.intelligent.getFillProbabilityBoost(),
    };
  }

  applyScaleSettings(): void {
    this.scaleEngine.setKey(this.settings.key);
    this.scaleEngine.setScale(this.settings.scale as ScaleName);
  }

  updateSettings(s: AppSettings): void {
    this.settings = s;
    this.applyScaleSettings();
    this.orchestrator.soundscape = s.soundscape_preset;
    this.intelligent.setStyle(s.musical_style);
    this.scheduleNextRefresh();
  }

  private dominantStation(): Station | undefined {
    const enabled = this.stations.list().filter((s) => s.enabled && s.weather);
    if (!enabled.length) return undefined;
    return enabled.reduce((best, s) => (s.mix > best.mix ? s : best));
  }

  private dominantWindKmh(stations: Station[]): number {
    const enabled = stations.filter((s) => s.enabled && s.weather);
    if (!enabled.length) return 0;
    const dominant = enabled.reduce((best, s) => (s.mix > best.mix ? s : best));
    const trend = this.weatherMemory.trend();
    return dominant.weather!.wind_speed_kmh + trend.wind_delta * 0.15;
  }

  tick(samplePosition: number, micEnergy: number, gust: boolean, sampleRate = 44100): TickResult {
    this.samplePosition = samplePosition;
    const mode = this.settings.mode as ModeName;
    const profile = MODE_PROFILES[mode];
    const styleProfile = getStyle(this.settings.musical_style);
    let energy = micEnergy;
    let g = gust;
    let drive = null;
    const input = this.settings.input_source;
    const stationList = this.stations.list();

    if (input === "Live Weather" || input === "Both") {
      drive = this.weatherMapper.blendStationsDominant(
        stationList,
        profile.tempoMin,
        profile.tempoMax,
      );
      if (drive) {
        if (input === "Both") {
          energy = clamp(drive.energy * 0.55 + micEnergy * 0.45);
          g = drive.gust || gust;
        } else {
          energy = drive.energy;
          g = drive.gust;
        }
      }
    }

    const primary = this.dominantStation();

    const ctx: CompositionContext = {
      raw_energy: energy,
      gust: g,
      tempo_min: styleProfile.bpmMin,
      tempo_max: styleProfile.bpmMax,
      sample_position: this.samplePosition,
      sample_rate: sampleRate,
      weather: primary?.weather ?? null,
      drive,
      stereo_pan: drive?.stereo_pan ?? 0,
      percussion: drive?.percussion ?? 0,
    };

    const plan = this.composition.tick(ctx);

    const windKmh = primary?.weather
      ? this.dominantWindKmh(stationList)
      : drive
        ? drive.energy * 55
        : micEnergy * 55;

    const enhanced = this.intelligent.enhance(plan, primary?.weather ?? null, {
      gust: g,
      samplePosition: this.samplePosition,
      sampleRate,
      windKmh,
      personalityHope: 0.65 + energy * 0.35,
      danceEffectsEnabled: this.settings.dance_effects_enabled,
    });

    enhanced.dance_effects_enabled = this.settings.dance_effects_enabled;

    const orchestration = this.orchestrator.mapPlan(enhanced);
    const arrGains = this.intelligent.getArrangementLayerGains(enhanced.energy_curve);
    enhanced.arrangement_gains = arrGains;
    for (const [layer, gain] of Object.entries(arrGains)) {
      if (!this.settings.dance_effects_enabled && (layer === "percussion" || layer === "sub_bass")) {
        continue;
      }
      if (gain > (orchestration.layer_gains[layer] ?? 0)) {
        orchestration.layer_gains[layer] = gain;
        if (gain > 0.08 && !orchestration.active_layers.includes(layer)) {
          orchestration.active_layers.push(layer);
        }
      }
    }

    if (!this.settings.dance_effects_enabled) {
      orchestration.layer_gains.percussion = 0;
      orchestration.active_layers = orchestration.active_layers.filter((l) => l !== "percussion");
    }

    let reverb = this.settings.reverb_amount * (0.6 + enhanced.reverb_amount * 0.5);
    if (this.settings.dance_effects_enabled && styleProfile.drumDensity > 0.35) reverb *= 0.68;

    return {
      plan: enhanced,
      orchestration,
      sound_tweaks: {
        reverb,
        width: this.settings.width_amount,
        brightness: this.settings.brightness_amount * enhanced.brightness,
        warmth: this.settings.warmth_amount,
        master: this.settings.master_volume,
      },
      bassPattern: this.settings.dance_effects_enabled ? this.intelligent.getBassPattern() : [],
    };
  }
}
