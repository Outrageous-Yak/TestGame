import { MODE_PROFILES, type ModeName, type ScaleName } from "../config";
import type { AppSettings, TickResult } from "../types";
import { StationStore } from "../storage";
import { WeatherMapper } from "../weather/weatherMapper";
import { CompositionEngine, type CompositionContext } from "./compositionEngine";
import { IntelligentComposer } from "./intelligentComposer";
import { Orchestrator } from "./orchestration";
import { ScaleEngine } from "./scaleEngine";

export class MusicSession {
  private scaleEngine = new ScaleEngine();
  private composition = new CompositionEngine(this.scaleEngine);
  private orchestrator = new Orchestrator();
  private weatherMapper = new WeatherMapper();
  private intelligent = new IntelligentComposer();
  private lastWeather: import("../types").WeatherSnapshot | null = null;
  private samplePosition = 0;
  settings: AppSettings;
  stations: StationStore;

  constructor(settings: AppSettings, stations: StationStore) {
    this.settings = settings;
    this.stations = stations;
    this.applyScaleSettings();
    this.orchestrator.soundscape = settings.soundscape_preset;
    this.intelligent.setStyle(settings.musical_style);
  }

  setMusicalStyle(name: string): void {
    this.intelligent.setStyle(name);
  }

  getLiveStatus() {
    return {
      localTime: this.intelligent.getLocalTime(),
      weatherNotice: this.intelligent.getLastNotice(),
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
  }

  tick(micEnergy: number, gust: boolean, sampleDelta: number): TickResult {
    this.samplePosition += sampleDelta;
    const mode = this.settings.mode as ModeName;
    const profile = MODE_PROFILES[mode];
    let energy = micEnergy;
    let g = gust;
    let drive = null;
    const input = this.settings.input_source;

    if (input === "Live Weather" || input === "Both") {
      drive = this.weatherMapper.blendStations(
        this.stations.list(),
        profile.tempoMin,
        profile.tempoMax,
      );
      if (drive) {
        if (input === "Both") {
          energy = drive.energy * 0.55 + micEnergy * 0.45;
          g = drive.gust || gust;
        } else {
          energy = drive.energy;
          g = drive.gust;
        }
      }
    }

    const primary = this.stations.list().find((s) => s.enabled && s.weather);

    const ctx: CompositionContext = {
      raw_energy: energy,
      gust: g,
      tempo_min: profile.tempoMin,
      tempo_max: profile.tempoMax,
      sample_position: this.samplePosition,
      weather: primary?.weather ?? null,
      drive,
      stereo_pan: drive?.stereo_pan ?? 0,
      percussion: drive?.percussion ?? 0,
    };

    const plan = this.composition.tick(ctx);
    if (drive?.tempo_bpm) plan.tempo_bpm = drive.tempo_bpm;

    const w = primary?.weather ?? null;
    if (w && this.lastWeather) this.intelligent.onWeather(this.lastWeather, w);
    if (w) this.lastWeather = w;

    const enhanced = this.intelligent.enhance(
      plan,
      w,
      g,
      this.samplePosition,
      44100,
    );

    const orchestration = this.orchestrator.mapPlan(enhanced);
    const reverb = this.settings.reverb_amount * (0.6 + enhanced.reverb_amount * 0.5);

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
    };
  }
}
