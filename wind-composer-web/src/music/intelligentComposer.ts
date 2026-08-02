import type { CompositionPlan, MelodyNoteDto, RhythmEventDto, WeatherSnapshot } from "../types";
import { clamp } from "../utils";
import { ArrangementEngine } from "./arrangementEngine";
import { BassEngine } from "./bassEngine";
import { FillEngine } from "./fillEngine";
import { LeadEngine } from "./leadEngine";
import { MusicMemory } from "./musicMemory";
import {
  beatMicroDecision,
  gustActionWeights,
  pickGustAction,
} from "./probabilityEngine";
import type { ScaleEngine } from "./scaleEngine";
import { getStyle } from "./styleEngine";
import { TempoEngine, windToTargetBpm } from "./tempoEngine";
import { TransitionEngine } from "./transitionEngine";
import type { WeatherChangeSummary, WeatherMemory } from "./weatherMemory";

export interface EnhanceContext {
  gust: boolean;
  samplePosition: number;
  sampleRate: number;
  windKmh: number;
  personalityHope: number;
}

export class IntelligentComposer {
  private styleName = "Ambient";
  private memory = new MusicMemory();
  private arrangement = new ArrangementEngine();
  private bass: BassEngine;
  private lead: LeadEngine;
  private fills: FillEngine;
  private transitions: TransitionEngine;
  private tempo = new TempoEngine();
  private localTimeStr = "";
  private lastNotice = "";
  private lastChangeSummary: WeatherChangeSummary | null = null;
  private fillProbabilityBoost = 0;
  private phraseNumber = 0;
  private lastBeat = -1;
  private lastMeasure = -1;
  private lastBassPattern: number[] = [];

  constructor(
    private scale: ScaleEngine,
    private weatherMemory: WeatherMemory,
  ) {
    this.bass = new BassEngine(this.memory);
    this.lead = new LeadEngine(this.scale, this.memory);
    this.fills = new FillEngine(this.memory);
    this.transitions = new TransitionEngine(this.memory);
  }

  setStyle(name: string): void {
    this.styleName = name;
    const style = getStyle(name);
    this.tempo.reset((style.bpmMin + style.bpmMax) / 2);
    this.lastBeat = -1;
    this.lastMeasure = -1;
    this.lastBassPattern = [];
  }

  getLocalTime(): string {
    return this.localTimeStr;
  }

  getLastNotice(): string {
    return this.lastNotice;
  }

  getChangeSummary(): WeatherChangeSummary | null {
    return this.lastChangeSummary;
  }

  getFillProbabilityBoost(): number {
    return this.fillProbabilityBoost;
  }

  getBassPattern(): number[] {
    return this.lastBassPattern;
  }

  resetForPlayback(): void {
    this.lastBeat = -1;
    this.lastMeasure = -1;
    this.lastBassPattern = [];
    this.fillProbabilityBoost = 0;
  }

  onWeatherUpdated(snap: WeatherSnapshot, localTimeStr: string): void {
    this.localTimeStr = localTimeStr;
    const prev = this.weatherMemory.push(snap);
    if (!prev) return;
    const summary = this.weatherMemory.changeSummary(prev, snap);
    if (!summary.lines.length) return;
    this.lastChangeSummary = summary;
    this.lastNotice = [...summary.lines, ...summary.musical_hints].join("\n");
    this.fillProbabilityBoost = clamp(this.fillProbabilityBoost + summary.fill_prob_delta, 0, 0.25);
  }

  enhance(plan: CompositionPlan, weather: WeatherSnapshot | null, ctx: EnhanceContext): CompositionPlan {
    const style = getStyle(this.styleName);
    const trend = this.weatherMemory.trend();
    const w = weather;

    const windKmh = w ? trend.avg_wind_kmh + trend.wind_delta * 0.2 : ctx.windKmh;
    const targetBpm = windToTargetBpm(
      windKmh,
      style.bpmMin,
      style.bpmMax,
      trend.wind_delta,
      trend.storm_likelihood,
    );

    const estimateBpm = this.tempo.getBpm();
    const spbEst = (60 / Math.max(estimateBpm, 40)) * ctx.sampleRate;
    const measureEst = Math.floor(Math.floor(ctx.samplePosition / spbEst) / 4);
    plan.tempo_bpm = this.tempo.update(targetBpm, style.bpmMin, style.bpmMax, measureEst, ctx.gust);

    const spb = (60 / Math.max(plan.tempo_bpm, 40)) * ctx.sampleRate;
    const beat = Math.floor(ctx.samplePosition / spb);
    const measure = Math.floor(beat / 4);
    const prevBeat = this.lastBeat;
    const prevMeasure = this.lastMeasure;

    plan.musical_style = this.styleName;
    plan.local_time_str = this.localTimeStr;

    if (measure > prevMeasure) {
      const measureStart = Math.max(1, prevMeasure + 1);
      const measureEnd = Math.min(measure, measureStart + 7);
      for (let m = measureStart; m <= measureEnd; m++) {
        plan.song_section = this.arrangement.onBar(m, plan.energy_curve, trend.storm_likelihood > 0.5);
        if (m > 0 && m % 32 === 0) this.phraseNumber += 1;
      }
    } else {
      plan.song_section = this.arrangement.getState().section;
    }
    plan.phrase_number = this.phraseNumber;

    const extraRhythm: RhythmEventDto[] = [];
    const extraMelody: MelodyNoteDto[] = [];
    const arrState = this.arrangement.getState();

    if (beat > prevBeat) {
      const beatStart = Math.max(0, prevBeat + 1);
      const beatEnd = Math.min(beat, beatStart + 31);
      for (let b = beatStart; b <= beatEnd; b++) {
        const micro = beatMicroDecision(plan.energy_curve);
        if (micro === "hat_ghost") {
          extraRhythm.push({ layer: "hat_ghost", strength: 0.14, is_pulse: false });
        }
        if (ctx.gust && w && b === beat) {
          const gustDelta = w.wind_gust_kmh - w.wind_speed_kmh;
          const weights = gustActionWeights(w.wind_speed_kmh, gustDelta, plan.energy_curve);
          const action = pickGustAction(weights);
          if (action === "fill") extraRhythm.push({ layer: "fill", strength: 0.72, is_pulse: true });
          else if (action === "lead_flourish" && plan.chord) {
            extraMelody.push({
              midi: plan.chord.tones[plan.chord.tones.length - 1],
              velocity: 0.82,
              duration_sec: 0.4,
            });
          } else if (action === "crash") extraRhythm.push({ layer: "crash", strength: 0.88, is_pulse: true });
          else if (action === "reverse_fx") plan.transition_fx = "reverse_crash";
          else if (action === "riser") plan.transition_fx = "noise_riser";
          else if (action === "bass_variation" && plan.chord) {
            extraMelody.push({
              midi: plan.chord.tones[0] - 7,
              velocity: 0.55,
              duration_sec: 0.25,
            });
          }
          plan.weather_hints = [...(plan.weather_hints ?? []), `Gust: ${action}`];
        }
      }
    }

    if (measure > prevMeasure) {
      const measureStart = Math.max(1, prevMeasure + 1);
      const measureEnd = Math.min(measure, measureStart + 7);
      for (let m = measureStart; m <= measureEnd; m++) {
        const tones = plan.chord?.tones ?? [];
        const bassNotes = this.bass.onBar({
          chordTones: tones,
          energy: plan.energy_curve,
          windDirection: w?.wind_direction_deg ?? 0,
          pressureTrend: trend.pressure_delta,
          barInPhrase: m,
          style,
        });
        extraMelody.push(...bassNotes);
        if (bassNotes.length) {
          this.lastBassPattern = bassNotes.map((n) => n.midi);
        }

        const fillProb = style.fillProbability + this.fillProbabilityBoost;
        extraRhythm.push(
          ...this.fills.maybeFill({
            bar: m,
            phraseLength: plan.phrase_length_bars,
            energy: plan.energy_curve,
            stormLikelihood: trend.storm_likelihood,
            fillProbability: fillProb,
          }),
        );
        this.fillProbabilityBoost *= 0.92;

        if (plan.chord?.tones?.length) {
          extraMelody.push(
            ...this.lead.maybeNotes({
              chordTones: plan.chord.tones,
              energy: plan.energy_curve,
              hope: ctx.personalityHope,
              bar: m,
              gust: ctx.gust,
              style,
            }),
          );
        }

        const fx = this.transitions.maybeTransition({
          energy: plan.energy_curve,
          stormLikelihood: trend.storm_likelihood,
          sectionChange: arrState.barsInSection === 0,
          transitionProbability: style.transitionProbability,
          gust: ctx.gust,
        });
        if (fx) {
          plan.transition_fx = fx;
          if (["crash", "impact", "reverse_crash"].includes(fx)) {
            extraRhythm.push({ layer: "crash", strength: 0.78, is_pulse: true });
          }
        }
      }
    }

    this.lastBeat = beat;
    this.lastMeasure = measure;

    if (w) {
      if (w.snowfall_mm > 0.1) plan.brightness = clamp(plan.brightness * 0.9);
      if (w.precipitation_mm > 0.5) plan.percussion = Math.max(plan.percussion, w.precipitation_mm / 8);
      if (w.humidity_pct > 70) plan.reverb_amount = clamp(plan.reverb_amount + 0.1);
      if (w.cloud_cover_pct > 80) plan.reverb_amount = clamp(plan.reverb_amount + 0.06);
      if (w.temperature_c < 5) plan.brightness = clamp(plan.brightness * 0.88);
      if (w.temperature_c > 25) plan.brightness = clamp(plan.brightness + 0.08);
    }

    if (trend.storm_likelihood > 0.4) plan.weather_hints = [...(plan.weather_hints ?? []), "Storm tension"];
    if (trend.calm_trend) plan.weather_hints = [...(plan.weather_hints ?? []), "Calming trend"];
    if (trend.accelerating_wind) plan.weather_hints = [...(plan.weather_hints ?? []), "Wind accelerating"];

    plan.rhythm_events = extraRhythm;
    plan.melody_notes = extraMelody.slice(0, 8);
    plan.bass_notes = extraMelody.filter((n) => n.midi < 52);
    plan.drum_events = extraRhythm;

    return plan;
  }

  getArrangementLayerGains(energy: number): Record<string, number> {
    return this.arrangement.layerGains(getStyle(this.styleName), energy);
  }
}
